/**
 * Creates a `gets` function instance with specific configuration.
 * You can also use default `gets` function.
 * @param fd {number} The file descriptor. Defaults to `0` (STDIN).
 * @param bufsize {number} The size of the buffer. Defaults to `8192`.
 * @param chunksize {number} The size of the chunk. Defaults to `512`.
 * @param encoding {string} The encoding. Defaults to `'utf8'`.
 */
function createGets(fd = 0, bufsize = 8192, chunksize = 512, encoding = 'utf8') {
  /**
   * TODO:
   * - Avoid too many `Buffer#copy`. It may cause performance issues.
   */

  /** where the read bytes are stored. */
  let BUFFER = Buffer.allocUnsafe(_sub2exp(bufsize));
  /** offset index of the buffer. indicates where to append the read bytes. */
  let OFFSET = 0;

  /** bytes are read into _chunk, then appended to BUFFER. */
  const _chunk = Buffer.allocUnsafe(_sub2exp(chunksize));

  /**
   * The smallest 2^n * j (>= i).
   * @param i {number} A target value.
   * @param j {number} A seed value (Default: 1).
   */
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
   * read bytes into _chunk from BUFFER or fd (=stdin)
   * @return {number} bytes read into _chunk
   */
  function _read(fromfd = true) {
    if (fromfd) {
      // grow BUFFER if needed
      if (OFFSET + _chunk.length > BUFFER.length) _grow(OFFSET + _chunk.length);
      const bytes = require('fs').readSync(fd, _chunk);
      if (bytes) _chunk.copy(BUFFER, OFFSET, 0, bytes);
      return bytes;
    } else {
      BUFFER.copy(_chunk, 0, 0, OFFSET);
      return OFFSET;
    }
  }

  /**
   * create string from _chunk and BUFFER
   * @param index {number}
   *   where the delimiter ('\n') is in _chunk
   * @param bytes {number}
   *   bytes that _chunk holds
   */
  function _string(index, bytes, offset = OFFSET) {
    const line = BUFFER.toString(encoding, 0, offset + index + 1);
    // unread bytes should be stored in BUFFER
    _chunk.copy(BUFFER, 0, index + 1, bytes);
    OFFSET = bytes - (index + 1);
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
      const bytes = _read(false);
      const index = _chunk.indexOf('\n');
      if (index !== -1) return _string(index, bytes, 0);
    }

    while (true) {
      const bytes = _read();
      if (!bytes) return _string0();
      const index = _chunk.indexOf('\n');
      if (index !== -1) return _string(index, bytes);
      OFFSET += bytes;
    }
  });
}

module.exports = {
  createGets,
  /**
   * A function that reads a line from stdin.
   * @return {string} The line read from stdin.
   */
  gets: createGets(),
};
