/**
 * Creates a `gets` function instance with specific configuration.
 * You can also use default `gets` function.
 *
 * NOTICE: One `gets` instance has one internal buffer each.
 * You should avoid creating multiple `gets` instance for a same file descriptor.
 *
 * @param fd {number} The file descriptor. Defaults to `0` (STDIN).
 * @param bufsize {number} The size of the internal buffer. Defaults to `8192`.
 * @param chunksize {number} The size of the chunk. Defaults to `512`.
 * @param encoding {string} The encoding. Defaults to `'utf8'`.
 */
function createGets(fd = 0, bufsize = 8192, chunksize = 512, encoding = 'utf8') {
  /** where the read bytes are stored. */
  let BUFFER = Buffer.allocUnsafe(_sub2exp(bufsize));
  /** offset index of the buffer. indicates where to append the read bytes. */
  let OFFSET = 0;

  /** A smallest 2^n * j (>= i). */
  function _sub2exp(i, j = 1) {
    while (j < i) j <<= 1;
    return j;
  }

  function _grow(size) {
    const newbuf = Buffer.allocUnsafe(_sub2exp(size, BUFFER.length));
    BUFFER.copy(newbuf, 0, 0, OFFSET);
    BUFFER = newbuf;
  }

  /**
   * Read bytes into BUFFER fd (= stdin)
   *
   * @return {number} The end of the BUFFER's valid bytes.
   */
  function _read() {
    // grow BUFFER if needed
    if (OFFSET + chunksize > BUFFER.length) _grow(OFFSET + chunksize);
    const bytes = require('fs').readSync(fd, BUFFER, OFFSET, chunksize);
    return OFFSET + bytes;
  }

  /**
   * Search a `item` in BUFFER from `searchstart` until `searchend`.
   *
   * @return {number} The index of the first found delimiter. If not found, returns `-1`.
   */
  function _find(item, searchstart, searchend) {
    for (let i = searchstart; i < searchend; i++) if (BUFFER[i] === item) return i;
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
    const line = BUFFER.toString(encoding, 0, cutidx + 1);
    // unread bytes should be stored in BUFFER
    BUFFER.copyWithin(0, cutidx + 1, bufend);
    OFFSET = bufend - (cutidx + 1);
    return line;
  }

  /**
   * create string from BUFFER
   * TODO: if there's no byte left, should it return `undefined`?
   */
  function _string0() {
    const line = BUFFER.toString(encoding, 0, OFFSET);
    OFFSET = 0;
    return line;
  }

  return (() => {
    if (OFFSET) { // if OFFSET is not zero -> unread bytes left
      const cutidx = _find(0x0A, 0, OFFSET);
      if (cutidx !== -1) return _string(cutidx, OFFSET);
    }

    while (true) {
      const bufend = _read();
      if (bufend === OFFSET) return _string0();
      const cutidx = _find(0x0A, OFFSET, bufend);
      if (cutidx !== -1) return _string(cutidx, bufend);
      OFFSET = bufend;
    }
  });
}

module.exports = {
  createGets,
  /**
   * A function that reads a line from stdin.
   *
   * @return {string} The line read from stdin.
   */
  gets: createGets(),
};
