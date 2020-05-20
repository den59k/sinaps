const crypto = require('crypto')
const {nanoid} = require('nanoid')
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

		this.users = new Map();
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
				ws.close(4190, 'not autorized');
			}, 5000);
			ws.on('message', text => {

				let message = JSON.parse(text);

				if(message.type === 'auth'){
					clearTimeout(timeoutDrop);
					if(!message.token || !this.users.has(message.token)){
						ws.close(4010, 'wrong token');
						return;
					}
					this.users.get(message.token).socket = ws;
					console.log(message.token);
				}

			});
		});
	}

	loginUser(user){
		const token = nanoid(4);
		const _user = { token,
			profile: { name: user.name, surname: user.surname, icon: user.icon, fullIcon: user.fullIcon, login: user.login }};

		const userInfo = Object.assign({}, _user);

		_user._id = user._id;
		this.users.set(token, _user);

		return userInfo;
	}

	hasUser = token => this.users.has(token);

	existLink = async (link) => {
		let exist = await this.usersDB.find({login: link}, {limit: 1, projection: {_id: 1}}).count();
		let exist2 = await this.groupsDB.find({link}, {limit: 1, projection: {_id: 1}}).count();

		return (exist !== 0 || exist2 !== 0);
	}
}

module.exports = ServerSession;