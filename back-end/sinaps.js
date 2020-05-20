const https = require('https')
const http = require('http')
const chalk = require('chalk')
const fs = require('fs')
const WebSocket = require('ws');
const serve = require('serve-static')
const bodyParser = require('body-parser')
const cors = require('cors')

const ip = 'localhost'
const port = 80
const isHTTPS = false;


const server = isHTTPS?https.createServer({
	key: fs.readFileSync('./certs/ec_key.pem'),
	cert: fs.readFileSync('./certs/cert.pem')
}):http.createServer();

const app = require('restana')( { server } );
app.use(cors());

app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
	res.setHeader('Access-Control-Allow-Headers', 'origin, X-Requested-With, Content-Type, Authorization');
	next();
});
app.use(bodyParser.json());

const wss = new WebSocket.Server( { server } );

//session отвечает за авторизацию и хранение токенов и за все-все-все
const _session = require('./node_components/server-session.js');
const session = new _session(app, wss);

app.use(serve(__dirname + '/public'));

app.start(port, ip).then((server) => {
	console.log(`Сервер запущен на ${chalk.cyan(ip+':'+port)}`);
});


