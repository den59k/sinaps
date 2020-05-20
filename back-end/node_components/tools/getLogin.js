const translit = require('cyrillic-to-translit-js')()

async function getLogin(name, surname){

	login = translit.transform((name).toLowerCase(), '-');

	let exist = await usersDB.findOne({login});

	if(exist === null)
		return login;

	login = login+translit.transform((surname).toLowerCase(), '-');

	exist = await usersDB.findOne({login});

	if(exist === null)
		return login;

	for(let i = 0; i < 20; i++){
		let _login = login+i;
		exist = await usersDB.findOne({login: _login});

		if(exist === null)
			return _login;
	}

	return null;
}

module.exports = getLogin;