const url = require('url');

function createMessageSystem(session){

	const app = session.app;
	const users = session.users;
	const usersDB = session.usersDB;
	const groupsDB = session.groupsDB;

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

				delete user._id;
				res.send({user});

			}
		}catch(e){
			console.log(e);
			res.send({error: e}, 500);
		}
	});

}

module.exports = createMessageSystem;