function readBit(uint, pos){
	pos = 7 - pos;
	return (uint & (1 << pos)) >> pos;
}

function readBits(uint, arr){
	let sum = 0;
	for(let pos of arr){
		sum = sum << 1;
		sum = sum | readBit(uint, pos);
	}
	return sum;
}

function decode(udpMessage){
	let type = udpMessage.readUInt8(0);
	let payload = udpMessage.readUInt8(1);
	let sequence = udpMessage.readUInt16BE(2);
	let timestamp = udpMessage.readUInt32BE(4);
	let SSRC = udpMessage.readUInt32BE(8);

	let CSRCcount = readBits(type, [4, 5, 6, 7]);
	let extensionFlag = readBit(type, 3);

	if(payload !== 200 && payload !== 201 && payload !== 202){
		console.log("Это RTP сообщение");

		console.log("version: ", readBits(type, [0, 1]));
		console.log("padding: ",readBit(type, 2));
		console.log("extension: ", extensionFlag);
		console.log("CSRC count: ", CSRCcount);

		console.log("Marker: ", readBit(payload, 0));
		console.log('Payload-type: ', payload & ~(1 << 7));

		console.log('sequence-number: ', sequence);

		console.log('time-stamp: ', Math.floor(timestamp/1000));

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

		const data = udpMessage.slice(pos, udpMessage.length-10);
		console.log("DATA: ", data.length, data);

	}else{
		console.log("Это RTCP сообщение");

		console.log("version: ", readBits(type, [0, 1]));
		console.log("padding: ",readBit(type, 2));
		console.log('Report count: ', readBits(type, [3, 4, 5, 6, 7]));

		console.log('Packet type: ', payload);

		console.log('Length: ', sequence);

		console.log('SSRC: ', timestamp);
	}
}

module.exports = decode;