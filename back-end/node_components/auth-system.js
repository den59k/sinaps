const crypto = require('crypto')
const {nanoid} = require('nanoid')
const translit = require('cyrillic-to-translit-js')()

function createAuthSystem(session){
	const app = session.app;
	const usersDB = session.usersDB;
	const groupsDB = session.groupsDB;

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

	app.post('/authorization', (req, res) => {

		const {login, password} = req.body;
		if(!login || !password || login.length < 3 || password.length < 3 
			|| login.length > 30 || password.length > 50) res.send({errors: {login: "Ошибка", password: "Ошибка"}});

		const hash = crypto.createHash('sha1');
		hash.update(password + ' salting salt');
		const passHash = hash.digest('hex');

		//Дальше вот прям здесь идет проверка

		usersDB.findOne({email: req.body.login}).then(c => {
			if(c === null){
				res.send({errors: {login: "Нет такого пользователя"}});
				return;
			}

			if(c.password !== passHash){
				res.send({errors: {password: "Неверный пароль"}});
				return;
			}

			let success = session.loginUser(c);

			res.send({success});
		});
	});

	app.post('/registration', async (req, res) => {

		console.log(req.body);

		const exist = await usersDB.findOne({email: req.body.mail}, {projection: {bindings: 0}});
		
		if(exist !== null){
			res.send({errors: {mail: 'Данный адрес уже занят'}});
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
			bindings: []
		}

		const success = await usersDB.insertOne(user);

		console.log(`Пользователь ${user.login} успешно добавлен`);

		res.send({success: true});

	});

	app.post('/i-have-token', (req, res) => {
		if(req.body.token && session.users.has(req.body.token))
			res.send(session.users.get(req.body.token));
		else
			res.send({error: 'no'});
	});
}

module.exports = createAuthSystem;