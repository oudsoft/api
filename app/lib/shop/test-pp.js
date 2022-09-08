/*test-pp.js*/
const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file = __dirname + '/../../..' + '/log/pp-qr-log.log';
log.info('inside child express process...');

const ppData = {
  ppaytype: '01',
  ppayno: '0835077746',
  netAmount: 4000,
  fname: 'ประเสริฐ',
  lname: 'สุดชดา',
}

let ppQRgen = require('./pp-qrcode.js')(log);

const doCreatePPQR = function(){
	return new Promise(async function(resolve, reject) {
    log.info('ppData --> ' + JSON.stringify(ppData));
		let qr = await ppQRgen.doCreatePPQRCode(ppData);
		resolve(qr);
	});
}

doCreatePPQR().then((res)=>{
  log.info('resulte file --> ' + JSON.stringify(res));
});
