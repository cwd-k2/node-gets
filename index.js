/**
 * Creates a `gets` function instance with specific configuration.
 *
 * NOTE: Multiple gets instance for a same fd wouldn't properly work.
 *
 * @param fd {number} The file descriptor. Defaults to `0` (STDIN).
 * @param bufsize {number} The size of the internal buffer. Defaults to `32768`.
 * @param chunksize {number} The size of the chunk. Defaults to `2048`.
 * @param encoding {string} The encoding. Defaults to `'utf-8'`.
 *
 * @return {() => string | undefined} The `gets` function instance. At the end of the stream, it returns `undefined`.
 */
function createGets(fd = 0, bufsize = 32768, chunksize = 2048, encoding = "utf-8") {
  /** Be valid. */
  if (bufsize <= 0) bufsize = 32768;
  if (chunksize <= 0) chunksize = 2048;

  let buffer = Buffer.allocUnsafe(_sub2exp(bufsize));
  /** start index of returned string in buffer. */
  let ISTART = 0;
  /** offset index of the buffer. indicates where to append the read bytes. */
  let OFFSET = 0;

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
    if (OFFSET + chunksize > buffer.length && ISTART !== 0) {
      buffer.copyWithin(0, ISTART, OFFSET);
      OFFSET = OFFSET - ISTART;
      ISTART = 0;
    }
    // grow the buffer if needed
    if (OFFSET + chunksize > buffer.length) {
      _resize(OFFSET + chunksize);
    }
    // read bytes synchronously
    const bytes = require("fs").readSync(fd, buffer, OFFSET, chunksize);
    // the end of valid data
    return OFFSET + bytes;
  }

  /** resize the internal buffer. */
  function _resize(atleast) {
    const newbuf = Buffer.allocUnsafe(_sub2exp(atleast, buffer.length));
    buffer.copy(newbuf, 0, 0, OFFSET);
    buffer = newbuf;
  }

  /**
   * Search a `item` in the buffer, from `searchstart` until `searchend`.
   *
   * @return {number} The index of the first found delimiter. If not found, returns `-1`.
   */
  function _find(item, searchstart, searchend) {
    for (let i = searchstart; i < searchend; i++) if (buffer[i] === item) return i;
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
    const line = buffer.toString(encoding, ISTART, cutidx + 1);
    ISTART = cutidx + 1;
    OFFSET = bufend;
    return line;
  }

  /**
   * Create string from the buffer.
   */
  function _string0() {
    if (ISTART === OFFSET) return;
    const line = buffer.toString(encoding, ISTART, OFFSET);
    ISTART = 0;
    OFFSET = 0;
    return line;
  }

  return function () {
    if (ISTART !== OFFSET) {
      // if unread bytes left
      const cutidx = _find(0x0a, ISTART, OFFSET);
      if (cutidx !== -1) return _string(cutidx, OFFSET);
    }

    while (true) {
      const bufend = _read();
      if (bufend === OFFSET) return _string0();
      const cutidx = _find(0x0a, OFFSET, bufend);
      if (cutidx !== -1) return _string(cutidx, bufend);
      OFFSET = bufend;
    }
  };
}

module.exports = {
  createGets,
};
