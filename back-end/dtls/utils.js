'use strict';

const assert = require('assert');
const crypto = require('crypto');
const {
  sessionType,
  signatureScheme,
  certificateType,
} = require('./constants');
const {
  encode,
  createEncode,
  types: { uint16be, buffer },
} = require('binary-data');

const { RSA_PKCS1_PADDING } = crypto.constants;

/**
 * Check if argument is client type session.
 * @param {AbstractSession} session
 */
function assertClient(session) {
  assert((session.sessionType = sessionType.CLIENT));
}

/**
 * Check if argument is server type session.
 * @param {AbstractSession} session
 */
function assertServer(session) {
  assert((session.sessionType = sessionType.SERVER));
}

/**
 * Create unix time from now.
 * @returns {number}
 */
function unixtime() {
  return parseInt(Date.now() / 1e3, 10);
}

/**
 * @param {Buffer} random
 * @param {Function} [done]
 */
function createRandom(random, done) {
  random.writeUInt32BE(unixtime(), 0);
  crypto.randomFill(random, 4, done);
}

/**
 * @param {number} version
 * @param {Function} [done]
 */
function createPreMasterSecret(version, done) {
  const premaster = Buffer.allocUnsafe(48);

  premaster.writeUInt16BE(version, 0);
  crypto.randomFill(premaster, 2, done);
}

/**
 * Create premaster secret for PSK key exchange.
 * @param {Buffer} psk Secret part of psk key exchange.
 * @param {Buffer} [otherSecret]
 * @returns {Buffer}
 */
function createPSKPreMasterSecret(psk, otherSecret) {
  const premaster = createEncode();

  if (Buffer.isBuffer(otherSecret)) {
    encode(otherSecret, buffer(uint16be), premaster);
  } else {
    const zeros = Buffer.alloc(psk.length, 0);
    encode(zeros, buffer(uint16be), premaster);
  }

  encode(psk, buffer(uint16be), premaster);

  return premaster.slice();
}

/**
 * @param {Buffer} clientRandom
 * @param {Buffer} serverRandom
 * @param {Buffer} premaster
 * @param {Object} cipher
 * @returns {Buffer}
 */
function createMasterSecret(clientRandom, serverRandom, premaster, cipher) {
  const seed = Buffer.concat([clientRandom, serverRandom]);

  const label = 'master secret';
  const masterSecret = cipher.prf(48, premaster, label, seed);

  return masterSecret;
}

/**
 * @param {Buffer} premaster
 * @param {Buffer} handshakes List of all handshake messages.
 * @param {Object} cipher
 * @returns {Buffer}
 */
function createExtendedMasterSecret(premaster, handshakes, cipher) {
  const sessionHash = hash(cipher.hash, handshakes);
  const label = 'extended master secret';
  const masterSecret = cipher.prf(48, premaster, label, sessionHash);

  return masterSecret;
}

/**
 * @param {Buffer} publicKey
 * @param {Buffer} premaster
 * @returns {Buffer}
 */
function encryptPreMasterSecret(publicKey, premaster) {
  const encrypted = crypto.publicEncrypt(
    { key: publicKey, padding: RSA_PKCS1_PADDING },
    premaster
  );

  return encrypted;
}

/**
 * Create `Finished` message.
 * @param {cipher} cipher
 * @param {Buffer} master Master secret.
 * @param {Buffer} handshakes List of all handshake messages.
 * @param {string} label
 * @returns {Buffer}
 */
function createFinished(cipher, master, handshakes, label) {
  const bytes = hash(cipher.hash, handshakes);
  const final = cipher.prf(cipher.verifyDataLength, master, label, bytes);

  return final;
}

/**
 * @param {string} algorithm Hash algorithm.
 * @param {Buffer} data Data to encrypt.
 * @returns {Buffer}
 */
function hash(algorithm, data) {
  return crypto
    .createHash(algorithm)
    .update(data)
    .digest();
}

/**
 * Get hash name by signature algorithm.
 * @param {number} algorithm
 * @returns {string|null}
 */
function getHashNameBySignAlgo(algorithm) {
  switch (algorithm) {
    case signatureScheme.ecdsa_secp256r1_sha256:
    case signatureScheme.rsa_pkcs1_sha256:
    case signatureScheme.rsa_pss_pss_sha256:
    case signatureScheme.rsa_pss_rsae_sha256:
      return 'sha256';
    case signatureScheme.ecdsa_secp384r1_sha384:
    case signatureScheme.rsa_pkcs1_sha384:
    case signatureScheme.rsa_pss_pss_sha384:
    case signatureScheme.rsa_pss_rsae_sha384:
      return 'sha384';
    case signatureScheme.ecdsa_secp521r1_sha512:
    case signatureScheme.rsa_pkcs1_sha512:
    case signatureScheme.rsa_pss_pss_sha512:
    case signatureScheme.rsa_pss_rsae_sha512:
      return 'sha512';
    case signatureScheme.ecdsa_sha1:
    case signatureScheme.rsa_pkcs1_sha1:
      return 'sha1';
    default:
      break;
  }
  return null;
}

/**
 * Get certificate type.
 * @param {Object} certificate The x509 certificate object.
 * @returns {number}
 */
function getCertificateType(certificate) {
  switch (certificate.publicKey.algo) {
    case 'ecEncryption':
      return certificateType.ecdsa_sign;
    case 'rsaEncryption':
      return certificateType.rsa_sign;
    default:
      break;
  }

  throw new Error('Unknown certificate public key');
}

/**
 * Get certificate signature algorithm.
 * @param {Object} certificate The x509 certificate object.
 * @returns {number}
 */
function getCertificateSignatureAlgorithm(certificate) {
  switch (certificate.signatureAlgorithm) {
    case 'ecdsaWithSha1':
      return signatureScheme.ecdsa_sha1;
    case 'ecdsaWithSha256':
      return signatureScheme.ecdsa_secp256r1_sha256;
    case 'ecdsaWithSha384':
      return signatureScheme.ecdsa_secp384r1_sha384;
    case 'ecdsaWithSha512':
      return signatureScheme.ecdsa_secp521r1_sha512;
    case 'sha512WithRsaEncryption':
      return signatureScheme.rsa_pkcs1_sha512;
    case 'sha384WithRsaEncryption':
      return signatureScheme.rsa_pkcs1_sha384;
    case 'sha256WithRsaEncryption':
      return signatureScheme.rsa_pkcs1_sha256;
    case 'sha1WithRsaEncryption':
      return signatureScheme.rsa_pkcs1_sha1;
    default:
      break;
  }

  throw new Error('Unknown certificate signature algorithm');
}

module.exports = {
  hash,
  createRandom,
  unixtime,
  assertClient,
  assertServer,
  createPreMasterSecret,
  createPSKPreMasterSecret,
  createMasterSecret,
  createExtendedMasterSecret,
  encryptPreMasterSecret,
  createFinished,
  getHashNameBySignAlgo,
  getCertificateSignatureAlgorithm,
  getCertificateType,
};
