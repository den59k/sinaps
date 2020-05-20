const reg = require('./tools/reg.js')
const translit = require('cyrillic-to-translit-js')()

function createGroupSystem(session){

	const app = session.app;
	const users = session.users;
	const usersDB = session.usersDB;
	const groupsDB = session.groupsDB;

	async function getLink(name){

		link = translit.transform((name).toLowerCase(), '-');

		if(!(await session.existLink(link)))
			return link;

		for(let i = 0; i < 20; i++){
			let _link = link+i;

			if(!(await session.existLink(_link)))
				return _link;
		}
		return null;
	}

	app.post('/create-new-group', async (req, res) => {
		try{
			if(!req.headers.token || !session.hasUser(req.headers.token))
				throw 'Ошибка авторизации';

			const user = users.get(req.headers.token);
			const name = req.body.name;
			if(reg.name.length > 30){
				res.send({errors: {name: "Слишком длинное название"}});
				return;
			}
			if(reg.name.length < 3){
				res.send({errors: {name: "Слишком короткое название"}});
				return;
			}
			if(!reg.name.test(name)){
				res.send({errors: {name: "Использованы недопустимые символы"}});
				return;
			}

			const link = await getLink(name);

			if(link === null){
				res.send({errors: {name: "Выберите другое название"}});
				return;
			}

			const date = Date.now();
			const private = (req.body.type === 'private');
			const group = {
				name,
				link,
				userCount: 1,
				admin: user._id,
				users: [user._id],
				messages: [],
				timestamp: date,
				creationDate: date,
				private,
				group: true
			}

			const success = await groupsDB.insertOne(group);

			console.log(`Группа ${group.link} успешно создана`);

			res.send({success: {name: group.name, link: group.link}});

		}catch(e){
			console.log(e);
			res.send({error: e}, 500);
		}
	});

	async function findAdmin(myGroups){
		for(let gr of myGroups)
			if(gr.admin){
				try{
					gr.admin = await usersDB.findOne({_id: gr.admin}, {projection: {login: 1, name: 1, surname: 1, _id: 0}});
				}catch(e){
					gr.admin = null;
				}
			}
	}

	app.get('/get-groups', async (req, res) => {
		try{
			if(!req.headers.token || !session.hasUser(req.headers.token))
				throw 'Ошибка авторизации';

			const id = users.get(req.headers.token)._id;

			const myGroups = await groupsDB.find({users: id}, 
				{limit: 50, projection: {_id: 0, admin: 1, link: 1, name: 1, userCount:1}, sort: {userCount: -1}}).toArray();

			await findAdmin(myGroups);

			let otherGroups = [];

			if(myGroups.length < 50){
				otherGroups = await groupsDB.find({users: {$ne: id}}, 
					{
						limit: (50-myGroups.length), 
						projection: {_id: 0, admin: 1, link: 1, name: 1, userCount:1}, 
						sort: {userCount: -1}
					}).toArray();

				await findAdmin(otherGroups);
			}

			res.send({myGroups, otherGroups});
		}catch(e){
			console.log(e);
			res.send({error: e}, 500);
		}

	});

}


module.exports = createGroupSystem;