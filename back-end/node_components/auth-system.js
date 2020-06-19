const crypto = require('crypto')
const {nanoid} = require('nanoid')
const translit = require('cyrillic-to-translit-js')()
const {email, name} = require('./tools/reg.js')
 
function createAuthSystem(session){
	const app = session.app;
	const usersDB = session.usersDB;
	const groupsDB = session.groupsDB;
	const bindsDB = session.bindsDB;

	async function getLogin(name, surname){

		login = translit.transform((name).toLowerCase(), '-');
		console.log(await session.existLink(login));
		if(!(await session.existLink(login)))
			return login;

		login = translit.transform((surname).toLowerCase(), '-');

		if(!(await session.existLink(login)))
			return login;

		for(let i = 0; i < 20; i++){
			let _login = login+i;
			if(!(await session.existLink(_login)))
				return _login;
		}

		return null;
	}

	app.post('/authorization', async (req, res) => {

		const {login, password} = req.body;
		if(!login || !password || login.length < 3 || password.length < 3 
			|| login.length > 30 || password.length > 50) 
			res.send({errors: {login: "Ошибка", password: "Ошибка"}});

		const hash = crypto.createHash('sha1');
		hash.update(password + ' salting salt');
		const passHash = hash.digest('hex');

		//Дальше вот прям здесь идет проверка

		const suser = await usersDB.findOne({email: req.body.login}, {projection: {bindings: 0}});
		if(suser === null){
			res.send({errors: {login: "Нет такого пользователя"}});
			return;
		}

		if(suser.password !== passHash){
			res.send({errors: {password: "Неверный пароль"}});
			return;
		}

		//Здесь мы еще хотим найти непрочитанные сообщения
		const binds = await bindsDB.find({users: suser._id}, {
			projection: { messageCount: 1 },
			sort: {timestamp: -1},
			limit: 50
		}).toArray();

		for(let bind of binds){

			const mes = await usersDB.findOne(
				{_id: suser._id, "bindings._id": bind._id}, 
				{
					projection: {"bindings.$": 1 }
				}
			);

			if(mes === null){
				
			}else{
				
			}
		}

		let success = session.loginUser(suser);

		res.send({success});

	});

	app.post('/registration', async (req, res) => {

		console.log(req.body);

		const exist = await usersDB.findOne({email: req.body.mail});
		
		if(exist !== null){
			res.send({errors: {mail: 'Данный адрес уже занят'}});
			return;
		}

		if(!name.test(req.body.name)){
			res.send({errors: {name: 'Поле "Имя" содержит недопустимые символы'}});
			return;
		}

		if(!name.test(req.body.surname)){
			res.send({errors: {name: 'Поле "Фамилия" содержит недопустимые символы'}});
			return;
		}

		let login = await getLogin(req.body.name, req.body.surname);

		if(login === null){
			res.send({errors: {name: 'Слишком популярные Имя и Фамилия'}});
			return;
		}


		const hash = crypto.createHash('sha1');
		hash.update(req.body.pass + ' salting salt');
		const passHash = hash.digest('hex');

		const user = {
			email: req.body.mail,
			login,
			password: passHash,
			name: req.body.name,
			surname: req.body.surname,
			bindings: [],
			unread: 0
		}

		const success = await usersDB.insertOne(user);

		console.log(`Пользователь ${user.login} успешно добавлен`);

		res.send({success: true});

	});

	app.post('/i-have-token', (req, res) => {

		if(req.body.token && session.tokens.has(req.body.token)){
			const user = session.loginUser(session.tokens.get(req.body.token));
			res.send(user);
		}
		else
			res.send({error: 'no'});
	});
}

module.exports = createAuthSystem;