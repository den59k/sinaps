const protocol = require('./protocol.js');
const { decode, encode, createDecode, 
	types: {array, uint8, uint16be}} = require('binary-data');

const {RecordLayer, Handshake} = require('./dtls');
const x509 = require('@fidm/x509')
const { ASN1 } = require('@fidm/asn1');

const crypto = require('crypto');

let set = new Set();

let bufs = [];

function decodeHandshake(buffer){
	const frag = decode(buffer, protocol.Handshake);
	const fragment = new Handshake(frag);
	
	if(fragment.type === 'CLIENT_HELLO'){
		const _body = decode(frag.body, protocol.ClientHello);
		fragment.body = _body;
	}

	if(fragment.type === 'SERVER_HELLO'){
		const _body = decode(frag.body, protocol.ServerHello);
		fragment.body = _body;
	}

	if(fragment.type === 'CERTIFICATE'){
		const _body = decode(frag.body, protocol.Certificate);
		
		const cert = new x509.Certificate(ASN1.fromDER(_body.certificateList[0]));

		const hash = crypto.createHash('sha256');
		hash.write(_body.certificateList[0]);

		fragment.body = _body;

		//key = cert.publicKey.toPEM();
	}

	if(fragment.type === 'SERVER_KEY_EXCHANGE'){

		const rstream = createDecode(frag.body);

	    const ecdheParams = decode(rstream, protocol.ServerECDHParams);

	    const bytes = decode.bytes;

	    const digitalSign = decode(rstream, protocol.DigitallySigned);

		fragment.body = [ecdheParams, digitalSign];

/*		const publicKey = crypto.createPublicKey(key);

		console.log(publicKey.asymmetricKeyType);

		const verify = crypto.createVerify('SHA256');
		verify.write(clientRandom);
		verify.write(serverRandom);
		verify.write(frag.body.slice(0, bytes));
		verify.end();
		console.log(verify.verify(key, digitalSign.signature));*/

	}

	if(fragment.type === 'CERTIFICATE_REQUEST'){
		const _body = decode(frag.body, protocol.CertificateRequest);
		fragment.body = _body;
	}

	if(fragment.type === 'CLIENT_KEY_EXCHANGE'){
		const _body = decode(frag.body, protocol.ECPublicKey);
		fragment.body = _body;
	}

	if(fragment.type === 'CERTIFICATE_VERIFY'){
		const _body = decode(frag.body, protocol.DigitallySigned);

		fragment.body = _body;
	}

	if(fragment.type === 'FINISHED'){
		const _body = frag.body;

		fragment.body = _body;
	}

	return fragment;
}

function decodeDTLS(buffer, add) {

	//Здесь мы указываем, что это DTLS Record
	const records = [];
	const istream = createDecode(buffer);
	let bytesDecoded = 0;

	while(bytesDecoded < buffer.length){
		const buf = buffer.slice(0, bytesDecoded);
		const rec = decode(istream, protocol.DTLSPlaintext);
		bytesDecoded += decode.bytes;

		const rlayer = new RecordLayer(rec);
		rlayer.record = rec;

		if(rlayer.type === 'HANDSHAKE'){
			if(!rlayer.encoded){
				rlayer.fragment = decodeHandshake(rec.fragment);
			}
		}

		records.push(rlayer);

	}

	return records;
}

module.exports = {
	decodeDTLS,
	decodeHandshake
}