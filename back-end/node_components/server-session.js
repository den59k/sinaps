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
					ws.once('close', () => {
						this.tokens.get(token).sockets.delete(token);

						setTimeout(() => {
							this.tokens.delete(token);
						}, 5000);
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
				profile: { 
					name: user.name, 
					surname: user.surname, 
					icon: user.icon, 
					fullIcon: user.fullIcon, 
					login: user.login,
					unread: user.unread
				}
			})
		}

		const _user = this.users.get(idstr);

		const token = nanoid(8);
		this.tokens.set(token, _user);

		setTimeout(() => {
			if(!_user.sockets.has(token))
				this.tokens.delete(token);
		}, 4000);
		
		return { token, profile: _user.profile };
	}

	hasUser = token => this.tokens.has(token);

	existLink = async (link) => {
		let exist = await this.usersDB.find({login: link}, {limit: 1, projection: {_id: 1}}).count();
		let exist2 = await this.groupsDB.find({link}, {limit: 1, projection: {_id: 1}}).count();

		return (exist !== 0 || exist2 !== 0);
	}
}

module.exports = ServerSession;