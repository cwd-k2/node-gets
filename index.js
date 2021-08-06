function createGets(fd = 0, bufsize = 8192, chunksize = 512, encoding = 'utf8') {
  /**
   * TODO:
   * - Avoid too many `Buffer#copy`. It may cause performance issues.
   */

  /**
   * where the read bytes are stored
   */
  let BUFFER = Buffer.alloc(_sub2exp(bufsize));
  let OFFSET = 0;

  /**
   * bytes are read into _chunk, then appended to BUFFER
   */
  const _chunk = Buffer.alloc(_sub2exp(chunksize));

  /**
   * @param i {number}
   * @param j {number}
   * @return {number} the smallest exponent of 2 bigger than i
   */
  function _sub2exp(i, j = 1) {
    while (j < i) j <<= 1;
    return j;
  }

  function _grow(size) {
    const newbuf = Buffer.alloc(_sub2exp(size, BUFFER.length));
    BUFFER.copy(newbuf, 0, 0, OFFSET);
    BUFFER = newbuf;
  }

  /**
   * read bytes into _chunk from BUFFER or fd(=stdin)
   * @return {number} bytes read into _chunk
   */
  function _read(fromfd = true) {
    _chunk.fill(0);
    if (fromfd) {
      // grow BUFFER if needed
      if (OFFSET + _chunk.length > BUFFER.length) _grow(OFFSET + _chunk.length);
      const bytes = require('fs').readSync(fd, _chunk);
      if (bytes) _chunk.copy(BUFFER, OFFSET, 0, bytes);
      return bytes;
    } else {
      const bytes = BUFFER.indexOf(0);
      BUFFER.copy(_chunk, 0, 0, bytes);
      return bytes;
    }
  }

  /**
   * create string from _chunk and BUFFER
   * @param index
   *   where the delimiter ('\n') is in _chunk
   * @param bytes
   *   bytes that _chunk holds
   */
  function _string(index, bytes, offset = OFFSET) {
    const line = BUFFER.toString(encoding, 0, offset + index + 1);
    BUFFER.fill(0, 0, OFFSET + bytes);
    // unread bytes should be stored in BUFFER
    _chunk.copy(BUFFER, 0, index + 1, bytes);
    OFFSET = bytes - (index + 1);
    return line;
  }

  /**
   * create string from BUFFER
   */
  function _string0() {
    const line = BUFFER.toString(encoding, 0, OFFSET);
    BUFFER.fill(0, 0, OFFSET);
    OFFSET = 0;
    return line;
  }

  return (() => {
    if (BUFFER[0]) { // if unread bytes left
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
   * @return {String} The line read from stdin.
   */
  gets: createGets(),
};
