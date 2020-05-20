const crypto = require('crypto');
const fs = require('fs');
const WebSocket = require('ws');
const {nanoid} = require('nanoid');
const dgram = require('dgram');
const chalk = require('chalk');
const stun = require ('stun');
const myStun = require('./stun/my-stun.js');
const udpSocket = dgram.createSocket('udp4');
const {decodeDTLS, decodeHandshake} = require('./dtls/decode-dtls.js');
const DTLSServion = require('./dtls/dtls-servion.js');
const decodeSRTP = require('./srtp/srtp-decode.js');
const SRTPSession = require('./srtp/srtp-session.js');

udpSocket.on('error', function(err) {
	console.error(err);
});

const ipsMap = new Map();
const colors = ['yellow', 'cyan', 'orange'];
let indexColor = 0;


const stunOn = true;
const dtlsOn = true;
const rtcOn = true;

let session = null;

let flagSended = false;

let servion = null;
let SRTP = null;

const { spawn } = require('child_process');
const process = require('process');

const ffplay = spawn('ffplay', ['-i', 'pipe:0']);

ffplay.stdout = process.stdout;


udpSocket.on('message', function(udpMessage, rinfo) {
	const key = rinfo.address+':'+rinfo.port;
	if(!ipsMap.has(key))
		ipsMap.set(key, colors[indexColor++]);

	console.log(chalk.keyword(ipsMap.get(key))(`Получено: ${udpMessage.length} байт от ${key}`));
	const flag = udpMessage.readUInt8(0);

	if(flag >> 6 === 0){
		if(flag < 20){		//Значт, это STUN сообщение
			console.log("Это STUN Сообщение");

			const stunMessage = stun.decode(udpMessage);

			console.log(stunMessage.getAttribute(stun.constants.STUN_ATTR_USERNAME));

			udpSocket.send(myStun.response(stunMessage, sdp, rinfo.address, rinfo.port), rinfo.port, rinfo.address);
			console.log("Ответ отправлен");

			if(flagSended){
				udpSocket.send(myStun.request(stunMessage, sdp), rinfo.port, rinfo.address);
				console.log("Запрос отправлен");
				
				flagSended = false;

				if(servion === null){
					servion = new DTLSServion((b) => udpSocket.send(b, rinfo.port, rinfo.address));
				}
			}

		}else{
			console.log("Это DTLS сообщение");

			let arr = decodeDTLS(udpMessage);
			console.log("Быстрый вывод: ");
			for(let layer of arr){
				console.log(layer);

				if(layer.encoded){
					let _decrypted = servion.decrypt(layer.record);
					if(layer.type === 'HANDSHAKE'){
						let decrypted = decodeHandshake(_decrypted);
						console.log(decrypted);

						servion.addMessageCheckQueue(_decrypted);

						 if(decrypted.type === 'FINISHED')
							servion.sendFinish();
					}else{
						console.log("MESSAGE: ", _decrypted);
					}

					//console.log("MY HASH: ", servion.getHashHandshakeMessages('client finished'));
				}else if(layer.type === 'HANDSHAKE'){
					servion.addMessageCheckQueue(layer.record.fragment);
				}

				if(layer.fragment && layer.fragment.body){
					const body = layer.fragment.body;
					console.log(body);

					if(layer.fragment.type === 'CLIENT_HELLO'){
						servion.clientRandom = body.random;

						servion.sendHello();
					}

					if(layer.fragment.type === 'CLIENT_KEY_EXCHANGE'){
						servion.clientKey = body;

						servion.createCipher();
						if(SRTP === null)
							SRTP = new SRTPSession(servion.getRTCPkeys());
					}
				}
			}

		}
	}else{
		const data = SRTP.decode(udpMessage);

		ffplay.stdin.write(data);
		console.log(data);
	}
});

udpSocket.on('listening', function() {
	const address = udpSocket.address();
	console.log(`server listening ${address.address}:${address.port}`);
});

udpSocket.bind({
  address: '192.168.1.101',
  port: 4000,
  exclusive: true
});

//Все, что ниже - касается только лишь подключения

const _sdp = require('./stun/my-sdp.js');
const sdp = new _sdp(fs.readFileSync('./certs/cert.der'));
const wss = new WebSocket.Server({host: '192.168.1.101', port: '80'});

//console.log(sdp.sdp);

const __sdp = require('sdp-transform');

wss.on('connection', function connection(ws) {

	ws.on('message', function incoming(text) {
		let message = JSON.parse(text);

		if(message.type === 'ready'){
			const offer = { type: 'offer', sdp: sdp.sdp };

			const ice = {
				candidate: 'a=candidate:1111111111 1 udp 2043278322 192.168.1.101 4000 typ host',
				sdpMid: 0, 
				usernameFragment: sdp.ufrag }

			ws.send(JSON.stringify({type: 'offer', offer, ice}));
		}

		if(message.type === 'answer'){
			const iceUfrag = /ice-ufrag:(\w+)/
			const icePass = /ice-pwd:([\w\/\+]+)/

			sdp.iceUfrag = iceUfrag.exec(message.answer.sdp)[1];
			sdp.icePwd = icePass.exec(message.answer.sdp)[1];

			flagSended = true;

			const sss = __sdp.parse(message.myoffer.sdp);

			console.log(__sdp.parse(message.answer.sdp));

			console.log(sss);
			
		}
	});

});