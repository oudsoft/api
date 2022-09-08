/*import-worker.js*/
// This will run in forked processes
const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file = __dirname + '/../../..' + '/log/import-log.log';

const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

const runcommand = function (command) {
	return new Promise(function(resolve, reject) {
		log.info("Exec Command=>" + command);
		exec(command, (error, stdout, stderr) => {
			if(error === null) {
				resolve(`${stdout}`);
			} else {
				log.info('Error Exec => ' + error)
				reject(`${stderr}`);
			}
    });
  });
}

const doDownloadFile = function(url){
  return new Promise(async function(resolve, reject){
    const currentDir = __dirname;
    const publicDir = path.normalize(currentDir + '/../../../');
    const saveTarget = publicDir + 'public/img/usr/upload/temp';

    let urlPaths = url.split('/');
    let downloadFilename = urlPaths[urlPaths.length-1];
    let saveTo = saveTarget + '/' + downloadFilename;

    let pathFormat = url.split(' ').join('%20');
    let urlCallDownkoad = pathFormat;

		let downloadCommand = 'curl -k ' + urlCallDownkoad + ' -o ' + saveTo;
    /*
    const file = fs.createWriteStream(saveTo);
    const request = http.get(urlCallDownkoad + url, function(response) {
      response.pipe(file).on('close', function (evt) {
        log.info('test=>' + evt);
        resolve(evt);
      });
    });
    */
    runcommand(downloadCommand).then((stdout) => {
      //let studyObj = JSON.parse(stdout);
      resolve(stdout);
    });
  });
}

const doRun = function(input){
	return new Promise(async function(resolve, reject){
		log.info('data=>' + JSON.stringify(input));
		let evt = await doDownloadFile(input.download.link);
		resolve(evt);
	});
}

module.exports = (input, callback) => {
	return new Promise(async function(resolve, reject){
	  //{download: {link: downloadlink}};
	  let data = input;
		let evt = await doRun(data);
		log.info('=>' + evt);
	  callback(evt);
		resolve();
		//resolve(callback(evt));
	});
}
