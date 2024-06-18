/**
 * @type {Map.<number, { buffer: Buffer; istart: number; offset: number }>}
 */
const GETS_INFO_MAP = new Map();

/**
 * Creates a `gets` function instance for `fd` with specific configuration.
 *
 * @param fd {number} The file descriptor. Defaults to `0` (STDIN).
 * @param bufsize {number} The size of the internal buffer. Defaults to `32768`. If a buffer is already allocated, this option will be ignored.
 * @param chunksize {number} The size of the chunk. Defaults to `2048`.
 * @param encoding {string} The encoding. Defaults to `'utf-8'`.
 *
 * @return {() => string | undefined} The `gets` function instance. At the end of the stream, it returns `undefined`.
 */
function createGets(
  fd = 0,
  bufsize = 32768,
  chunksize = 2048,
  encoding = "utf-8",
) {
  /** Be valid. */
  if (bufsize <= 0) bufsize = 32768;
  if (chunksize <= 0) chunksize = 2048;

  if (GETS_INFO_MAP.get(fd) === undefined) {
    const G = {
      /** a buffer */
      buffer: Buffer.allocUnsafe(_sub2exp(bufsize)),
      /** start index of returned string in buffer. */
      istart: 0,
      /** offset index of the buffer. indicates where to append the read bytes. */
      offset: 0,
    };

    GETS_INFO_MAP.set(fd, G);
  }

  const G = GETS_INFO_MAP.get(fd);

  /** The smallest 2^n * j (>= i). */
  function _sub2exp(i, j = 1) {
    while (j < i) j <<= 1;
    return j;
  }

  /**
   * Read bytes into the buffer
   *
   * @return {number} The last valid bytes in BUFFER.
   */
  function _read() {
    // shift the buffer if needed
    if (G.offset + chunksize > G.buffer.length && G.istart !== 0) {
      G.buffer.copyWithin(0, G.istart, G.offset);
      G.offset = G.offset - G.istart;
      G.istart = 0;
    }
    // grow the buffer if needed
    if (G.offset + chunksize > G.buffer.length) {
      _resize(G.offset + chunksize);
    }
    // read bytes synchronously
    const bytes = require("fs").readSync(fd, G.buffer, G.offset, chunksize);
    // the end of valid data
    return G.offset + bytes;
  }

  /** resize the internal buffer. */
  function _resize(atleast) {
    const newbuf = Buffer.allocUnsafe(_sub2exp(atleast, G.buffer.length));
    G.buffer.copy(newbuf, 0, 0, G.offset);
    G.buffer = newbuf;
  }

  /**
   * Search a `item` in the buffer, from `searchstart` until `searchend`.
   *
   * @return {number} The index of the first found delimiter. If not found, returns `-1`.
   */
  function _find(item, searchstart, searchend) {
    for (let i = searchstart; i < searchend; i++)
      if (G.buffer[i] === item) return i;
    return -1;
  }

  /**
   * Create string from the buffer.
   *
   * @param cutidx {number}
   *   where the delimiter ('\n') is in the buffer.
   * @param bufend {number}
   *   The last valid byte in the buffer.
   */
  function _string(cutidx, bufend) {
    // unread bytes should be stored in the buffer
    const line = G.buffer.toString(encoding, G.istart, cutidx + 1);
    G.istart = cutidx + 1;
    G.offset = bufend;
    return line;
  }

  /**
   * Create string from the buffer.
   */
  function _string0() {
    if (G.istart === G.offset) return;
    const line = G.buffer.toString(encoding, G.istart, G.offset);
    G.istart = 0;
    G.offset = 0;
    return line;
  }

  return function () {
    if (G.istart !== G.offset) {
      // if unread bytes left
      const cutidx = _find(0x0a, G.istart, G.offset);
      if (cutidx !== -1) return _string(cutidx, G.offset);
    }

    while (true) {
      const bufend = _read(G);
      if (bufend === G.offset) return _string0();
      const cutidx = _find(0x0a, G.offset, bufend);
      if (cutidx !== -1) return _string(cutidx, bufend);
      G.offset = bufend;
    }
  };
}

module.exports = {
  createGets,
};
