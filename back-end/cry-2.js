const readline = require('readline');
const crypto = require("crypto");
const {ObjectID} = require("mongodb");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
var now = new Date(Date.now());

const time = Date.now() / 1000 | 0
const id = crypto.randomBytes(12);
id.writeUInt32BE(time);
const id2 = crypto.randomBytes(12);
id2.writeUInt32BE(time);

console.log('12'+4);

function xor (a, b) {
  var length = Math.max(a.length, b.length)
  var buffer = Buffer.allocUnsafe(length)

  for (var i = 0; i < length; ++i) {
    buffer[i] = a[i] ^ b[i]
  }

  return buffer
}

const a = new ObjectID(id);
console.log(a);

const b = new ObjectID(id2);
console.log(b);

console.log(a < b);

console.log(xor(Buffer.from(a.toHexString(), 'hex'), Buffer.from(b.toHexString(), 'hex')));
console.log(xor(Buffer.from(b.toHexString(), 'hex'), Buffer.from(a.toHexString(), 'hex')));

const sum = xor(Buffer.from(b.toHexString(), 'hex'), Buffer.from(a.toHexString(), 'hex'));

console.log(xor(id, sum));

const reg = new RegExp('kek', 'iu');

rl.question('Your sequence: ', (answer) => {
	// TODO: Log the answer in a database
	console.log(reg.test(answer));

	rl.close();
});