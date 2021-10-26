# node-gets

## Installation

```
$ npm install --save git+https://github.com/cwd-k2/node-gets.git
```

## Usage

```js
const gets = require("node-gets").createGets();

// echo each line from stdin
for (let i = 0; i < 10; i++) {
  const str = gets();
  console.log(str);
}
```

## Performance Tips

If you have to treat a big amount of input, you can configure the buffer size and chunk size to be big enough.

```js
// For the sake of a big input
// Second argument: buffer size
// Third argument:  chunk size
const gets = require("node-gets").createGets(0, 65536, 8192);
//...
```
