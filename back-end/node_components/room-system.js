const delay = (delay) => new Promise((res, rej) => {
	setTimeout(res, delay);
});

function createRoomSystem(session){

	const { app, tokens, usersDB, groupsDB, bindsDB, emitter } = session;
	const rooms = new Map();

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
				room.users = new Map();
				room.sockets = new Map();
				rooms.set(link, room);
			}

			room.sockets.set(req.headers.token, suser.sockets.get(req.headers.token));
			suser.sockets.get(req.headers.token).room = room;

			const idstr = suser._id.toHexString();
			if(!room.users.has(idstr)){
				room.users.set(idstr, suser);
				console.log(suser.profile.login + ' присоединился к комнате ' +room.link);
			}

			const messages = bind.messages;
			for(let el of messages){
				const idstr = el.user.toHexString();
				el.user = await session.getUser(el.user);
				el.user.online = room.users.has(idstr);
			}

			res.send({link: room.link, userCount: room.users.size, name: room.name, messages});

		}catch(e){
			e.url = req.url;
			console.log(e);
			res.send({error: e});
		}
	});

	const existOnRoom = (user, room) => {
		for(let token of user.sockets.keys())
			if(room.sockets.has(token))
				return true;

		return false;
	}

	const leaveUser = (token, suser, room) => {

		room.sockets.delete(token);
		if(!existOnRoom(tokens.get(token), room)){
			const idstr = suser._id.toHexString();
			room.users.delete(idstr);
			console.log(suser.profile.login + ' вышел из комнаты ' +room.link);
		}
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