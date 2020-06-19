const dgram = require('dgram');
const chalk = require('chalk');
const stun = require ('stun');
const sdpParse = require('sdp-transform').parse;
const myStun = require('../../stun/my-stun.js');
const RoomSender = require('./Room-sender.js');
const RoomReceiver = require('./Room-receiver.js');

class Room{
	constructor(room, session, port, sdp){
		this.name = room.name;
		this.link = room.link;
		this.binding = room.binding;
		///users у нас находятся по _id
		this.users = new Map();
		//сокеты у нас находятся по токену
		this.sockets = new Map();
		this.port = port;
		this.sdp = sdp;
		 	//1111111111 - хз, 2043278322 - проритет

		this.udpSocket = dgram.createSocket('udp4');

		this.udpSocket.on('listening', () => {
			const address = this.udpSocket.address();
			console.log(`UDP сокеты установлены на ${address.address}:${address.port}`);
		});

		this.udpSocket.bind({
	  	address: session.ip,
			port,
			exclusive: true
		});

		this.udpSocket.on('message', this.getMessage);

		console.log(`Комната ${chalk.yellow(this.link)} создана`);

		this.senders = new Map();
		this.receivers = new Map();
		this.candidates = new Map();
		this.session = session;
	}

	getIce(ufrag){
		return {
			candidate: `a=candidate:1111111111 1 udp 2043278322 ${this.session.publicIP} ${this.port} typ host`,
			sdpMid: 0, 
			usernameFragment: ufrag }
	}

	getSenders(){
		const arr = [];
		for(let sender of this.senders.values())
			arr.push({
				user: this.session.tokens.get(sender.token).profile,
				constraints: sender.constraints,
				offer: { type: 'offer', sdp: sender.sdp }, 
				ice: this.getIce(sender.ufrag)
			});
		return arr;
	}

	getMessage = (udpMessage, rinfo) => {
		const key = rinfo.address+':'+rinfo.port;
		//console.log(`Получено: ${udpMessage.length} байт от ${key}`);
		const flag = udpMessage.readUInt8(0);

		const suser = (this.senders.has(key))?
			this.session.tokens.get(this.senders.get(key).token):null;

		if(flag >> 6 === 0){
			if(flag < 20){
				const stunMessage = stun.decode(udpMessage);

				console.log(stunMessage);

				const username = stunMessage.getUsername();
				//Если там нет поля с username - это сообщение нас не интересует
				if(!username)
					return;

				const ufrag = username.split(':', 2)[1];

				if(this.candidates.has(ufrag)){
					const candidate = this.candidates.get(ufrag);

					console.log("Это STUN Сообщение от "+candidate.type+ ' '+candidate.login);

					if(stunMessage.type === stun.constants.STUN_BINDING_REQUEST){

						const response = myStun.response(
							stunMessage, 
							{ pwd:  ((candidate.type === 'send')?this.sdp.pwd: candidate.sender.pwd) }, 
							rinfo.address, 
							rinfo.port
						);

						this.udpSocket.send(response, rinfo.port, rinfo.address);
						console.log("ОТПРАВЛЕН ОТВЕТ");
					}

					if(this.senders.has(key) || this.receivers.has(key))
						return;

					const request = myStun.request(stunMessage, {
						iceUfrag: candidate.ufrag, 
						icePwd: candidate.pwd, 
						ufrag: ((candidate.type === 'send')?this.sdp.ufrag: candidate.sender.ufrag)
					});

					this.udpSocket.send(request, rinfo.port, rinfo.address);

					//Нуу, здесь все просто, если кандидат найден - запоминаем его, собственно :D
					if(candidate.type === 'send')
						this.senders.set(key, candidate);
					else
						this.receivers.set(key, candidate);

					candidate.addEndpoint(rinfo);
					//this.candidates.delete(ufrag);

				}
			}else{
				if(suser !== null)
					console.log(`Это ${chalk.cyan("DTLS")} сообщение от ${
						chalk.green(suser.profile.login)
					}`);
				if(this.senders.has(key))
					this.senders.get(key).pushDTLS(udpMessage);

				if(this.receivers.has(key))
					this.receivers.get(key).pushDTLS(udpMessage);
				
			}
		}else{
			if(this.senders.has(key))
				this.senders.get(key).pushSRTP(udpMessage);

			if(this.receivers.has(key))
				this.receivers.get(key).pushSRTP(udpMessage);
		}
	}

	//Мы записываем потенциального кандидата, 
	//который хочет начать видеосвязь
	createConnection(m, user, ws ){
		if(!this.session.tokens.has(m.token) || !this.sockets.has(m.token)){
			console.error('error token');
			return;
		}

		for(let sender of this.senders.values())
			if(sender.login === user.profile.login){
				ws.send(JSON.stringify({
					type: "room-error",
					data: {
						error: 'ExistLogin'
					}
				}));
				return;
			}
		const sdpInfo = sdpParse(m.answer.sdp);

		if(ws.candidates === undefined)
			ws.candidates = [];

		const candidate = new RoomSender(this, sdpInfo, m.token);

		ws.candidates.push(candidate);

		candidate.once('start-send', this.senderConnected);
		candidate.once('close', this.senderClose);
		this.candidates.set(candidate.ufrag, candidate);
	}

	//При подключении, мы должны отправить всем сообщение, что юзер начинает видеопоток
	senderConnected = (sender)  => {
		console.log(this.session.tokens.get(sender.token).profile.login + ' начал видеосвязь');
		this.sockets.forEach((socket, token) => {
			if(token !== sender.token)
				socket.send(JSON.stringify({
					type: 'add-sender',
					data: {
						user: this.session.tokens.get(sender.token).profile,
						offer: { type: 'offer', sdp: sender.sdp }, 
						constraints: sender.constraints,
						ice: this.getIce(sender.ufrag)
					}
				}));
		})
	}

	senderClose = (login) => {
		console.log("SENDER CLOSED!");
		this.sockets.forEach((socket, token) => {
			socket.send(JSON.stringify({
				type: 'close-sender',
				data: {
					login
				}
			}));
		});
	}

	createReceive(m, user, ws ){
		const sdpInfo = sdpParse(m.answer.sdp);
		let _sender = null;
		for(let sender of this.senders.values())
			if(m.sender === sender.login){
				_sender = sender;
				break;
			}
		if(_sender === null)
			return;

		console.log('Пытаюсь получить поток от ' + m.sender);
		if(ws.candidates === undefined)
			ws.candidates = [];

		const candidate = new RoomReceiver(this, _sender, sdpInfo, m.token);

		ws.candidates.push(candidate);

		this.candidates.set(sdpInfo.media[0].iceUfrag, candidate);
	}

	addUserSocket(token, suser){
		const idstr = suser._id.toHexString();

		if(!this.users.has(idstr))
			this.updateUserCount(this.users.size+1);
		
		this.sockets.set(token, suser.sockets.get(token));
		suser.sockets.get(token).room = this;
		
		if(!this.users.has(idstr)){
			this.users.set(idstr, suser);
			console.log(suser.profile.login + ' присоединился к комнате ' +this.link);
		}
	}

	updateUserCount(count){
		for(let socket of this.sockets.values())
			socket.send(JSON.stringify({
				type: 'update-user-count',
				data: {
					userCount: count
				}
			}));
	}

	existOnRoom (user){
		for(let token of user.sockets.keys())
			if(this.sockets.has(token))
				return true;

		return false;
	}

	//Вызывается в тот момент, когда юзер выходит из комнаты
	deleteUserSocket(token, suser){
		if(this.sockets.has(token)){
			if(this.sockets.get(token).candidates){
				for(let candidate of this.sockets.get(token).candidates){
					console.log("DELETE "+candidate.key);
					candidate.close();
					this.candidates.delete(candidate.ufrag);
					this.senders.delete(candidate.key);
					this.receivers.delete(candidate.key);
				}
				delete this.sockets.get(token).candidates;
			}
			this.sockets.delete(token);
		}

		if(!this.existOnRoom(suser)){
			const idstr = suser._id.toHexString();
			this.users.delete(idstr);
			this.updateUserCount(this.users.size);
			console.log(suser.profile.login + ' вышел из комнаты ' +this.link);
		}
	}
}

module.exports = Room;