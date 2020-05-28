const reg = require('./tools/reg.js')
const translit = require('cyrillic-to-translit-js')()

function createGroupSystem(session){

	const { app, tokens, usersDB, groupsDB, bindsDB } = session;

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

			const suser = tokens.get(req.headers.token);
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


			const now = Date.now();
			const private = (req.body.type === 'private');

			const binding = {
				users: [suser._id],
				timestamp: now,
				isGroup: true,
				messages: [{
					text: `${suser.profile.name} ${suser.profile.surname} создал группу ${name}`,
					type: 1,
					timestamp: now,
					user: suser._id,
					index: 0
				}],
				userCount: 1,
				private,
				messageCount: 1
			}

			const _binding = await bindsDB.insertOne(binding);

			const group = {
				name,
				binding: _binding.insertedId,
				link,
				admin: suser._id,
			}

			const success = await groupsDB.insertOne(group);

			console.log(`Группа ${group.link} успешно создана`);

			group.userCount = 1;
			group.admin = suser.profile;
			res.send(group);

		}catch(e){
			console.log(e);
			res.send({error: e}, 500);
		}
	});

	//Поиск группы по ссылке
	app.get('/get-group/:group', async(req, res) => {
		try{
			if(!req.params.group)
				throw('Неправильный запрос');

			if(!req.headers.token || !session.hasUser(req.headers.token))
				throw 'Ошибка авторизации';
			const suser = tokens.get(req.headers.token);
			const link = req.params.group;

			let group = await groupsDB.findOne({link}, {projection: {_id: 0}});

			if(group === null)
				throw 'Группа не существует';

			let binding = await bindsDB.findOne(
				{_id: group.binding, users: suser._id }, 
				{ projection: {_id: 0, userCount: 1, private: 1, users: {$slice: 6}} });

			if(binding !== null)
				group.my = true;
			else{
				group.my = false;
				binding = await bindsDB.findOne(
				{_id: group.binding, private: false}, 
				{ projection: {_id: 0, userCount: 1, private: 1, users: {$slice: 6}} });

				if(binding === null)
					binding = {close: true};
			}

			Object.assign(group, binding);

			if(group.users)
				for(let i = 0; i < group.users.length; i++)
					group.users[i] = await session.getUser(group.users[i]);

			group.admin = await session.getUser(group.admin);

			delete group.binding;

			res.send(group);
		}catch(e){
			e.url = req.url;
			console.log(e);
			res.send({error: e}, 500);
		}
	});

	app.post('/join-group', async(req, res) => {
		try{
			if(!req.headers.token || !session.hasUser(req.headers.token))
				throw 'Ошибка авторизации';

			if(!req.body.group)
				throw 'Ошибка запроса';

			const suser = tokens.get(req.headers.token);

			let group = await groupsDB.findOne(
				{ link: req.body.group }, 
				{ projection: {_id: 0, binding: 1, admin: 1, name: 1, link: 1 }}
			);

			if(group === null)
				throw 'Такой группы не существует';

			const t = await bindsDB.updateOne({
				_id: group.binding, 
				private: false, 
				users: {$ne: suser._id}
			}, {
				$push: { users: suser._id },
				$inc: { userCount: 1}
			});

			if(t.matchedCount === 0)
				throw 'Процесс вступления в группу отклонен';

			const userCount = await bindsDB.findOne(
				{_id: group.binding}, 
				{ projection: {_id: 0, userCount: 1 }}
			);

			group.admin = await session.getUser(group.admin);
			group.userCount = userCount.userCount;
			delete group.binding;

			res.send(group);
		}catch(e){
			e.url = req.url
			console.log(e);
			res.send({error: e}, 500);
		}
	});

	app.get('/get-groups', async (req, res) => {
		try{
			if(!req.headers.token || !session.hasUser(req.headers.token))
				throw 'Ошибка авторизации';

			const suser = tokens.get(req.headers.token);

			let _myGroups = await bindsDB.find(
				{ users: suser._id, isGroup: true }, 
				{ projection: { userCount: 1 }, limit: 40 }
			).toArray();

			let _otherGroups = await bindsDB.find(
				{ users: { $ne: suser._id }, isGroup: true, private: false }, 
				{ projection: { userCount: 1 }, limit: 40 }
			).toArray();
			
			async function getGroupByBind(bind){
				const group = await groupsDB.findOne({ binding: bind._id }, { projection: {_id: 0, binding: 0} });
				group.userCount = bind.userCount;
				if(group.admin)
					group.admin = await session.getUser(group.admin);

				return group;
			}

			const myGroups = [];
			for(let bind of _myGroups)
				myGroups.push(await getGroupByBind(bind));

			const otherGroups = [];
			for(let bind of _otherGroups)
				otherGroups.push(await getGroupByBind(bind));

			res.send({myGroups, otherGroups});
		}catch(e){
			e.url = req.url
			console.log(e);
			res.send({error: e}, 500);
		}

	});

}


module.exports = createGroupSystem;