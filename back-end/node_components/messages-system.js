const url = require('url');
const qs = require('querystringify');
const {ObjectID} = require("mongodb");

function xor (a, b) {
  var length = Math.max(a.length, b.length)
  var buffer = Buffer.allocUnsafe(length)

  for (var i = 0; i < length; ++i) {
    buffer[i] = a[i] ^ b[i]
  }

  return buffer
}

function createMessageSystem(session){

	const app = session.app;
	const tokens = session.tokens;
	const usersDB = session.usersDB;
	const bindsDB = session.bindsDB;
	const groupsDB = session.groupsDB;
	const emitter = session.emitter;

	app.post('/write-message', async(req, res) => {
		try{
			if(!req.headers.token || !session.hasUser(req.headers.token))
				throw 'Ошибка авторизации';
			const stoken = req.headers.token;
			const suser = tokens.get(stoken);

			if(!req.body.bind || !req.body.text)
				throw 'Ошибка запроса';

			const link = req.body.bind;
			if(link === suser.profile.login)
				throw 'self';

			const message = { text: req.body.text, timestamp: Date.now(), user: suser._id, index: 0 }

			const _message = { text: message.text, bind: link, timestamp: message.timestamp, user: suser.profile };

			const bindQuery = await createBindQuery(suser, link);

			if(bindQuery === null)
				throw 'not exist';

			let bind = await bindsDB.findOne(bindQuery, {
				projection: {_id: 1, users: 1, messageCount: 1}
			});

			if(bind === null){
				bind = { 
					users: bindQuery.users, 
					isGroup: false, 
					timestamp: message.timestamp, 
					messages: [message],
					messageCount: 1
				}
				await bindsDB.insertOne(bind);
			}else{

				message.index = bind.messageCount;

				await bindsDB.updateOne(
					{_id: bind._id}, 
					{ 
						$set: { timestamp: message.timestamp },
						$push: { messages: message },
						$inc: { messageCount: 1 }
				 	})

				bind.messageCount++;
			}

			_message.index = message.index;

			//Здесь мы отправляем сообщения всем юзерам в сети
			for(let id of bind.users){
				const idstr = id.toHexString();
				if(bindQuery.isGroup || id.equals(suser._id))
					_message.bind = link;
				else
					_message.bind = suser.profile.login;

				if(session.users.has(idstr)){
					session.users.get(idstr).sockets.forEach((socket, token) => {
						if(token !== stoken)
							socket.send(JSON.stringify({type: 'message', data: _message}));
						
					});
				}
			}

			await readMessages(suser, bind);

			res.send({message});

		}catch(e){
			console.log(e);
			res.send({error: e}, 500);
		}
	});

	const createBindQuery = async (suser, link) => {
		const group = await groupsDB.findOne({link}, {projection: {binding: 1}});

		if(group !== null){
			return { _id:group.binding, isGroup: true};

		}else{

			const user = await usersDB.findOne(
				{ login: link }, 
				{ projection: { _id: 1 } }
			);

			if(user === null)
					return null;

			const ids = (suser._id < user._id) ? [suser._id, user._id] : [user._id, suser._id];

			return {users: ids, isGroup: false};
		}
	}

	app.get('/get-bind/:bind', async (req, res) => {
		try{
			if(!req.params.bind)
				throw('Неправильный запрос');

			if(!req.headers.token || !session.hasUser(req.headers.token))
				throw 'Ошибка авторизации';

			const query = qs.parse(req._parsedUrl.query);
			let limit = query.limit?parseInt(query.limit):0;
			limit = Math.max(Math.min(limit, 100), 0);

			let last = query.last?parseInt(query.last):0;
			last = Math.max(last, 0);

			const suser = tokens.get(req.headers.token);

			const bind = req.params.bind;

			if(bind === suser.profile.login)
				throw 'self';

			const bindQuery = await createBindQuery(suser, bind);

			if(bindQuery === null)
				throw 'not exist';

			//const group = await groupsDB.findOne({link: bind});

			//const user = await usersDB.findOne({login: bind}, {projection: {login: 1, name: 1, surname: 1, icon: 1}});

			let skip = 0;

			if(last === 0)
				skip = -limit
			else{
				skip = last-limit;
				if(skip < 0){
					limit += skip;
					skip = 0;
				}
			}

			const binding = await bindsDB.findOne(bindQuery, {
				projection: {
					timestamp: 0, 
					users: 0, 
					messages: limit > 0?({ $slice: [skip, limit] }):0
				}
			});

			let messages = [];
			let messageCount = 0;

			if(binding && binding.messages){
				await readMessages(suser, binding);
				messages = binding.messages;
				messageCount = binding.messageCount;
			}

			for(let el of messages){
				el.user = await session.getUser(el.user);
			}
			
			const bindResponse = {
				link: bind,
				isGroup: bindQuery.isGroup,
				messages, 
				messageCount,
				readed: limit>1?messageCount:messageCount-1,
			}


			if(bindQuery.isGroup){
				const group = await groupsDB.findOne(
					{ link: bind }, 
					{ projection: {_id: 0, name: 1, icon: 1} });
				bindResponse.name = group.name;
				bindResponse.icon = group.icon;
			}else{
				//Вытащим id из bindQuery, чтобы найти юзера по ид
				const _id = bindQuery.users[0].equals(suser._id)?bindQuery.users[1]:bindQuery.users[0]
				const user = await session.getUser(_id);
				bindResponse.name = user.name+" "+user.surname;
				bindResponse.icon = user.icon;
				bindResponse.online = user.online;
			}

			res.send(bindResponse);

		}catch(e){
			console.log(e);
			res.send({error: e}, 500);
		}
	});

	emitter.on('readed', async (message, user) => {
		if(!message.bind || !message.readed)
			return;
		const bindQuery = await createBindQuery(user, message.bind);
		if(bindQuery === null) return;
		const bind = await bindsDB.findOne(bindQuery, {
			projection: {_id: 1, messageCount: 1}
		}); 
		if(bind === null) return;
		readMessages(user, bind);
	});

	const readMessages = async (suser, bind) => {
		const t = await usersDB.updateOne(
			{_id: suser._id, "bindings._id": bind._id}, 
			{ $set: {"bindings.$.readed": bind.messageCount } }
		);
		if(t.matchedCount === 0)
			await usersDB.updateOne(
				{_id: suser._id}, 
				{ $push: { bindings: { _id: bind._id, readed: bind.messageCount }} });
	}

	app.get('/get-binds', async(req, res) => {
		try{
			if(!req.headers.token || !session.hasUser(req.headers.token))
				throw 'Ошибка авторизации';

			const suser = tokens.get(req.headers.token);

			const binds = await bindsDB.find({users: suser._id}, {
				projection: {messages: { $slice: -1 }, timestamp: 0, users: 0},
				sort: {timestamp: -1},
				limit: 20
			}).toArray();

			for(let bind of binds){

				const mes = await usersDB.findOne(
					{_id: suser._id, "bindings._id": bind._id}, 
					{ projection: {"bindings.$": 1 } }
				);
				if(mes === null)
					bind.readed = 0;
				else
					bind.readed = mes.bindings[0].readed;


				if(bind.isGroup){
					const group = await groupsDB.findOne({binding: bind._id}, {projection: {_id: 0}});

					bind.link = group.link;
					bind.icon = group.icon;
					bind.name = group.name;
				}else{
					const b = await bindsDB.findOne({_id: bind._id}, {projection: {_id: 0, users: 1}});

					for(let i = 0; i < b.users.length; i++)
						if(!b.users[i].equals(suser._id)){

							const user = await session.getUser(b.users[i]);
							bind.link = user.login;
							bind.name = user.name+" "+user.surname;
							bind.icon = user.icon;
							bind.online = user.online
						}

				}

				if(bind.messages.length > 0)
					bind.messages[0].user = await usersDB.findOne({_id: bind.messages[0].user}, 
						{ projection: {_id: 0, name: 1, surname: 1, login: 1, icon: 1} });

				delete bind._id;
			}

			res.send({binds});

		}catch(e){
			console.log(e);
			res.send({error: e}, 500);
		}
	});

}

module.exports = createMessageSystem;