const {generateKeyPair, createECDH, 
	createSign,  createVerify, createPrivateKey, createCipheriv, createDecipheriv, getCurves} = require('crypto');

const crypto = require('crypto');

const x509 = require('@fidm/x509')
const { ASN1 } = require('@fidm/asn1');
const fs = require('fs');

const alice = createECDH('secp384r1');

const aliceKey = alice.generateKeys();

const bob = createECDH('secp384r1');
const bobKey = bob.generateKeys();

const aliceSecret = alice.computeSecret(bobKey);
const bobSecret = bob.computeSecret(aliceKey);

console.log(aliceSecret.toString('hex'));
console.log(bobSecret.toString('hex'));

const data = 'It is my biiiig data';

console.log(crypto.getCiphers());

const cert = new x509.Certificate(ASN1.fromDER(fs.readFileSync('certs/cert.der')));

const privateKey = createPrivateKey(fs.readFileSync('certs/ec_key.pem'));

console.log(privateKey);

console.log(cert.publicKey.toPEM());

const sign = createSign('SHA256');
sign.write(data);
sign.update(data);
sign.end();
const signature = sign.sign(privateKey);

const verify = createVerify('SHA256');
verify.update(data);
verify.update(data);
verify.end();
console.log(verify.verify(cert.publicKey.toPEM(), signature));
