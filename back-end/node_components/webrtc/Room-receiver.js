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

					if(!this.servion.addMessageCheckQueue(_decrypted))
						return false;

					if(decrypted.type === 'FINISHED'){
						this.servion.sendFinish();
						if(!this.receive){
							this.emit('start-receive', (this));
							this.sender.on('data', this.receiveSRTP);
							this.sender.once('close', this.close);
							this.receive = true;
						}
					}
				}else{
					console.log("MESSAGE: ", _decrypted);
				}

				//console.log("MY HASH: ", servion.getHashHandshakeMessages('client finished'));
			}else if(layer.type === 'HANDSHAKE'){
				if(!this.servion.addMessageCheckQueue(layer.record.fragment))
					return false;

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
		this.servion.successSession();
		let data;
		if(message.RTP === true){
			data = this.SRTP.encodeRTP(message);	
			this.room.udpSocket.send(data, this.port, this.address);
			console.log("SENDED TO " + this.address + ':'+this.port);
		}else{
			return;
			data = this.SRTP.encodeRTCP(message);
			this.room.udpSocket.send(data, this.port, this.address);
			console.log("SENDED TO " + this.address + ':'+this.port);
		}
	}

	pushSRTP(udpMessage){
		if(this.SRTP === null) return;

		const data = this.SRTP.decode(udpMessage);

		if(data.RTP !== true){
			let type = -1;
			for(let packet of data){
				if(packet.type === 205 || packet.type === 206)
					type = packet.type-205;
/*				//https://tools.ietf.org/html/rfc4585#section-6.1
				if(packet.type === 206 && (packet.reportCount === 1 || packet.reportCount === 2)){
					this.sender.pictureLossIndication(packet);
				}
				if(packet.type === 205)
					this.sender.genericNASK(packet.buffer);*/
			}
			if(type >= 0)
				this.sender.feedbackRTCP(type, data);
		}
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

	close = () => {
		this.sender.off('data', this.receiveSRTP);
		this.sender.off('close', this.close);
	}

}

module.exports = RoomReceiver;