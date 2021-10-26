const gets = require('../index.js').createGets();

const n = Number(gets());

for (let i = 0; i < n; i++) {
  const str = gets();
  if (str === undefined) break;
  console.log(str.split(''));
}
