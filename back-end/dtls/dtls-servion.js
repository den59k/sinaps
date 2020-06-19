const {createEncode, encode} = require ('binary-data')
const crypto = require('crypto');
const cs = require('./constants');
const pl = require('./protocol.js');
const fs = require('fs');

const {decodeDTLS, decodeHandshake} = require('./decode-dtls.js');

const { phash } = require('./cipher-utils.js');

function prf(size, secret, label, seed) {

	const name = Buffer.from(label, 'ascii');

	return phash(size, 'sha256', secret, Buffer.concat([name, seed]));
}


class DTLSsession {

	constructor(send){
		this.send = send;
		this.clientRandom = null;
		this.serverRandom = crypto.randomBytes(32);

		this.sessionId = crypto.randomBytes(32);

		this.certificate = fs.readFileSync('./certs/cert.der');
		this.privateKey = fs.readFileSync('./certs/ec_key.pem');
		this.sequenceNumber = 0;	//Так вышло, что этот параметр глобальный
		this.sequence = 0;

		this.serverKey = null;
		this.clientKey = null;

		this.handshakeMessages = [];

		this.cipherCount = 0;

		this.fragments = [];

		this.resendInterval = null;
	}

	successSession(){
		if(this.resendInterval !== null){
			clearInterval(this.resendInterval);
			this.resendInterval = null;
		}
	}

	sendAll(){
		const ostream = createEncode();

		for(let i = 0; i < this.fragments.length; i++){
			const body = this.fragments[i];
			const record = {
				type: cs.contentType[body.type],
				version: cs.protocolVersion.DTLS_1_2,
				epoch: body.epoch,
				sequenceNumber: this.sequenceNumber,
				length: body.fragment.length,
			}

			if(body.epoch > 0){
				record.fragment = this.encrypt(record, body.fragment);	
				record.length = record.fragment.length;
			}else{
				record.fragment = body.fragment;
			}

			encode(record, ostream, pl.DTLSPlaintext);
			this.sequenceNumber++;

			if(body.type === 'CHANGE_CIPHER_SPEC'){
				this.sequenceNumber = 0;
			}
		}
		const data = ostream.slice()
		this.send(data);
		console.log("ОТВЕТ ОТПРАВЛЕН");

		/*this.resendInterval = setInterval(() => {
			console.log("ОТВЕТ ОТПРАВЛЕН ЕЩЕ РАЗ ДЛЯ НЕПОНЯТЛИВЫХ, БЛИН!");
			this.send(data)
		}, 1000);*/
	
	}


	addMessageHanshake = body => {

		const fragment = {
			type: cs.handshakeType[body.ftype],
			length: body.body.length,
			sequence: this.sequence,
			fragment: {offset: 0, length: body.body.length},
			body: body.body
		}
		let _fragment = encode(fragment, pl.Handshake).slice();

		this.sequence++;
		this.addMessageQueue(_fragment);
		this.fragments.push({type: body.type, epoch: this.cipherCount, fragment: _fragment});
		
	}

	receivedMessages = [];
	addMessageCheckQueue = fragment => {
		const id = fragment.readUInt8(0);		//Здесь мы считаем тип сообщения, чтобы не было повторов
		if(this.receivedMessages.includes(id))
			return false;
		this.receivedMessages.push(id);
		this.addMessageQueue(fragment);

		if(this.resendInterval !== null){
			clearInterval(this.resendInterval);
			this.resendInterval = null;
		}

		return true;
	}

	addMessageQueue = fragment => {
		this.handshakeMessages.push(fragment);
	}

	createCipher(){
		this.premaster = this.curve.computeSecret(this.clientKey);
		//console.log("CLIENT KEY: ", this.clientKey);
		//console.log("SERVER KEY: ", this.serverKey);
		//console.log("PRE MASTER KEY: ", this.premaster);


		let seed = Buffer.concat([this.clientRandom, this.serverRandom]);
		this.masterSecret = prf(48, this.premaster, 'master secret', seed);
		//console.log("MASTER SECRET: ", this.masterSecret);

		//console.log("SEED: ", seed);

		seed = Buffer.concat([this.serverRandom, this.clientRandom]);
		const keyBlock = prf(40, this.masterSecret, 'key expansion', seed);

		this.clientWriteKey = keyBlock.slice(0, 16);
		this.serverWriteKey = keyBlock.slice(16, 32);

		const clientIVfixed = keyBlock.slice(32, 36);		//В общем, так вышло, что длина
		const serverIVfixed = keyBlock.slice(36, 40);		//IV - 4 байта, я хз, как это

		this.clientNonce = Buffer.alloc(12, 0);
		this.serverNonce = Buffer.alloc(12, 0);

		clientIVfixed.copy(this.clientNonce, 0);
    serverIVfixed.copy(this.serverNonce, 0);

		//console.log("clientWriteKey: ", this.clientWriteKey);
		//console.log("serverWriteKey: ", this.serverWriteKey);
		//console.log("clientNonce: ", this.clientNonce);
		//console.log("serverNonce: ", this.serverNonce);
	}

	getRTCPkeys(){
		let seed = Buffer.concat([this.clientRandom, this.serverRandom]);

		const keyBlock = prf(16*2 + 14*2, this.masterSecret, 'EXTRACTOR-dtls_srtp', seed);

		const keys = {
			clientMasterKey: keyBlock.slice(0, 16),
			serverMasterKey: keyBlock.slice(16, 32),
			clientMasterSalt: keyBlock.slice(32, 46),
			serverMasterSalt: keyBlock.slice(46, 60),
		};

		return keys;

	}

	decrypt(record){
		const m = record.fragment;
		//console.log("DECRYPTING MESSAGE: ", m);

		const explicit = m.slice(0, 8);
		explicit.copy(this.clientNonce, 4);

		//console.log("IV: ", this.clientNonce);

		const encryted = m.slice(8, m.length-16);
		const authTag = m.slice(m.length-16);

		//console.log("AUTH TAG: ", authTag);

		const additionalData = {
			epoch: record.epoch,
			sequence: record.sequenceNumber,
			type: record.type,
			version: record.version,
			length: encryted.length,
		};

		//console.log(additionalData);

		const additionalBuffer = encode(additionalData, pl.AEADAdditionalData).slice();


		const decipher = crypto.createDecipheriv(
			'aes-128-gcm', 
			this.clientWriteKey, 
			this.clientNonce, 
			{ authTagLength: 16 }
		);

		decipher.setAuthTag(authTag);
		decipher.setAAD(additionalBuffer);

		const headPart = decipher.update(encryted);
		const finalPart = decipher.final();

		return Buffer.concat([headPart, finalPart]);
	}

	encrypt(header, data) {
		this.serverNonce.writeUInt16BE(header.epoch, 4);
		this.serverNonce.writeUIntBE(header.sequenceNumber, 6, 6);

		const explicitNonce = this.serverNonce.slice(4);

		const additionalData = {
			epoch: header.epoch,
			sequence: header.sequenceNumber,
			type: header.type,
			version: header.version,
			length: data.length,
		};

		const additionalBuffer = encode(additionalData, pl.AEADAdditionalData).slice();

		const cipher = crypto.createCipheriv(
			'aes-128-gcm', 
			this.serverWriteKey, 
			this.serverNonce, 
			{ authTagLength: 16 }
		);

		cipher.setAAD(additionalBuffer, {
			plaintextLength: data.length,
		});

		const headPart = cipher.update(data);
		const finalPart = cipher.final();
		const authtag = cipher.getAuthTag();

		return Buffer.concat([explicitNonce, headPart, finalPart, authtag]);

	}

	getHashHandshakeMessages(label){		//Используется для FINISHED сообщения

		const hash = crypto.createHash('sha256');
		hash.update(Buffer.concat(this.handshakeMessages));
		const bytes = hash.digest();
		const finalMessage = prf(12, this.masterSecret, label, bytes);

		return finalMessage;
	}

	helloSended = false;

	sendHello(){
		if(this.helloSended)
			return
		this.helloSended = true;

		this.fragments = [];
		const hello = {
			serverVersion: cs.protocolVersion.DTLS_1_2,
			random: this.serverRandom,
			sessionId: Buffer.allocUnsafe(0),
			cipherSuite: cs.cipherSuites.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
			compressionMethod: 0,
			extensions: [
				{ type: cs.extensionTypes.RENEGOTIATION_INDICATION, data: Buffer.from([0]) },
				{ type: cs.extensionTypes.EC_POINT_FORMATS, data: Buffer.from([1, 0]) },
				//Здесь строка - "WEBRTC"
				//{ type: cs.extensionTypes.APPLICATION_LAYER_PROTOCOL_NEGOTIATION, 
				//	data: Buffer.from([0x00, 0x07, 0x06, 0x77, 0x65, 0x62, 0x72, 0x74, 0x63]) },
				//{ type: cs.extensionTypes.RECORD_SIZE_LIMIT, data: Buffer.from([0x40, 0x00]) },
				{ type: cs.extensionTypes.USE_SRTP, data: Buffer.from([0x00, 0x02, 0x00, 0x01, 0x00]) }
			]
		}

		const _hello = encode(hello, pl.ServerHello).slice();

		this.addMessageHanshake({
			type: 'HANDSHAKE', 
			ftype: 'SERVER_HELLO', 
			body: _hello
		});


		const certificate = {
			certificateList: [this.certificate]
		}
		const _certificate = encode(certificate, pl.Certificate).slice();

		this.addMessageHanshake({
			type: 'HANDSHAKE', 
			ftype: 'CERTIFICATE', 
			body: _certificate
		});


		this.curve = crypto.createECDH('prime256v1');

		this.serverKey = this.curve.generateKeys();

		const ECparam = {
			curveType: cs.ecCurveTypes.namedCurve,
			curve: cs.namedCurves.prime256v1,				//Это тоже самое, что и prime256v1
			pubkey: this.serverKey
		}

		const _data = encode(ECparam, pl.ECDHParams).slice();

		const sign = crypto.createSign('SHA256');
		sign.write(this.clientRandom);
		sign.write(this.serverRandom);
		sign.write(_data);
		sign.end();

		const signature = {
			algorithm: 1027,
			signature: sign.sign(this.privateKey)
		}

		const _signature = encode(signature, pl.DigitallySigned).slice();

		this.addMessageHanshake( {type: 'HANDSHAKE', ftype: 'SERVER_KEY_EXCHANGE', 
			body: Buffer.concat([_data, _signature]) } );

		const certificateRequest = {
			certificateTypes: [ 1, 64, 2],
			signatures: [ 
				1027, 1283, 1539,  
				515, 2052, 2053, 
				2054, 1025, 1281, 
				1537,  513, 1026,
				282, 1538,  514
			],
			authorities: []
		}

		const _certificateRequest = encode(certificateRequest, pl.CertificateRequest);

		this.addMessageHanshake({
			type: 'HANDSHAKE', 
			ftype: 'CERTIFICATE_REQUEST', 
			body: _certificateRequest
		});

		this.addMessageHanshake({
			type: 'HANDSHAKE', 
			ftype: 'SERVER_HELLO_DONE', 
			body: Buffer.allocUnsafe(0) 
		});

		this.sendAll();
	}

	sendFinish(){
		this.fragments = [];

		this.fragments.push({type: 'CHANGE_CIPHER_SPEC', fragment: Buffer.from([1])});
		this.cipherCount = 1;

		const body = this.getHashHandshakeMessages('server finished');

		this.addMessageHanshake({
			type: 'HANDSHAKE', 
			ftype: 'FINISHED', 
			body
		});

		this.sendAll();
	}
}

module.exports = DTLSsession;