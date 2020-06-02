const { readBit, readBits } = require('./utils');
const { decode, encode, createDecode, types: { array, uint8, uint16be, string, uint32be } } = require('binary-data');
const { payloadTypes } = require('./constants.js');

function decodeMessage(message){
	let firstByte = message.readUInt8(0);
	let type = message.readUInt8(1);
	const length = message.readUInt16BE(2);
	const SSRC = message.readUInt32BE(4);
	console.log(message);
	const rtcp = {
		reportCount: readBits(firstByte, [3, 4, 5, 6, 7]),
		type,
		length,
		SSRC
	}

	switch (type){

		case payloadTypes.SR:
			rtcp.NTP = message.slice(8, 16);
			console.log(rtcp.NTP.readUInt32BE(0));

			rtcp.timestamp = message.readUInt32BE(16);
			rtcp.senderPackets = message.readUInt32BE(20);
			rtcp.senderSize = message.readUInt32BE(24);
			break;

		case payloadTypes.RR:	
			if(rtcp.reportCount === 0)
				break;
			rtcp.SSRC1 = message.readUInt32BE(8);
			rtcp.lost = message.readUInt8(12);
			rtcp.highestSequence = message.readUInt32BE(16);
			rtcp.jitter = message.readUInt32BE(20);
			break;

		case payloadTypes.SDES: 

			const rstream = createDecode(message.slice(8, (length+1)*4));
			rtcp.items = [];

			const cname = decode(rstream, uint8);
			if(cname < 8){
				const name = decode(rstream, string(uint8));
				rtcp.items.push({ cname, name });
			}else{
				const length = decode(rstream, uint8);
				rtcp.items.push({ cname, length });
			}
			break;

		default: rtcp.buffer = message.slice(8, ((length+1)*4)); break;
	
	}



	//console.log("version: ", readBits(type, [0, 1]));
	//console.log("padding: ",readBit(type, 2));

	return rtcp;
}

function decodeRTCP(message){
	let pos = 0;
	let buffer = message;
	const arr = [];
	while(pos < message.length){
		const mes = decodeMessage(buffer);
		pos += (mes.length+1)*4;
		buffer = message.slice(pos);
		arr.push(mes);
	}
	return arr;
}

module.exports = decodeRTCP;