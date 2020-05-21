const url = require('url');
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
	const users = session.users;
	const usersDB = session.usersDB;
	const bindsDB = session.bindsDB;
	const groupsDB = session.groupsDB;

	app.post('/write-message', async(req, res) => {
		try{
			if(!req.headers.token || !session.hasUser(req.headers.token))
				throw 'Ошибка авторизации';
			const suser = users.get(req.headers.token);

			if(!req.body.bind || !req.body.text)
				throw 'Ошибка запроса';

			const link = req.body.bind;
			if(link === suser.profile.login)
				throw 'self';

			const message = { text: req.body.text, timestamp: Date.now(), user: suser._id }

			const group = await groupsDB.findOne({link});

			if(group !== null){


				res.send({kek: 'group'});
			}else{
				const user = await usersDB.findOne({login: link}, {projection: {_id: 1}});

				if(user === null)
					throw 'not exist';

				const ids = (suser._id < user._id) ? [suser._id, user._id] : [user._id, suser._id];

				const bind = await bindsDB.findOne({ users: ids, isGroup: false}, {projection: {_id: 1}});

				if(bind === null){
					await bindsDB.insertOne({ users: ids, isGroup: false, timestamp: message.timestamp, messages: [message] })
				}else{
					await bindsDB.updateOne(
						{_id: bind._id}, 
						{ 
							$set: { timestamp: message.timestamp },
							$push: { messages: message }
					 	})
				}


				res.send({message});
			}
		}catch(e){
			res.send({error: e}, 500);
		}
	});

	app.get('/get-bind/:bind', async (req, res) => {
		try{
			if(!req.params.bind)
				throw('Неправильный запрос');

			if(!req.headers.token || !session.hasUser(req.headers.token))
				throw 'Ошибка авторизации';
			const suser = users.get(req.headers.token);

			const bind = req.params.bind;

			if(bind === suser.profile.login)
				throw 'self';

			const group = await groupsDB.findOne({link: bind});

			if(group !== null){


				res.send({kek: 'group'});
			}else{

				const user = await usersDB.findOne({login: bind}, {projection: {name: 1, surname: 1, icon: 1}});

				if(user === null)
					throw 'not exist';

				const ids = (suser._id < user._id) ? [suser._id, user._id] : [user._id, suser._id];

				const binding = await bindsDB.findOne({users: ids, isGroup: false}, {
					projection: {_id: 0, isGroup: 0, timestamp: 0, users: 0, messages: { $slice: -20 }}
				});

				let messages = (binding === null)? [] : binding.messages;

				for(let el of messages){
					const u = await usersDB.findOne({_id: el.user}, 
						{projection: {_id: 0, login: 1, name: 1, surname: 1, icon: 1}});
					el.user = u;
				}
				
				delete user._id;
				res.send({user, messages});

			}
		}catch(e){
			res.send({error: e}, 500);
		}
	});

	app.get('/get-binds', async(req, res) => {
		try{
			if(!req.headers.token || !session.hasUser(req.headers.token))
				throw 'Ошибка авторизации';

			const suser = users.get(req.headers.token);

			const binds = await bindsDB.find({users: suser._id}, {
				projection: {messages: { $slice: -1 }, timestamp: 0, users: 0},
				sort: {timestamp: -1},
				limit: 20
			}).toArray();
			for(let bind of binds){
				if(bind.isGroup){
					const group = await groupsDB.findOne({binding: bind._id}, {projection: {_id: 0}});

					bind.group = group;
				}else{
					const b = await bindsDB.findOne({_id: bind._id}, {projection: {_id: 0, users: 1}});

					for(let i = 0; i < b.users.length; i++)
						if(!b.users[i].equals(suser._id))
							bind.user = await usersDB.findOne({_id: b.users[i]}, 
							{	projection: {_id: 0, name: 1, surname: 1, login: 1, icon: 1} });

				}

				if(bind.messages.length > 0)
					bind.messages[0].user = await usersDB.findOne({_id: bind.messages[0].user}, 
						{ projection: {_id: 0, name: 1, login: 1} });

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