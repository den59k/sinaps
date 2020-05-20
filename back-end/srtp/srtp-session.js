const crypto = require('crypto');
const decodeRTCP = require('./rtcp-decode.js');
const { readBit, readBits } = require('./utils');

function XOR(a, b, offsetB){
	var length = Math.max(a.length, b.length+offsetB)
	var buffer = Buffer.allocUnsafe(length)

	a.copy(buffer, 0);

	for (var i = offsetB; i < length; ++i) {
		buffer[i] = a[i] ^ b[i-offsetB]
	}

	return buffer;
}

class SRTPsession{

	constructor(keys){
		this.ROC = 0;

		this.clientMasterKey = keys.clientMasterKey;
		this.serverMasterKey = keys.serverMasterKey;
		this.clientMasterSalt = keys.clientMasterSalt;
		this.serverMasterSalt = keys.serverMasterSalt;

		console.log(this.clientMasterKey);
		console.log(this.serverMasterKey);
		console.log(this.clientMasterSalt);
		console.log(this.serverMasterSalt);

		this.rRTP = {};		//receiver RTP keys
		this.rRTCP = {};	//receiver RTCP keys
		this.sRTP = {};		//sender RTP keys
		this.sRTCP = {}; 	//sender RTCP keys

		const iv = Buffer.alloc(16, 0);
		for(let i = 0; i < 2; i++){
			let RTPkeys, RTCPkeys, masterKey;
			if(i === 0){
				this.clientMasterSalt.copy(iv);		//Записываем ключи для принятых сообщений
				masterKey = this.clientMasterKey;
				RTPkeys = this.rRTP;
				RTCPkeys = this.rRTCP;
			}
			else{
				this.serverMasterSalt.copy(iv);		//Записываем ключи отправляющего
				masterKey = this.serverMasterKey;
				RTPkeys = this.sRTP;
				RTCPkeys = this.sRTCP;
			}

			const val = iv.readUInt8(7);			//Читай - https://tools.ietf.org/html/rfc3711#section-4.3

			iv.writeUInt8(val ^ 0, 7);
			RTPkeys.k_e = this.prf(16, iv, masterKey);			//SRTP encryption key

			iv.writeUInt8(val ^ 1, 7);
			RTPkeys.k_a = this.prf(20, iv, masterKey);			//SRTP authentication key

			iv.writeUInt8(val ^ 2, 7);
			RTPkeys.k_s = this.prf(14, iv, masterKey);			//SRTP salting key

			iv.writeUInt8(val ^ 3, 7);
			RTCPkeys.k_e = this.prf(16, iv, masterKey);		//SRTCP encryption key

			iv.writeUInt8(val ^ 4, 7);
			RTCPkeys.k_a = this.prf(20, iv, masterKey);		//SRTCP authentication key

			iv.writeUInt8(val ^ 5, 7);
			RTCPkeys.k_s = this.prf(14, iv, masterKey);		//SRTCP salting key
		}
	}

	prf(n, iv, masterKey){
		let cipher = crypto.createCipheriv('aes-128-ctr', masterKey, iv);
		let a = cipher.update(Buffer.alloc(n, 0));
		let b = cipher.final();
		return Buffer.concat([a, b]);
	}

	decode(udpMessage){
		let type = udpMessage.readUInt8(0);
		let payload = udpMessage.readUInt8(1);

		if(payload !== 200 && payload !== 201 && payload !== 202){

			let sequence = udpMessage.readUInt16BE(2);
			let timestamp = udpMessage.readUInt32BE(4);
			let SSRC = udpMessage.readUInt32BE(8);

			let CSRCcount = readBits(type, [4, 5, 6, 7]);
			let extensionFlag = readBit(type, 3);

			console.log("Это RTP сообщение");

			console.log("version: ", readBits(type, [0, 1]));
			console.log("padding: ",readBit(type, 2));
			console.log("extension: ", extensionFlag);
			console.log("CSRC count: ", CSRCcount);

			console.log("Marker: ", readBit(payload, 0));
			console.log('Payload-type: ', payload & ~(1 << 7));

			console.log('sequence-number: ', sequence);

			console.log('time-stamp: ', timestamp);

			console.log('SSRC: ', SSRC);

			let pos = 12;
			for(let i = 0; i < CSRCcount; i++){
				CSRC = udpMessage.readUInt32BE(pos);
				console.log('CSRC: ', CSRC);
				pos += 4;
			}

			if(extensionFlag !== 0){
				const profile = udpMessage.readUInt16BE(pos);
				pos += 2;
				const length = udpMessage.readUInt16BE(pos);
				pos+=2;

				console.log('Profile Extension: ', profile);
				console.log('Length Extension: ', length);
			}


			//Вычисляем auth подпись сообщения
			let authData = udpMessage.slice(0, udpMessage.length-10);
			const ROCbuffer = Buffer.alloc(4, 0);
			ROCbuffer.writeUInt32BE(this.ROC);

			console.log(authData.length);
			console.log("k_a:", this.rRTP.k_a);
			const hmac = crypto.createHmac('sha1', this.rRTP.k_a);

			hmac.update(authData);
			hmac.update(ROCbuffer);

			const authTag = hmac.digest();
			const valid = (udpMessage.slice(udpMessage.length-10).compare(authTag, 0, 10) === 0);


			console.log("ROC: ", ROCbuffer);
			console.log("VALID: ", valid);


			const encryptedData = udpMessage.slice(pos, udpMessage.length-10);

			//https://tools.ietf.org/html/rfc3711#section-4.1.1
			const buffer = Buffer.alloc(10, 0);
			buffer.writeUInt32BE(SSRC, 0);
			buffer.writeUInt32BE(this.ROC, 4);
			buffer.writeUInt16BE(sequence, 8);

			console.log("buffer: ", buffer.toString('hex'));

			const IV = Buffer.alloc(16, 0);
			XOR(this.rRTP.k_s, buffer, 4).copy(IV);

			const decipher = crypto.createDecipheriv('aes-128-ctr', this.rRTP.k_e, IV);
			const headerPart = decipher.update(encryptedData);
			const finalPart = decipher.final();

			const data = Buffer.concat([headerPart, finalPart]);

			return data;

		}else{
			console.log("Это RTCP сообщение");

			//Вычисляем auth подпись сообщения
			let authData = udpMessage.slice(0, udpMessage.length-10);
			const hmac = crypto.createHmac('sha1', this.rRTCP.k_a);
			hmac.update(authData);
			const authTag = hmac.digest();
			const valid = (udpMessage.slice(udpMessage.length-10).compare(authTag, 0, 10) === 0);

			console.log("VALID: ", valid);



			let index = udpMessage.readUInt32BE(udpMessage.length-14);
			const flag = index >>> 31;
			index = index & ~(1 << 31);
			console.log("index: ", index);

			const SSRC = udpMessage.readUInt32BE(4);

			const encryptedData = udpMessage.slice(8, udpMessage.length-14);

			//https://tools.ietf.org/html/rfc3711#section-4.1.1
			const buffer = Buffer.alloc(10, 0);
			buffer.writeUInt32BE(SSRC, 0);
			buffer.writeUInt32BE(index, 6);

			console.log("buffer: ", buffer.toString('hex'));

			const IV = Buffer.alloc(16, 0);
			XOR(this.rRTCP.k_s, buffer, 4).copy(IV);

			const decipher = crypto.createDecipheriv('aes-128-ctr', this.rRTCP.k_e, IV);
			const headerPart = decipher.update(encryptedData);
			const finalPart = decipher.final();

			const data = Buffer.concat([udpMessage.slice(0, 8), headerPart, finalPart]);

			const arr = decodeRTCP(data);

			for(let rtcp of arr){
				console.log(rtcp);
			}

			/*let _type = data.readUInt8(0);
			let _payload = data.readUInt8(1);
			const _length = data.readUInt16BE(2);
			const _SSRC = data.readUInt32BE(4);

			console.log("version: ", readBits(_type, [0, 1]));
			console.log("padding: ",readBit(_type, 2));
			console.log('Report count: ', readBits(_type, [3, 4, 5, 6, 7]));
			console.log('Packet type: ', _payload);
			console.log('Length: ', _length);
			console.log('SSRC: ', _SSRC);*/

			return Buffer.allocUnsafe(0);


		}

	}

}

module.exports = SRTPsession;