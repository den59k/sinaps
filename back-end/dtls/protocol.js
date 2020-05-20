'use strict';

const {
  types: {
    uint8,
    uint16be,
    uint48be,
    uint24be,
    buffer,
    array,
    when,
    select,
    string,
  },
} = require('binary-data');
const { ecCurveTypes } = require('./constants');

/**
 * Internal type for trivial errors check.
 * @private
 * @param {string} errorMessage
 * @returns {Object} The `binary-data` compatible type.
 */
function assertType(errorMessage) {
  return {
    encode: () => {
      throw new Error(errorMessage);
    },
    decode: () => {
      throw new Error(errorMessage);
    },
    encodingLength: () => {
      throw new Error(errorMessage);
    },
  };
}

// Record layer.

const ProtocolVersion = uint16be;

const ContentType = uint8;

const DTLSPlaintextHeader = {
  type: ContentType,
  version: ProtocolVersion,
  epoch: uint16be,
  sequenceNumber: uint48be,
  length: uint16be,
};

const DTLSPlaintext = {
  ...DTLSPlaintextHeader,
  fragment: buffer(context => context.current.length),
};

const AlertLevel = uint8;
const AlertDescription = uint8;

const Alert = {
  level: AlertLevel,
  description: AlertDescription,
};

// Handshake Protocol

const HandshakeType = uint8;

const HandshakeHeader = {
  type: HandshakeType,
  length: uint24be,
  sequence: uint16be,
  fragment: {
    offset: uint24be,
    length: uint24be,
  },
};

const Handshake = {
  ...HandshakeHeader,
  body: buffer(({ current }) => current.fragment.length),
};

const Random = buffer(32);

const SessionID = buffer(uint8);

const CipherSuite = uint16be;

const CompressionMethod = uint8;

const HelloVerifyRequest = {
  serverVersion: ProtocolVersion,
  cookie: buffer(uint8),
};

const ExtensionType = uint16be;

const Extension = {
  type: ExtensionType,
  data: buffer(uint16be),
};

const ExtensionList = array(Extension, uint16be, 'bytes');

const ClientHello = {
  clientVersion: ProtocolVersion,
  random: Random, // Unixtime + 28 random bytes.,
  sessionId: SessionID,
  cookie: buffer(uint8),
  cipherSuites: array(CipherSuite, uint16be, 'bytes'),
  compressionMethods: array(CompressionMethod, uint8, 'bytes'),
  extensions: ExtensionList,
};

const ServerHello = {
  serverVersion: ProtocolVersion,
  random: Random, // Unixtime + 28 random bytes.
  sessionId: SessionID,
  cipherSuite: CipherSuite,
  compressionMethod: CompressionMethod,
  extensions: ExtensionList,
};

const ASN11Cert = buffer(uint24be);

const Certificate = {
  certificateList: array(ASN11Cert, uint24be, 'bytes'),
};

const EncryptedPreMasterSecret = buffer(uint16be);

const AEADAdditionalData = {
  epoch: uint16be,
  sequence: uint48be,
  type: ContentType,
  version: ProtocolVersion,
  length: uint16be,
};

const NamedCurve = uint16be;

const NamedCurveList = array(NamedCurve, uint16be, 'bytes');

const SignatureAlgorithm = uint16be;

const ECPublicKey = buffer(uint8);

const ServerECDHParams = {
  curveType: uint8,
  curve: select(
    when(
      ({ current }) => current.curveType === ecCurveTypes.namedCurve,
      NamedCurve
    ),
    assertType('Invalid curve type')
  ),
  pubkey: ECPublicKey,
};

const ECDHParams = {
  curveType: uint8,
  curve: NamedCurve,
  pubkey: ECPublicKey
}

// RFC5246, section-4.7
const DigitallySigned = {
  algorithm: SignatureAlgorithm,
  signature: buffer(uint16be),
};

const ClientCertificateType = uint8;
const DistinguishedName = string(uint16be);

const CertificateRequest = {
  certificateTypes: array(ClientCertificateType, uint8, 'bytes'),
  signatures: array(SignatureAlgorithm, uint16be, 'bytes'),
  authorities: array(DistinguishedName, uint16be, 'bytes'),
};

const ALPNProtocolName = string(uint8);
const ALPNProtocolNameList = array(ALPNProtocolName, uint16be, 'bytes');

// RFC4279, section-2
const ServerPSKIdentityHint = buffer(uint16be);

module.exports = {
  DTLSPlaintextHeader,
  DTLSPlaintext,
  Alert,
  Handshake,
  HandshakeHeader,
  ClientHello,
  HelloVerifyRequest,
  ExtensionList,
  ServerHello,
  Certificate,
  EncryptedPreMasterSecret,
  AEADAdditionalData,
  NamedCurve,
  NamedCurveList,
  ECPublicKey,
  SignatureAlgorithm,
  ServerECDHParams,
  DigitallySigned,
  ClientCertificateType,
  CertificateRequest,
  ALPNProtocolNameList,
  ServerPSKIdentityHint,

  ECDHParams
};
