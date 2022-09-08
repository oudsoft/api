/*
 * Copyright (C) 2017 Jason Henderson
 *
 * This software may be modified and distributed under the terms
 * of the MIT license.  See the LICENSE file for details.
 */

const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file = __dirname + '/..' + '/log/log.log';
log.info('inside child express process...');

/**
 * Module dependencies.
 */
require('dotenv').config();
const os = require('os');
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const mainApp = express();

mainApp.use(express.json({limit: '900mb', extended: true, parameterLimit: 50000}));
mainApp.use(bodyParser.urlencoded({ limit: '900mb', extended: true, parameterLimit: 50000 }));

const debug = require('debug')('config:server');
const http = require('http');
const https = require('https');
const privateKey = fs.readFileSync(__dirname + '/key.pem', 'utf8');
const certificate = fs.readFileSync(__dirname + '/key.crt', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const ALLOW_ORIGIN = ['http://localhost:3000', 'https://localhost:4443', 'https://radconnext.tech'];

const controlOrigin = (req, res, next) => {
	let origin = req.headers.origin;
	//log.info('who? = ' + origin)
  if (ALLOW_ORIGIN.includes(origin)) {
		//log.info(origin + '==> yes!!')
    res.header('Access-Control-Allow-Origin', origin);
		res.header('Access-Control-Allow-Methods','HEAD', 'POST, GET, PUT, PATCH, DELETE, OPTIONS');
	  res.header('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Option, Authorization, Accept');
		res.header("Access-Control-Allow-Credentials", true);
		res.header('Access-Control-Expose-Headers', 'agreementrequired');
  } else {
		//log.info(origin + '==> no!!')
	}
  return next()
}

//mainApp.use(controlOrigin);

let httpsServer = null;
//let webSocketServer = null;

/**
 * Get port from environment and store in Express.
 */

// Port 4332 is currently unassigned and not widely used
// We will use it as a default HTTP channel
log.info('process.env.SERVER_PORT => ' + process.env.SERVER_PORT);
var port = normalizePort(process.env.SERVER_PORT || '3000');
mainApp.set('port', port);
mainApp.use('/', controlOrigin, express.static(__dirname + '/../public'));
mainApp.use('/shop', controlOrigin, express.static(__dirname + '/../shop'));
//mainApp.use('/orthanc', proxy('http://119.59.98.111:9044/stone-webviewer/index.html?study=1.2.840.113619.2.417.3.279715333.534.1631324932.178'));
/**
 * Create HTTP server.
 */


httpsServer = https.createServer(credentials, mainApp);
httpsServer.listen(port);
httpsServer.on('error', onError);
httpsServer.on('listening', onListening);

//httpServer = http.createServer( mainApp ).listen(3033);

//webSocketServer = require(__dirname + '/../app/lib/websocket.js')(httpsServer, log);
//const {api, db} = require(__dirname + '/../app/api.js')(webSocketServer, log);
const {api, db, shopdb, taskCase, whomtask, voipTask, webSocketServer} = require(__dirname + '/../app/api.js')(httpsServer, log);
const app = require(__dirname + '/../app/app.js')(webSocketServer, log);
mainApp.use('/api', controlOrigin, api);
mainApp.use('/app', controlOrigin, app);

const login = require(__dirname + '/../app/db/rest/login.js')(db, log);
const shopLogin = require(__dirname + '/../app/db/rest/shop/login.js')(shopdb, log);

mainApp.use('/api/login', controlOrigin, login);
mainApp.use('/api/shop/login', controlOrigin, shopLogin);

const reCaseTaskApp = require(__dirname + '/../app/lib/re-casetasks.js')( taskCase, whomtask, voipTask, db, log, webSocketServer);
reCaseTaskApp.doRun().then((alives)=>{
	log.info('alives=>' + JSON.stringify(alives));
});

const reReadyStateTaskApp = require(__dirname + '/../app/lib/re-readystatetasks.js')( db, log, webSocketServer);
reReadyStateTaskApp.doRun().then((result)=>{
	log.info('updateReadyState Result => ' + JSON.stringify(result));
});

//const util = require(__dirname + '/../app/lib/mod/util.js')(log);
//mainApp.use('/app', app);
mainApp.get('/', (req, res) => {
  const hostname = req.headers.host;
	const rootname = req.originalUrl.split('/')[1];
  log.info('hostname = ' + hostname);
  log.info('rootname = ' + rootname);
  log.info('METHODE = ' + req.method);
})

mainApp.get('/sse/events', sseEventsHandler);
mainApp.post('/sse/fact', sseAddFact);
/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    	case 'EACCES':
     	  log.error(bind + ' requires elevated privileges');
     	  process.exit(1);
      break;
    	case 'EADDRINUSE':
     	  log.error(bind + ' is already in use');
      	process.exit(1);
      break;
    	default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = httpsServer.address();
  var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

/*
Call all hospital rootUri
*/
function doGetAllRootApp() {
	return new Promise(function(resolve, reject) {
		const pool = require('../app/db/dbpool.js').getPool();
		//let hoses = await tempDB.hospitals.findAll({ attributes: ['id', 'Hos_RootPathUri'], raw: true });
		pool.connect().then(client => {
			client.query('BEGIN');
			var sqlCmd = 'select "id", "Hos_Name", "Hos_RootPathUri" from "hospitals"';
			client.query(sqlCmd, []).then(res => {
				if (res.rowCount > 0){
					client.query('COMMIT');
					resolve(res.rows);
				} else {
					resolve({});
				}
			}).catch(err => {
				client.query('ROLLBACK');
				reject(err.stack)
			});
			client.release();
		});
	});
}

/*
SSE Service
*/
let clients = [];
let facts = [];

function sseEventsHandler(request, response, next) {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  response.writeHead(200, headers);

  const data = `data: ${JSON.stringify(facts)}\n\n`;

  response.write(data);

  const clientId = Date.now();

  const newClient = {
    id: clientId,
    response
  };

  clients.push(newClient);

  request.on('close', () => {
    //console.log(`${clientId} Connection closed`);
    clients = clients.filter(client => client.id !== clientId);
  });
}

function sseSendEventsToAll(newFact) {
  clients.forEach((client) => {
		console.log('client=>' + client.id);
		client.response.write(`data: ${JSON.stringify(newFact)}\n\n`)
	})
}

async function sseAddFact(request, respsonse, next) {
  const newFact = request.body;
	console.log('newFact=>' + JSON.stringify(newFact));
  facts.push(newFact);
  respsonse.json(newFact)
  return sseSendEventsToAll(newFact);
}
