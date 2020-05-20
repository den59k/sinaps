const dgram = require('dgram');
const chalk = require('chalk');
const stun = require ('stun');
const {decodeDTLS} = require('./dtls/decode-dtls.js');
const udpSocket = dgram.createSocket('udp4');

udpSocket.on('error', function(err) {
	console.error(err);
});

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

const ipsMap = new Map();
const colors = ['yellow', 'cyan', 'orange'];
let indexColor = 0;


const stunOn = true;
const dtlsOn = true;
const rtcOn = true;

let send = false;
setTimeout(() => {
	send = true;
},2000);

udpSocket.on('message', function(udpMessage, rinfo) {
	const key = rinfo.address+':'+rinfo.port;
	if(!ipsMap.has(key)){
		ipsMap.set(key, colors[indexColor++]);
	}
	console.log(chalk.keyword(ipsMap.get(key))(`Получено: ${udpMessage.length} байт от ${key}`));

	const flag = udpMessage.readUInt8(0);

	if(flag >> 6 === 0){

		console.log(flag);
		if(flag < 20){		//Значт, это STUN сообщение

			console.log("Это STUN Сообщение");
			if(stunOn){
				const stunMessage = stun.decode(udpMessage);
				if(stunMessage.type === stun.constants.STUN_BINDING_REQUEST && ipsMap.get(key) === 'yellow'){
					console.log("DO NOT SEND");
				}
				console.log(stunMessage);
			}
		}else{

			console.log("Это DTLS сообщение");
			if(dtlsOn){
				let arr = decodeDTLS(udpMessage);

				for(let layer of arr){
					console.log(layer);
					if(layer.fragment && layer.fragment.body){
						console.log(layer.fragment.body);
					}

					if(layer.fragment && layer.fragment.border){
						//udpMessage = udpMessage.slice(0, layer.fragment.border);
						//console.log("SLICED TO ", layer.fragment.border);
					}
				}
			}

		}

	}else{
		let type = udpMessage.readUInt8(0);
		let payload = udpMessage.readUInt8(1);
		let sequence = udpMessage.readUInt16BE(2);
		let timestamp = udpMessage.readUInt32BE(4);
		let SSRC = udpMessage.readUInt32BE(8);

		let CSRCcount = readBits(type, [4, 5, 6, 7]);
		let extensionFlag = readBit(type, 3);
		if(!send)
			return;

		if(payload !== 200 && payload !== 201){
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

	ipsMap.forEach((_col, _key) => {
		if(_key !== key){
			const ip = _key.split(':');
			udpSocket.send(udpMessage, ip[1], ip[0]);
			console.log(chalk.keyword(_col)(`Отправлено в ${ip[0]} : ${ip[1]}`));
		}
	});

});


udpSocket.on('listening', function() {
	const address = udpSocket.address();
	console.log(`server listening ${address.address}:${address.port}`);
});

udpSocket.bind({
  address: '192.168.1.101',
  port: 3478,
  exclusive: true
})