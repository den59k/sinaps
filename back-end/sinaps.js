const https = require('https')
const http = require('http')
const chalk = require('chalk')
const fs = require('fs')
const WebSocket = require('ws');
const serve = require('serve-static')
const bodyParser = require('body-parser')
const cors = require('cors')

const ip = '192.168.1.101'
const publicIP = '192.168.1.101'
const port = 80
const isHTTPS = false;


const server = isHTTPS?https.createServer({
	key: fs.readFileSync('./certs/ec_key.pem'),
	cert: fs.readFileSync('./certs/cert.pem')
}):http.createServer();

const app = require('restana')( { server } );
app.use(cors());

const html = fs.readFileSync('./public/index.html');
app.use((req, res, next) => {
	//Здесь мы чекнем, если у нас запрос на страницу, то вернем главную из кеша прям
	if(req.headers.token === undefined)
		if(req.url.indexOf('.') < 0){
			res.send(html);
			return;
		}
	next();
});

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
const session = new _session(app, wss, ip, publicIP);

app.use(serve(__dirname + '/public'));

app.start(port, ip).then((server) => {
	console.log(`Сервер запущен на ${chalk.cyan(ip+':'+port)}`);
});


