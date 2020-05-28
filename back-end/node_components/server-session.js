const { nanoid } = require('nanoid')
const EventEmitter = require('events')
const createAuthSystem = require('./auth-system.js')
const createProfileSettings = require('./profile-settings.js')
const createGroupSystem = require('./groups-system.js')
const createMessageSystem = require('./messages-system.js')


//const mongoUrl = 'mongodb://admin:admin@localhost:27017/?authSource=sinaps-db';
const mongoUrl = 'mongodb://localhost:27017';


class ServerSession{
	constructor(app, wss){

		this.app = app;
		this.wss = wss;
		this.init();

		this.tokens = new Map();
		this.users = new Map();

		this.emitter = new EventEmitter();

		/*app.use((req, res, next) => {
			console.log(req.url);
			next();
		});*/
	}

	async init(){
		const connectDB = require('./db.js');
		this.db = await connectDB(mongoUrl, 'sinaps-db');
		this.usersDB = this.db.collection("users");
		this.bindsDB = this.db.collection('bindings');
		this.groupsDB = this.db.collection('groups');

		createAuthSystem(this);
		createProfileSettings(this);
		createGroupSystem(this);
		createMessageSystem(this);

		this.wss.on('connection', ws => {
			const timeoutDrop = setTimeout(() => {
				ws.close(4190, 'not authorized');
			}, 5000);
			ws.once('message', () => clearTimeout(timeoutDrop));

			ws.on('message', text => {
				let message = JSON.parse(text);
				//console.log(message);
				const token = message.token;

				if(!token || !this.tokens.has(token)){
					ws.close(4010, 'wrong token');
					return;
				}

				if(message.type === 'auth'){
					this.tokens.get(token).sockets.set(token, ws);
					//console.log("Токен авторизирован - "+token);
					ws.once('close', () => {
						const suser = this.tokens.get(token);
						suser.sockets.delete(token);

						//Удаляем токен после бездействия - он нам как-бы и не нужен
						setTimeout(() => {
							if(this.tokens.has(token)){
								this.tokens.delete(token)
								suser.tokenCount--;
								//console.log("Удален токен: "+token+'. Токенов: '+suser.tokenCount);
								this.checkUser(suser);
							}
						}, 2000);
					});
				}

				this.emitter.emit(message.type, message, this.tokens.get(token), ws);

			});
		});
	}

	//Вот здесь и происходит авторизация
	loginUser(user){
		const idstr = user._id.toHexString();
		if(!this.users.has(idstr)){
			this.users.set(idstr, {
				_id: user._id,
				sockets: new Map,
				tokenCount: 0,
				profile: { 
					name: user.name, 
					surname: user.surname, 
					icon: user.icon, 
					login: user.login,
					fullIcon: user.fullIcon, 
					unread: user.unread
				}
			})
			console.log(`Пользователь ${user.login} вошел на сайт. `+
				`Пользователей на сайте - ${this.users.size}`);
		}

		const _user = this.users.get(idstr);

		//Если мы хотели до этого удалить пользователя
		if(_user.timeout){
			clearTimeout(_user.timeout);
			delete _user.timeout;
		}

		const token = nanoid(8);
		this.tokens.set(token, _user);
		_user.tokenCount++;
		//console.log('Добавлен токен - '+token+'. Токенов: '+_user.tokenCount);

		//Здесь мы удаляем токен, если юзер не смог к нему приконектится по токену
		setTimeout(() => {
			if(this.tokens.has(token) && !_user.sockets.has(token)){
				this.tokens.delete(token);
				_user.tokenCount--;
				//console.log("Удален токен: "+token+'. Токенов: '+_user.tokenCount);
				this.checkUser(_user);
			}
		}, 2000);
		
		return { token, profile: _user.profile };
	}

	checkUser(suser){
		if(suser.tokenCount === 0){
			suser.timeout = setTimeout(() => {
				this.users.delete(suser._id.toHexString());
				console.log(`Пользователь ${suser.profile.login} покинул сайт. `+
					`Пользователей на сайте - ${this.users.size}`);
			}, 4000);
		}
	}

	hasUser (token) {
		return this.tokens.has(token);
	}

	async existLink(link) {
		let exist = await this.usersDB.find({login: link}, {limit: 1, projection: {_id: 1}}).count();
		let exist2 = await this.groupsDB.find({link}, {limit: 1, projection: {_id: 1}}).count();

		return (exist !== 0 || exist2 !== 0);
	}

	async getUser (_id){
		if(!_id)
			return null;
		const idstr = _id.toHexString();
		if(this.users.has(idstr)){
			const u = this.users.get(idstr).profile;
			return {online: true, login: u.login, name: u.name, surname: u.surname, icon: u.icon};
		}
		
		const u = await this.usersDB.findOne({_id}, 
			{projection: {_id: 0, login: 1, name: 1, surname: 1, icon: 1}});
		u.online = false;
		return u;
	}
}

module.exports = ServerSession;