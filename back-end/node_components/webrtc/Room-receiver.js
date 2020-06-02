const EventEmitter = require('events')
const sdpWrite = require('sdp-transform').write;
const SRTPSession = require('../../srtp/srtp-session.js');
const {decodeDTLS, decodeHandshake} = require('../../dtls/decode-dtls.js');
const DTLSServion = require('../../dtls/dtls-servion.js');

const NTPday = new Date("1900-01-01");

class RoomReceiver extends EventEmitter{
	constructor(room, sender, sdp, token){
		super();
		this.ufrag = sdp.media[0].iceUfrag;
		this.pwd = sdp.media[0].icePwd;
		//this.sha256 = sdp.fingerprint.hash;
		this.token = token
		this.login = room.session.tokens.get(token).profile.login;

		this.room = room;
		///SRTP сессия, которая декодирует SRTP и SRTCP пакеты
		this.SRTP = null;

		this.sended = false;
		this.type = 'receive';
		this.sender = sender;

		this.receive = false;
	}

	addEndpoint(rinfo){
		this.address = rinfo.address;
		this.port = rinfo.port;

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

		console.log("Быстрый вывод: ");
		for(let layer of arr){
			console.log(layer);

			if(layer.encoded){
				let _decrypted = this.servion.decrypt(layer.record);
				if(layer.type === 'HANDSHAKE'){
					let decrypted = decodeHandshake(_decrypted);
					console.log(decrypted);

					this.servion.addMessageCheckQueue(_decrypted);

					 if(decrypted.type === 'FINISHED'){
						this.servion.sendFinish();
						if(!this.receive){
							this.emit('start-receive', (this));
							this.sender.on('data', this.receiveSRTP);
							this.receive = true;
						}
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

	receiveSRTP = (message) => {
		let data;
		if(message.RTP === true){
			data = this.SRTP.encodeRTP(message);	
			this.room.udpSocket.send(data, this.port, this.address);
			console.log("SENDED TO " + this.address + ':'+this.port);
		}else{
			data = this.SRTP.encodeRTCP(message);
			console.log(data);
			this.room.udpSocket.send(data, this.port, this.address);
			console.log("SENDED TO " + this.address + ':'+this.port);
		}
	}

	pushSRTP(udpMessage){
		if(this.SRTP === null) return;

		const data = this.SRTP.decode(udpMessage);

		if(data.RTP !== true)
			for(let packet of data)
				packet.SSRC = this.room.sdp.ssrcVideo;
			
		this.sender.feedbackRTCP(data);
	}

	///Метод, который возвращает временную метку NTP
	getNTP(){
		const date = Date.now()-NTPday;
		const buf = Buffer.alloc(8);

		buf.writeUInt32BE(Math.floor(date/1000), 0);
		//Здесь мы переводим дробную часть в fixed-point
		buf.writeUInt32BE(((date%1000)<<16)*65, 4);

		return buf;
	}


}

module.exports = RoomReceiver;