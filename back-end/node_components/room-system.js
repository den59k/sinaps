const _sdp = require('../stun/my-sdp.js');
const fs = require('fs')
const Room = require('./webrtc/Room.js');

const delay = (delay) => new Promise((res, rej) => {
	setTimeout(res, delay);
});

function createRoomSystem(session){

	const sdp = new _sdp(fs.readFileSync('./certs/cert.der'));

	const { app, tokens, usersDB, groupsDB, bindsDB, emitter } = session;
	const rooms = new Map();

	let currentPort = 4000;

	//Отправляется при подключении к комнате
	app.post('/join-room/:room', async(req, res) => {
		try{
			if(!req.params.room)
				throw('Неправильный запрос');

			if(!req.headers.token || !session.hasUser(req.headers.token))
				throw 'Ошибка авторизации';

			const suser = tokens.get(req.headers.token);

			//Это если юзер подсоединился сразу при обновлении страницы, 
			//и у него еще не загрузился сокет
			let _count = 0;
			while(!suser.sockets.has(req.headers.token) && _count < 4){
				await delay(300);
				_count++;
			}

			const link = req.params.room;

			let bind = null;
			let room = null;

			if(!rooms.has(link)){
				room = await groupsDB.findOne({link}, {projection: {binding: 1, name: 1, link: 1}});

				if(room === null)
					throw('Такой группы не существует');
			}else{
				room = rooms.get(link);
			}

			//Заодно получим последние сообщения группы, и проверим права доступа
			bind = await bindsDB.findOne({_id: room.binding, users: suser._id}, {
				projection: {messages: { $slice: -50 }}
			});

			if(bind === null)
				throw('not-allowed');

			if(!rooms.has(link)){
				room = new Room(room, session, currentPort, sdp);
				currentPort++;
				rooms.set(link, room);
			}

			room.addUserSocket(req.headers.token, suser);

			const messages = bind.messages;
			for(let el of messages){
				const idstr = el.user.toHexString();
				el.user = await session.getUser(el.user);
				el.user.online = room.users.has(idstr);
			}

			res.send({
				room: { 
					link: room.link, 
					userCount: room.users.size, 
					name: room.name 
				}, 
				messages,
				default: {
					offer: { type: 'offer', sdp: sdp.sdp},
					ice: room.getIce(sdp.ufrag)
				},
				senders: room.getSenders()
			});

		}catch(e){
			e.url = req.url;
			console.log(e);
			res.send({error: e});
		}
	});

	emitter.on('create-connection', (m, user, ws) => {
		if(!ws.room) return;

		ws.room.createConnection(m, user, ws);
	});

	emitter.on('create-receive', (m, user, ws) => {
		if(!ws.room) return;

		ws.room.createReceive(m, user, ws);
	});

	const leaveUser = (token, suser, room) => {
		room.deleteUserSocket(token, suser);
	}

	emitter.on('leave-room', (m, user, ws) => {
		if(!ws.room) return;
		leaveUser(m.token, user, ws.room);
		delete ws.room;
	});

	emitter.on('close', (m, user, ws) => {
		if(!ws.room) return;
		leaveUser(m.token, user, ws.room);
		delete ws.room;
	});
}

module.exports = createRoomSystem;