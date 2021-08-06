# node-gets

# Usage

```js
const gets = require("node-gets")();

// echo each line from stdin
for (let i = 0; i < 10; i++) {
  const str = gets();
  console.log(str);
}
```
