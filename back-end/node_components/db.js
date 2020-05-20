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
		users.createIndex('bindings');
		console.log(`Collection ${chalk.cyan('users')} created`);
	}

	if(!dbNames.includes('bindings')){
		const bindings = await db.createCollection('bindings');
		bindings.createIndex({timestamp: -1});
		console.log(`Collection ${chalk.cyan('bindings')} created`);
	}

	if(!dbNames.includes('groups')){
		const groups = await db.createCollection('groups');
		groups.createIndex({timestamp: -1});
		groups.createIndex('link', {unique: true});
		console.log(`Collection ${chalk.cyan('groups')} created`);
	}

	return db;

};


