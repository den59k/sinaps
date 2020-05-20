const crypto = require('crypto')
const {nanoid} = require('nanoid')
const getRawBody = require('raw-body')
const _fs = require('fs');
const fs = _fs.promises;

function createProfileSettings(session){

	const app = session.app;
	const users = session.users;
	const usersDB = session.usersDB;
	const public = './public';

	app.post('/upload-profile-image', async (req, res) => {

	try{
		if(!req.headers.token || !session.hasUser(req.headers.token))
			throw 'error autorization';

		if(!req.headers['full-image'] || !req.headers['mini-image'] || 
			Number(req.headers['content-length']) !== Number(req.headers['full-image'])+Number(req.headers['mini-image']))
			throw 'error sizing';

		const buffer = await getRawBody(req, { length: req.headers['content-length'], limit: '500kb'});

		const now = new Date();		//Пишем только в каталог с текущей датой, чтобы потом не запутаться нам
		const path = '/bd/avatars/'+now.getFullYear()+now.getMonth()+now.getDate();

		if(!_fs.existsSync(public+path)) await fs.mkdir(public+path);
		const name = nanoid(15);
		const fullImagePath = path+'/'+name+'.jpg';
		const miniImagePath = path+'/'+name+'-mini'+'.jpg';

		await fs.writeFile(public+fullImagePath, buffer.slice(0, req.headers['full-image']));
		await fs.writeFile(public+miniImagePath, buffer.slice(req.headers['full-image']));
		//await fs.writeFile(public+filePath, buffer);

		await usersDB.updateOne({_id: users.get(req.headers.token)._id}, {$set: {icon: miniImagePath, fullIcon: fullImagePath}});
		const {icon, fullIcon} = users.get(req.headers.token).profile;

		if(icon && _fs.existsSync(public+icon)) await fs.unlink(public+icon);
		if(fullIcon && _fs.existsSync(public+fullIcon)) await fs.unlink(public+fullIcon);

		users.get(req.headers.token).profile.icon = miniImagePath;
		users.get(req.headers.token).profile.fullIcon = fullImagePath;

		res.send({fullIcon: fullImagePath, icon: miniImagePath });
	}catch(e){
		console.log(e);
		res.send({error: e}, 500);
	}
	});

}

module.exports = createProfileSettings;