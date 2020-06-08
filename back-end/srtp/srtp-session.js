const crypto = require('crypto');
const decodeRTCP = require('./rtcp-decode.js');
const { readBit, readBits } = require('./utils');
const { payloadTypes } = require('./constants.js');
const { encode, createEncode, types: { uint8, string } } = require('binary-data');

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

		this.sendedInfo = [];
		this.RTCPindex = 1;

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

	encodeRTCP(arr){
		const bufs = arr.map(this.packetEncode);

		const data = Buffer.concat(bufs);

		const SSRC = data.readUInt32BE(4);
		const decryptedData = data.slice(8);

		const buffer = Buffer.alloc(10, 0);
		buffer.writeUInt32BE(SSRC, 0);
		buffer.writeUInt32BE(this.RTCPindex, 6);

		const IV = Buffer.alloc(16, 0);
		XOR(this.sRTCP.k_s, buffer, 4).copy(IV);

		const cipher = crypto.createCipheriv('aes-128-ctr', this.sRTCP.k_e, IV);
		const headerPart = cipher.update(decryptedData);
		const finalPart = cipher.final();

		const indexBuffer = Buffer.alloc(4);
		indexBuffer.writeUInt32BE(this.RTCPindex);
		indexBuffer.writeUInt8(1<<7);

		const authData = Buffer.concat([data.slice(0, 8), headerPart, finalPart, indexBuffer]);

		//Вычисляем auth подпись сообщения
		const hmac = crypto.createHmac('sha1', this.sRTCP.k_a);
		hmac.update(authData);
		const authTag = hmac.digest();

		this.RTCPindex++;

		return Buffer.concat([authData, authTag.slice(0, 10)]);
	}

	packetEncode = (packet) => {
		const buf = Buffer.alloc((packet.length+1)*4);
		const firstByte = (2<<6)+packet.reportCount;
		buf.writeUInt8(firstByte, 0);
		buf.writeUInt8(packet.type, 1);
		buf.writeUInt16BE(packet.length, 2);
		buf.writeUInt32BE(packet.SSRC, 4);
	
		if(packet.length === 1)
			return buf;

		switch(packet.type){
			case payloadTypes.SR:
				const sended = this.getSendedInfo(packet.SSRC);
				packet.NTP.copy(buf, 8);
				buf.writeUInt32BE(packet.timestamp, 16);
				buf.writeUInt32BE(sended.packets, 20);
				buf.writeUInt32BE(sended.size, 24);
			break;

			case payloadTypes.SDES:
				const startPos = 8;
				for(let item of packet.items){
					buf.writeUInt8(item.cname, startPos);
					if(item.cname < 8){
						buf.writeUInt8(item.name.length, startPos+1);
						buf.write(item.name, startPos+2);
					}
				}
			break;

			case payloadTypes.RR:
				const _sended = this.getSendedInfo(packet.SSRC1);
				buf.writeUInt32BE(packet.SSRC1, 8);
				buf.writeUInt32BE(0, 12);	//Тип мы ни одного пакета такие не пропустили :D
				//Дальше берем номер последнего полученного пакетика
				const highestSequence = (_sended.ROC << 16) + _sended.lastSequence;
				//console.log("Sequence number: ", highestSequence);
				//console.log("Jitter: ", _sended.jitter << 0);
				buf.writeUInt32BE(highestSequence, 16);
				buf.writeUInt32BE(_sended.jitter << 0, 20);
			break;

			default:
				packet.buffer.copy(buf, 8);

		}
		return buf;
	}

	encodeRTP(data){

		const sended = this.getSendedInfo(data.SSRC);
		this.checkROC(sended, data.sequenceNumber);
		//https://tools.ietf.org/html/rfc3550#section-5
		//Первый байт 
		const header = Buffer.alloc(12);
		let type = 2 << 6;
		//type = type+data.CSRC.length;
		header.writeUInt8(type);

		//Второй байт
		let payloadType = (data.marker << 7) + data.payloadType;
		header.writeUInt8(payloadType, 1);

		header.writeUInt16BE(data.sequenceNumber, 2);

		header.writeUInt32BE(data.timestamp, 4);

		header.writeUInt32BE(data.SSRC, 8);

		const buffer = Buffer.alloc(10, 0);
		buffer.writeUInt32BE(data.SSRC, 0);
		buffer.writeUInt32BE(sended.ROC, 4);
		buffer.writeUInt16BE(data.sequenceNumber, 8);

		//console.log("buffer: ", buffer.toString('hex'));

		const IV = Buffer.alloc(16, 0);
		XOR(this.sRTP.k_s, buffer, 4).copy(IV);

		const cipher = crypto.createCipheriv('aes-128-ctr', this.sRTP.k_e, IV);
		let encryptedData = cipher.update(data.data);
		let finalPart = cipher.final();
		sended.size+=(data.data.length+10);
		
		const finalData = Buffer.concat([header, encryptedData, finalPart]);

		//Вычисляем auth подпись сообщения
		const ROCbuffer = Buffer.alloc(4, 0);
		ROCbuffer.writeUInt32BE(sended.ROC);

		//console.log(authData.length);
		//console.log("k_a:", this.sRTP.k_a);
		const hmac = crypto.createHmac('sha1', this.sRTP.k_a);

		hmac.update(finalData);
		hmac.update(ROCbuffer);

		const authTag = hmac.digest();
		sended.packets++;
	
		return Buffer.concat([finalData, authTag.slice(0, 10)]);
	}


	getSendedInfo(SSRC){

		for(let a of this.sendedInfo)
			if(a.SSRC === SSRC)
				return a;

		const info = {SSRC, size: 0, packets: 0, ROC: 0, lastSequence: -1};
		this.sendedInfo.push(info);

		return info;
	}

	checkROC(sended, sequence){
		if((sequence > sended.lastSequence && Math.abs(sended.lastSequence-sequence) < 1000) 
			|| sended.lastSequence < 0)
			sended.lastSequence = sequence;	

		//Если у нас такая фигня - увеличим ROC
		if(sended.lastSequence-sequence > 64000){
			sended.ROC++;
			sended.lastSequence = sequence;
		}
	}

	//https://tools.ietf.org/html/rfc3550#appendix-A.8
	calculateJitter(sended, timestamp){
		if(sended.timestamp === undefined){
			sended.timestamp = timestamp;
			sended.jitter = 0;
			return;
		}

		let d = timestamp - sended.timestamp;
		if(d < 0) d = -d;
		sended.jitter += (1/16)*(d - sended.jitter);

		sended.timestamp = timestamp;
	}

	decode(udpMessage){
		let type = udpMessage.readUInt8(0);
		let payload = udpMessage.readUInt8(1);

		//Это RTP пакет или RTCP
		if(payload !== 200 && payload !== 201 && payload !== 202){

			let sequence = udpMessage.readUInt16BE(2);
			let timestamp = udpMessage.readUInt32BE(4);
			let SSRC = udpMessage.readUInt32BE(8);

			let CSRCcount = readBits(type, [4, 5, 6, 7]);
			let extensionFlag = readBit(type, 3);

			const sended = this.getSendedInfo(SSRC);
			this.checkROC(sended, sequence);
			this.calculateJitter(sended, timestamp);
			//console.log("Это RTP сообщение");

			//console.log("version: ", readBits(type, [0, 1]));
			//console.log("padding: ",readBit(type, 2));
			//console.log("extension: ", extensionFlag);
			//console.log("CSRC count: ", CSRCcount);

			//console.log("Marker: ", readBit(payload, 0));
			//console.log('Payload-type: ', payload & ~(1 << 7));

			//console.log('sequence-number: ', sequence);

			//console.log('time-stamp: ', timestamp);

			//console.log('SSRC: ', SSRC);

			const message = {
				RTP: true,
				version: readBits(type, [0, 1]),
				padding: readBit(type, 2),
				extension: extensionFlag,
				marker: readBit(payload, 0),
				payloadType: payload & ~(1 << 7),
				sequenceNumber: sequence,
				timestamp,
				SSRC,
				CSRC: [],
				_ROC: sended.ROC
			};

			let pos = 12;
			for(let i = 0; i < CSRCcount; i++){
				message.CSRC.push(udpMessage.readUInt32BE(pos));
				//console.log('CSRC: ', CSRC);
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
			ROCbuffer.writeUInt32BE(sended.ROC);

			//console.log(authData.length);
			//console.log("k_a:", this.rRTP.k_a);
			const hmac = crypto.createHmac('sha1', this.rRTP.k_a);

			hmac.update(authData);
			hmac.update(ROCbuffer);

			const authTag = hmac.digest();
			const valid = (udpMessage.slice(udpMessage.length-10).compare(authTag, 0, 10) === 0);


			//console.log("ROC: ", ROCbuffer);
			//console.log("VALID: ", valid);


			const encryptedData = udpMessage.slice(pos, udpMessage.length-10);

			//https://tools.ietf.org/html/rfc3711#section-4.1.1
			const buffer = Buffer.alloc(10, 0);
			buffer.writeUInt32BE(SSRC, 0);
			buffer.writeUInt32BE(sended.ROC, 4);
			buffer.writeUInt16BE(sequence, 8);

			//console.log("buffer: ", buffer.toString('hex'));

			const IV = Buffer.alloc(16, 0);
			XOR(this.rRTP.k_s, buffer, 4).copy(IV);

			const decipher = crypto.createDecipheriv('aes-128-ctr', this.rRTP.k_e, IV);
			const headerPart = decipher.update(encryptedData);
			const finalPart = decipher.final();

			message.data = Buffer.concat([headerPart, finalPart]);

			return message;

		}else{
			console.log("Это RTCP сообщение");

			//Вычисляем auth подпись сообщения
			let authData = udpMessage.slice(0, udpMessage.length-10);
			const hmac = crypto.createHmac('sha1', this.rRTCP.k_a);
			hmac.update(authData);
			const authTag = hmac.digest();
			const valid = (udpMessage.slice(udpMessage.length-10).compare(authTag, 0, 10) === 0);

			//console.log("VALID: ", valid);



			let index = udpMessage.readUInt32BE(udpMessage.length-14);
			const flag = index >>> 31;
			index = index & ~(1 << 31);

			const SSRC = udpMessage.readUInt32BE(4);

			const encryptedData = udpMessage.slice(8, udpMessage.length-14);

			//https://tools.ietf.org/html/rfc3711#section-4.1.1
			const buffer = Buffer.alloc(10, 0);
			buffer.writeUInt32BE(SSRC, 0);
			buffer.writeUInt32BE(index, 6);

			//console.log("buffer: ", buffer.toString('hex'));

			const IV = Buffer.alloc(16, 0);
			XOR(this.rRTCP.k_s, buffer, 4).copy(IV);

			const decipher = crypto.createDecipheriv('aes-128-ctr', this.rRTCP.k_e, IV);
			const headerPart = decipher.update(encryptedData);
			const finalPart = decipher.final();

			const data = Buffer.concat([udpMessage.slice(0, 8), headerPart, finalPart]);

			const arr = decodeRTCP(data);

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

			return arr;


		}

	}

}

module.exports = SRTPsession;