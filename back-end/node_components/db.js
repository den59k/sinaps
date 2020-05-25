const chalk = require('chalk')
const {MongoClient} = require("mongodb");
const process = require('process');

module.exports = async (urlConnect, dbName) => {

	const mongoClient = new MongoClient(urlConnect, { useUnifiedTopology: true });

	const client = await mongoClient.connect();

	const db = client.db(dbName);

	console.log(chalk.green('Успешно ') +'подключено к ' + chalk.cyan(dbName));

	//Дальше мы инициализируем БД, если же она отсутствует у нас 
	const dbNames = await db.listCollections({}).map(e => e.name).toArray();
	if(!dbNames.includes('users')){
		const users = await db.createCollection('users');
		users.createIndex('login', {unique: true});
		users.createIndex('email', {unique: true});
		users.createIndex('bindings._id');
		console.log(`Collection ${chalk.cyan('users')} created`);
	}

	//bindings - связи между юзерами
	if(!dbNames.includes('bindings')){
		const bindings = await db.createCollection('bindings');
		bindings.createIndex({timestamp: -1});
		bindings.createIndex('users');
		bindings.createIndex('isGroup');
		console.log(`Collection ${chalk.cyan('bindings')} created`);
	}

	if(!dbNames.includes('groups')){
		const groups = await db.createCollection('groups');
		groups.createIndex('link', {unique: true});
		groups.createIndex('binding', {unique: true});
		
		console.log(`Collection ${chalk.cyan('groups')} created`);
	}

	return db;

};


