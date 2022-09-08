const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file = __dirname + '/../..' + '/log/wsclientlog.log';
log.info('Start WS Proxy...');

const webSocketClient = require('websocket').client;

const client = new webSocketClient();

client.on('connectFailed', function(error) {
  log.info('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
  connection.on('error', function(error) {
    log.error("WebSocket Client Connection Error: " + error.toString());
  });

  connection.on('close', function() {

  });

  connection.on('message', async function(message) {
    log.info('message => ' + message)
  });
});

client.connect('wss://radconnext.me/ws');
