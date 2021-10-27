/**
 * Creates a `gets` function instance with specific configuration.
 *
 * NOTICE: One `gets` instance has one internal buffer each.
 * You should avoid creating multiple `gets` instance for a same file descriptor.
 *
 * @param fd {number} The file descriptor. Defaults to `0` (STDIN).
 * @param bufsize {number} The size of the internal buffer. Defaults to `32768`.
 * @param chunksize {number} The size of the chunk. Defaults to `2048`.
 * @param encoding {string} The encoding. Defaults to `'utf8'`.
 *
 * @return {() => string | undefined} The `gets` function instance. At the end of the stream, it returns `undefined`.
 */
function createGets(
  fd = 0,
  bufsize = 32768,
  chunksize = 2048,
  encoding = "utf8"
) {
  /** where the read bytes are stored. */
  let BUFFER = Buffer.allocUnsafe(_sub2exp(bufsize));
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
   * Read bytes into BUFFER fd (= stdin)
   *
   * @return {number} The end of the valid bytes in BUFFER.
   */
  function _read() {
    // shift BUFFER if needed
    if (OFFSET + chunksize > BUFFER.length && ISTART !== 0) {
      BUFFER.copyWithin(0, ISTART, OFFSET);
      OFFSET = OFFSET - ISTART;
      ISTART = 0;
    }
    // grow BUFFER if needed
    if (OFFSET + chunksize > BUFFER.length) {
      const newbuf = Buffer.allocUnsafe(
        _sub2exp(OFFSET + chunksize, BUFFER.length)
      );
      BUFFER.copy(newbuf, 0, 0, OFFSET);
      BUFFER = newbuf;
    }
    // read bytes synchronously
    const bytes = require("fs").readSync(fd, BUFFER, OFFSET, chunksize);
    return OFFSET + bytes;
  }

  /**
   * Search a `item` in BUFFER from `searchstart` until `searchend`.
   *
   * @return {number} The index of the first found delimiter. If not found, returns `-1`.
   */
  function _find(item, searchstart, searchend) {
    for (let i = searchstart; i < searchend; i++)
      if (BUFFER[i] === item) return i;
    return -1;
  }

  /**
   * Create string from BUFFER
   *
   * @param cutidx {number}
   *   where the delimiter ('\n') is in BUFFER
   * @param bufend {number}
   *   The end of the BUFFER's valid bytes.
   */
  function _string(cutidx, bufend) {
    // unread bytes should be stored in BUFFER
    const line = BUFFER.toString(encoding, ISTART, cutidx + 1);
    ISTART = cutidx + 1;
    OFFSET = bufend;
    return line;
  }

  /**
   * Create string from BUFFER
   */
  function _string0() {
    if (ISTART === OFFSET) return;
    const line = BUFFER.toString(encoding, ISTART, OFFSET);
    ISTART = 0;
    OFFSET = 0;
    return line;
  }

  return function () {
    if (ISTART !== OFFSET) {
      // if OFFSET is not ISTART (unread bytes left)
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
