const {createEncode, encode} = require ('binary-data')
const {RecordLayer, Handshake} = require('./dtls');
const crypto = require('crypto');
const cs = require('./constants');
const pl = require('./protocol.js');
const fs = require('fs');

const DTLSdecode = require('./decode-dtls.js');

const { phash } = require('./cipher-utils.js');

function prf(size, secret, label, seed) {

	const name = (typeof label === 'string') ? Buffer.from(label, 'ascii') : label;

	console.log("*** PRF.name = ", name);

	return phash(size, 'sha256', secret, Buffer.concat([name, seed]));
}

class DTLSsession {
	constructor(send){
		this.send = send;
		this.clientRandom = crypto.randomBytes(32);
		this.serverRandom = '';
		this.certificate = fs.readFileSync('./certs/cert.der');
		this.privateKey = fs.readFileSync('./certs/ec_key.pem');
		this.sequenceNumber = 0;	//Так вышло, что этот параметр глобальный
		this.sequence = 0;

		this.serverKey = null;
		this.clientKey = null;

		this.handshakeMessages = [];

		this.cipherCount = 0;
	}

	fragments = [];
	sendedResponse = false;

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
				fragment: body.fragment
			}

			encode(record, ostream, pl.DTLSPlaintext);
			this.sequenceNumber++;

			if(body.type === 'CHANGE_CIPHER_SPEC'){
				this.sequenceNumber = 0;
			}
		}

		this.send(ostream.slice());
		console.log(ostream.slice().length);
		let arr = DTLSdecode(ostream.slice());
		for(let layer of arr)
			console.log(layer.fragment);
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

		if(this.cipherCount > 0)
			_fragment = this.encrypt(body, _fragment);	

		this.sequence++;
		this.addMessageQueue(_fragment);
		this.fragments.push({type: body.type, epoch: this.cipherCount, fragment: _fragment});
		
	}

	encrypt(body, fragment){
		this.clientNonce.writeUInt16BE(this.cipherCount, 4);
		this.clientNonce.writeUIntBE(this.sequence, 6, 6);

		const explicitNonce = this.clientNonce.slice(4);

		const additionalData = {
			epoch: this.cipherCount,
			sequence: this.sequence,
			type: cs.contentType[body.type],
			version: cs.protocolVersion.DTLS_1_2,
			length: fragment.length,
		};

		const additionalBuffer = encode(additionalData, pl.AEADAdditionalData).slice();

		console.log('additionalBuffer: ', additionalBuffer.length, additionalBuffer);

		const cipher = crypto.createCipheriv('aes-128-gcm', this.clientWriteKey, this.clientNonce, {
			authTagLength: 16,
		});

		cipher.setAAD(additionalBuffer, {
			plaintextLength: fragment.length,
		});

		const headPart = cipher.update(fragment);
		const finalPart = cipher.final();
		const authtag = cipher.getAuthTag();

		console.log("HeadPart: ", headPart.length, headPart);
		console.log("finalPart: ", finalPart.length, finalPart);
		console.log("authtag: ", authtag.length, authtag);

		return Buffer.concat([explicitNonce, headPart, finalPart, authtag]);
	}

	addMessageQueue = fragment => {
		this.handshakeMessages.push(fragment);
	}

	Hello(){
		this.fragments = [];
		this.sequence = 0;

		const _srtp = encode([0x01, 0x02], pl.NamedCurveList).slice();			//Нууу, хоть это и не совсем точно :D
		const _eliptic = encode([  0x17, 0x18], pl.NamedCurveList).slice();

		const hello = {
			clientVersion: cs.protocolVersion.DTLS_1_2,
			random: this.clientRandom,
			sessionId: Buffer.allocUnsafe(0),		//Нам это не нужно пока
			cookie: Buffer.allocUnsafe(0),			//И это нам тоже не нужно
			cipherSuites: cs.defaultCipherSuites,
			compressionMethods: [0],
			extensions: [
				{type: cs.extensionTypes.RENEGOTIATION_INDICATION, data: Buffer.from([0]) },
				{type: cs.extensionTypes.ELLIPTIC_CURVES, data: _eliptic },
				{type: cs.extensionTypes.RECORD_SIZE_LIMIT, data: Buffer.from([0x40, 0x00]) },
				{type: cs.extensionTypes.USE_SRTP, data: Buffer.concat([_srtp, Buffer.from([0])]) }
			]
		}

		const body = encode(hello, pl.ClientHello).slice();

		this.addMessageHanshake({type: 'HANDSHAKE', ftype: 'CLIENT_HELLO', body});

		console.log("Отправлен ClientHello");

		this.sendAll();
	}


	Response(){
		if(this.sendedResponse)
			return;

		this.sequence = 1;

		this.fragments = [];
		this.curve = crypto.createECDH('prime256v1');
		this.clientKey = this.curve.generateKeys();
		this.premaster = this.curve.computeSecret(this.serverKey);

		console.log("PRE MASTER KEY: ", this.premaster);

		console.log(this.clientKey);

		const certificate = {
			certificateList: [this.certificate]
		}
		const _certificate = encode(certificate, pl.Certificate).slice();

		this.addMessageHanshake({type: 'HANDSHAKE', ftype: 'CERTIFICATE', body: _certificate});

		const _clientKey = encode(this.clientKey, pl.ECPublicKey).slice();

		this.addMessageHanshake({type: 'HANDSHAKE', ftype: 'CLIENT_KEY_EXCHANGE', body: _clientKey});

		const sign = crypto.createSign('SHA256');

		sign.write(Buffer.concat(this.handshakeMessages));
		sign.end();

		const signature = {
			algorithm: 1027,
			signature: sign.sign(this.privateKey)
		}

		const _signature = encode(signature, pl.DigitallySigned).slice();

		this.addMessageHanshake({type: 'HANDSHAKE', ftype: 'CERTIFICATE_VERIFY', body: _signature});

		this.fragments.push({type: 'CHANGE_CIPHER_SPEC', fragment: Buffer.from([1])});


		this.cipherCount = 1;
		this.sequence = 0;    //Вот здесь мы все и обнулим))
		let seed = Buffer.concat([this.clientRandom, this.serverRandom]);
		this.masterSecret = prf(48, this.premaster, 'master secret', seed);
		console.log("MASTER SECRET: ", this.masterSecret);


		seed = Buffer.concat([this.serverRandom, this.clientRandom]);
		const keyBlock = prf(40, this.masterSecret, 'key expansion', seed);

		this.clientWriteKey = keyBlock.slice(0, 16);
		this.serverWriteKey = keyBlock.slice(16, 32);

		const clientIVfixed = keyBlock.slice(32, 36);		//В общем, так вышло, что длина
		const serverIVfixed = keyBlock.slice(36, 40);		//IV - 4 байта, я хз, как это
		//Может, это потому что fixed IV = 4

		this.clientNonce = Buffer.alloc(12, 0);
		this.serverNonce = Buffer.alloc(12, 0);

		clientIVfixed.copy(this.clientNonce, 0);
    	serverIVfixed.copy(this.serverNonce, 0);

		console.log("clientWriteKey: ", this.clientWriteKey);
		console.log("serverWriteKey: ", this.serverWriteKey);
		console.log("clientNonce: ", this.clientNonce);
		console.log("serverNonce: ", this.serverNonce);



		const hash = crypto.createHash('sha256');
		hash.update(Buffer.concat(this.handshakeMessages));
		const bytes = hash.digest();
		const finalMessage = prf(12, this.masterSecret, 'client finished', bytes);
		console.log(finalMessage);

		this.addMessageHanshake({type: 'HANDSHAKE', ftype: 'FINISHED', body: finalMessage});

		//this.fragments.push({type: 'HANDSHAKE', ftype: 'FINISHED', epoch: 1, body: finalMessage});


		this.sendedResponse = true;

		console.log("Отправлен запрос");

		this.sendAll();

		console.log(this);
	}
}

module.exports = DTLSsession;