'use strict';

/**
 * Alert protocol.
 * @link https://tools.ietf.org/html/rfc5246#section-7.2
 */
const alertLevel = {
  WARNING: 1,
  FATAL: 2,
};

const alertDescription = {
  CLOSE_NOTIFY: 0,
  UNEXPECTED_MESSAGE: 10,
  BAD_RECORD_MAC: 20,
  DECRYPTION_FAILED_RESERVED: 21,
  RECORD_OVERFLOW: 22,
  DECOMPRESSION_FAILURE: 30,
  HANDSHAKE_FAILURE: 40,
  NO_CERTIFICATE_RESERVED: 41,
  BAD_CERTIFICATE: 42,
  UNSUPPORTED_CERTIFICATE: 43,
  CERTIFICATE_REVOKED: 44,
  CERTIFICATE_EXPIRED: 45,
  CERTIFICATE_UNKNOWN: 46,
  ILLEGAL_PARAMETER: 47,
  UNKNOWN_CA: 48,
  ACCESS_DENIED: 49,
  DECODE_ERROR: 50,
  DECRYPT_ERROR: 51,
  EXPORT_RESTRICTION_RESERVED: 60,
  PROTOCOL_VERSION: 70,
  INSUFFICIENT_SECURITY: 71,
  INTERNAL_ERROR: 80,
  USER_CANCELED: 90,
  NO_RENEGOTIATION: 100,
  UNSUPPORTED_EXTENSION: 110,
};

const sessionType = {
  CLIENT: 1,
  SERVER: 2,
};

/**
 * Handshake Protocol
 * @link https://tools.ietf.org/html/rfc6347#section-4.3.2
 */
const handshakeType = {
  HELLO_REQUEST: 0,
  CLIENT_HELLO: 1,
  SERVER_HELLO: 2,
  HELLO_VERIFY_REQUEST: 3,
  CERTIFICATE: 11,
  SERVER_KEY_EXCHANGE: 12,
  CERTIFICATE_REQUEST: 13,
  SERVER_HELLO_DONE: 14,
  CERTIFICATE_VERIFY: 15,
  CLIENT_KEY_EXCHANGE: 16,
  FINISHED: 20,
};

const contentType = {
  CHANGE_CIPHER_SPEC: 20,
  ALERT: 21,
  HANDSHAKE: 22,
  APPLICATION_DATA: 23,
};

const protocolVersion = {
  DTLS_1_0: 0xfeff,
  DTLS_1_2: 0xfefd,
};

const cipherSuites = {
  TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256: 0xc02b,
  TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384: 0xc02c,
  TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256: 0xc02f,
  TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384: 0xc030,
  TLS_RSA_WITH_AES_128_GCM_SHA256: 0x009c,
  TLS_RSA_WITH_AES_256_GCM_SHA384: 0x009d,
  TLS_PSK_WITH_AES_128_GCM_SHA256: 0x00a8,
  TLS_PSK_WITH_AES_256_GCM_SHA384: 0x00a9,
  TLS_ECDHE_PSK_WITH_AES_128_GCM_SHA256: 0xd001,
  TLS_ECDHE_PSK_WITH_AES_256_GCM_SHA384: 0xd002,
  TLS_ECDHE_PSK_WITH_CHACHA20_POLY1305_SHA256: 0xccac,
  TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256: 0xcca9,
  TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256: 0xcca8,
  TLS_PSK_WITH_CHACHA20_POLY1305_SHA256: 0xccab,
};

const defaultCipherSuites = [
  cipherSuites.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
  cipherSuites.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
  cipherSuites.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
  cipherSuites.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
];

const compressionMethod = {
  NULL: 0,
};

const extensionTypes = {
  EXTENDED_MASTER_SECRET: 23,
  ELLIPTIC_CURVES: 10,
  EC_POINT_FORMATS: 11,
  APPLICATION_LAYER_PROTOCOL_NEGOTIATION: 16,
  SIGNATURE_ALGORITHMS: 13,
  USE_SRTP: 14,
  RECORD_SIZE_LIMIT: 28,
  RENEGOTIATION_INDICATION: 65281,
};

const AEAD_AES_128_GCM = {
  K_LEN: 16, // Length of a key.
  N_MIN: 12, // Min nonce length.
  N_MAX: 12, // Max nonce length.
  P_MAX: 2 ** 36 - 31, // Max length of a plaintext.

  // Max safe int in js is 2 ** 53. So, use this value
  // instead of 2 ** 61 as described in rfc5116.
  A_MAX: 2 ** 53 - 1, // Max length of an additional data.
  C_MAX: 2 ** 36 - 15, // Cipher text length.
};

const AEAD_AES_256_GCM = {
  K_LEN: 32, // Length of a key.
  N_MIN: 12, // Min nonce length.
  N_MAX: 12, // Max nonce length.
  P_MAX: 2 ** 36 - 31, // Max length of a plaintext.

  // Note: see above.
  A_MAX: 2 ** 53 - 1, // Max length of an additional data.
  C_MAX: 2 ** 36 - 15, // Cipher text length.
};

const AEAD_CHACHA20_POLY1305 = {
  K_LEN: 32, // Length of a key.
  N_MIN: 12, // Min nonce length.
  N_MAX: 12, // Max nonce length.
  P_MAX: 247877906880, // Max length of a plaintext (~256 GB).

  // Max safe int in js is 2 ** 53. So, use this value
  // instead of 2 ** 64 - 1 as described in rfc7539.
  A_MAX: 2 ** 53 - 1, // Max length of an additional data.
  C_MAX: 247877906896, // Cipher text length.
};

const randomSize = 32;
const maxSessionIdSize = 32;

const namedCurves = {
  // curves 1 - 22 was deprecated
  secp256r1: 23,
  prime256v1: 23,
  secp384r1: 24,
  secp521r1: 25,
  // x25519: 29, do not support by nodejs
  // x448: 30,  do not support by nodejs
};

const ecCurveTypes = {
  namedCurve: 3,
};

const signTypes = {
  NULL: 0,
  ECDHE: 1,
};

const keyTypes = {
  NULL: 0,
  RSA: 1,
  ECDSA: 2,
  PSK: 3,
};

const kxTypes = {
  NULL: 0,
  RSA: 1,
  ECDHE_RSA: 2,
  ECDHE_ECDSA: 3,
  PSK: 4,
  ECDHE_PSK: 5,
};

// TLS 1.3 signature algorithms
// https://tools.ietf.org/html/rfc8446#section-4.2.3
const signatureScheme = {
  /* RSASSA-PKCS1-v1_5 algorithms */
  rsa_pkcs1_sha256: 0x0401,
  rsa_pkcs1_sha384: 0x0501,
  rsa_pkcs1_sha512: 0x0601,

  /* ECDSA algorithms */
  ecdsa_secp256r1_sha256: 0x0403,
  ecdsa_secp384r1_sha384: 0x0503,
  ecdsa_secp521r1_sha512: 0x0603,

  /* RSASSA-PSS algorithms with public key OID rsaEncryption */
  rsa_pss_rsae_sha256: 0x0804,
  rsa_pss_rsae_sha384: 0x0805,
  rsa_pss_rsae_sha512: 0x0806,

  /* EdDSA algorithms */
  ed25519: 0x0807,
  ed448: 0x0808,

  /* RSASSA-PSS algorithms with public key OID RSASSA-PSS */
  rsa_pss_pss_sha256: 0x0809,
  rsa_pss_pss_sha384: 0x080a,
  rsa_pss_pss_sha512: 0x080b,

  /* Legacy algorithms */
  rsa_pkcs1_sha1: 0x0201,
  ecdsa_sha1: 0x0203,
};

const certificateType = {
  // rfc5246-defined types
  rsa_sign: 1,
  dss_sign: 2,

  // rfc8422-defined types
  ecdsa_sign: 64,
};

module.exports = {
  alertLevel,
  alertDescription,
  sessionType,
  handshakeType,
  contentType,
  protocolVersion,
  cipherSuites,
  compressionMethod,
  extensionTypes,
  AEAD_AES_128_GCM,
  AEAD_AES_256_GCM,
  AEAD_CHACHA20_POLY1305,
  randomSize,
  maxSessionIdSize,
  namedCurves,
  ecCurveTypes,
  signTypes,
  keyTypes,
  kxTypes,
  signatureScheme,
  certificateType,
  defaultCipherSuites,
};
