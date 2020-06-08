const EventEmitter = require('events')
const sdpWrite = require('sdp-transform').write;
const SRTPSession = require('../../srtp/srtp-session.js');
const {decodeDTLS, decodeHandshake} = require('../../dtls/decode-dtls.js');
const DTLSServion = require('../../dtls/dtls-servion.js');

class RoomSender extends EventEmitter {

	constructor(room, sdp, token){
		super();
		this.ufrag = sdp.media[0].iceUfrag;
		this.pwd = sdp.media[0].icePwd;
		//this.sha256 = sdp.fingerprint.hash;
		this.token = token;
		this.login = room.session.tokens.get(token).profile.login;
		this.room = room;
		///SRTP сессия, которая декодирует SRTP и SRTCP пакеты
		this.SRTP = null;

		this.sended = false;

		sdp.fingerprint = room.sdp.sdpObject.fingerprint;
		for(let media of sdp.media){
			media.setup = 'actpass'
			delete media.fingerprint;
		}

		this.sdp = sdpWrite(sdp);
		this.type = 'send';

		this.queryToSend = [null, null];

		this.constraints = { audio: false, video: false };

		for(let media of sdp.media){
			console.log(media);
			if(media.direction !== 'inactive' && media.setup === 'actpass'){
				if(media.type === 'video')
					this.constraints.video = true;
				if(media.type === 'audio')
					this.constraints.audio = true;
			}
		}


	}
	addEndpoint(rinfo){
		this.address = rinfo.address;
		this.port = rinfo.port;
		
		this.key = this.address+":"+this.port;
		this.servion = new DTLSServion((b) => this.room.udpSocket.send(b, this.port, this.address));
	}

	pushDTLS(udpMessage){
		let arr;
		try{
			arr = decodeDTLS(udpMessage);
		}catch(e){
			console.log(e);
			return;
		}

		for(let layer of arr){

			if(layer.encoded){
				let _decrypted = this.servion.decrypt(layer.record);
				if(layer.type === 'HANDSHAKE'){
					let decrypted = decodeHandshake(_decrypted);

					this.servion.addMessageCheckQueue(_decrypted);

					 if(decrypted.type === 'FINISHED'){
						this.servion.sendFinish();
						this.sended = true;
						this.emit('start-send', (this));
					}
				}else{
					console.log("MESSAGE: ", _decrypted);
				}

				//console.log("MY HASH: ", servion.getHashHandshakeMessages('client finished'));
			}else if(layer.type === 'HANDSHAKE'){
				this.servion.addMessageCheckQueue(layer.record.fragment);

				if(layer.fragment && layer.fragment.body){
					const body = layer.fragment.body;

					if(layer.fragment.type === 'CLIENT_HELLO'){
						this.servion.clientRandom = body.random;

						this.servion.sendHello();
					}

					if(layer.fragment.type === 'CLIENT_KEY_EXCHANGE'){
						this.servion.clientKey = body;

						this.servion.createCipher();

						if(this.SRTP === null)
							this.SRTP = new SRTPSession(this.servion.getRTCPkeys());

					}
				}
			}


		}
	}

	/*pictureLossIndication(packet){
		const message = [
			{
				reportCount: 1,
				type: 201,
				length: 7,
				SSRC: packet.SSRC,
				SSRC1: packet.buffer.readUInt32BE(0)
			},
			{
				reportCount: 1,
				type: 206,
				length: 2,
				SSRC: this.room.sdp.ssrcVideo,
				buffer: buffer
			}
		]
		const data = this.SRTP.encodeRTCP(message);
		this.room.udpSocket.send(data, this.port, this.address);
	}*/

	pushSRTP(udpMessage){
		this.servion.successSession();
		if(this.SRTP === null) return;
		
		const data = this.SRTP.decode(udpMessage);
		if(data)
			this.emit('data', data);
	}

	sendQuery(type){
		if(this.queryToSend[type].message !== null)
			this.room.udpSocket.send(this.queryToSend[type].message, this.port, this.address);

		this.queryToSend[type] = null;
		console.log("ОТПРАВЛЕН RTCP ПАКЕТ ОТПРАВИТЕЛЮ");
	}
	
	feedbackRTCP(type, message){
		if(this.queryToSend[type] !== null && this.queryToSend[type].message !== null)
			return;

		const data = this.SRTP.encodeRTCP(message);

		if(this.queryToSend[type] === null){
			this.room.udpSocket.send(data, this.port, this.address);
			console.log("ОТПРАВЛЕН RTCP ПАКЕТ ОТПРАВИТЕЛЮ");
			this.queryToSend[type] = { message: null };
			setTimeout(() => this.sendQuery(type), 500);
		}else{
			this.queryToSend[type] = {message: data};
		}
	}

	close(){
		this.emit('close', this.login);
	}

}

module.exports = RoomSender;