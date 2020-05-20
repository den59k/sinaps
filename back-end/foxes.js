const crypto = require('crypto');
const fs = require('fs');
const WebSocket = require('ws');
const {nanoid} = require('nanoid');
const dgram = require('dgram');
const chalk = require('chalk');
const stun = require ('stun');
const DTLSdecode = require('./dtls/decode-dtls.js');
const DTLSsession = require('./dtls/dtls-session.js');
const sdp = require('sdp-transform');
const udpSocket = dgram.createSocket('udp4');


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

				console.log(stunMessage);

				const response = stun.createMessage(
			        stun.constants.STUN_BINDING_RESPONSE,
			        stunMessage.transactionId
		      	);

		      	response.addAttribute(
					stun.constants.STUN_ATTR_XOR_MAPPED_ADDRESS,
					rinfo.address,
					rinfo.port
		      	);

		      	response.addMessageIntegrity(icePassword);
		      	response.addFingerprint();

		      	udpSocket.send(response.toBuffer(), rinfo.port, rinfo.address);

		      	console.log("STUN ответ отправлен");

				if(session === null){
/*
			      	const request = stun.createMessage(stun.constants.STUN_BINDING_REQUEST);

					const outuser = `${config.iceUfrag}:${iceUsername}`;
					request.addAttribute(stun.constants.STUN_ATTR_USERNAME, outuser);
					request.addAttribute(stun.constants.STUN_ATTR_USE_CANDIDATE);
					const tieBreaker = Buffer.from('ffaecc81e3dae860', 'hex');
					request.addAttribute(stun.constants.STUN_ATTR_ICE_CONTROLLED, tieBreaker);
					request.addAttribute(stun.constants.STUN_ATTR_PRIORITY, 2043278322);
					request.addMessageIntegrity(config.icePwd);
					request.addFingerprint();

					udpSocket.send(request.toBuffer(), rinfo.port, rinfo.address);

					console.log("STUN запрос отправлен");*/
					
					session = new DTLSsession((b) => udpSocket.send(b, rinfo.port, rinfo.address));

					session.Hello();
				}
			}
		}else{

			console.log("Это DTLS сообщение");
			if(dtlsOn){
				let arr = DTLSdecode(udpMessage, session.addMessageQueue);

				for(let layer of arr){
					console.log(layer);
					if(layer.fragment && layer.fragment.body){
						const body = layer.fragment.body;
						console.log(body);
						if(layer.fragment.type === 'SERVER_HELLO'){
							session.serverRandom = body.random;
							session.sessionId = body.sessionId;
							session.cipherSuite = body.cipherSuite;

							//Тут потом дополнишь еще данными
						}

						if(layer.fragment.type === 'SERVER_KEY_EXCHANGE'){
							session.serverKey = body[0].pubkey;

							//Тут еще можешь потом подпись чекнуть, хотя зачем тебе это...
						}
					}
				}

				session.Response();
			}

		}
	}
});



udpSocket.on('listening', function() {
	const address = udpSocket.address();
	console.log(`server listening ${address.address}:${address.port}`);
});

udpSocket.bind({
  address: '192.168.1.101',
  port: 3478,
  exclusive: true
});


//Все, что ниже - касается установки соединения SDP

iceUsername = crypto.randomBytes(2).toString('hex');
icePassword = crypto.randomBytes(11).toString('hex');
let config = {};

const certificate = fs.readFileSync('certs/cert.der');
const hash = crypto.createHash('sha256');
hash.write(certificate);
const hex = hash.digest('hex').toUpperCase();
let certFingerprint = '';

for(let i = 0; i < hex.length; i+=2){
	if(certFingerprint !== '')
		certFingerprint += ':'
	certFingerprint += hex.substr(i, 2);
}
console.log(certFingerprint);

const localSdp = {
	version: 0,
    origin: {
      username: 'den',
      sessionId: '3497579305088229251',
      sessionVersion: 2,
      netType: 'IN',
      ipVer: 4,
      address: '127.0.0.1',
    },
    fingerprint:{
    	type: 'sha-256',
    	hash: certFingerprint
    },

    name: '-',
    timing: { start: 0, stop: 0 },
    iceOptions: 'trickle',
    msidSemantic: {semantic: 'WMS', token: '*'}
}

const wss = new WebSocket.Server({host: '192.168.1.101', port: '80'});

wss.on('connection', function connection(ws) {

	ws.on('message', function incoming(text) {
		let message = JSON.parse(text);

		if(message.type === 'offer'){

			const offer = sdp.parse(message.offer.sdp);

			let { media, groups } = offer;

			config.iceUfrag = media[0].iceUfrag;
			config.icePwd = media[0].icePwd;

			const _sdp = localSdp;
			_sdp.groups = groups;

			for(let m of media){
				m.iceUfrag = iceUsername;
				m.icePwd = icePassword;
				let payload = 0;

				m.setup = 'active';
			}
			_sdp.media = media;

			const answer = {type: 'answer', sdp: sdp.write(_sdp)};

			ws.send(JSON.stringify({type: 'answer', answer}));
		}
	});

});
