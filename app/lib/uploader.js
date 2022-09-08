/* uploader.js */
const util = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const base64Img = require('base64-img');
const exec = require('child_process').exec;

const {pipeline} = require('stream');
const {promisify} = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const getFiles = async function(dir) {
	const subdirs = await readdir(dir);
	const files = await Promise.all(subdirs.map(async (subdir) => {
		const res = resolve(dir, subdir);
		return (await stat(res)).isDirectory() ? getFiles(res) : res;
	}));
	return files.reduce((a, f) => a.concat(f), []);
}

const DWLD = process.env.USRUPLOAD_PATH;
const USRUPLOAD_DIR = process.env.USRUPLOAD_DIR;
const currentDir = __dirname;
const parentDir = path.normalize(currentDir + '/..');
const usrUploadDir = path.join(__dirname, '../../', USRUPLOAD_DIR);

const maxUploadSize = 900000000;
const archiveMaxUploadSize = 9000000000;

const upload = multer({
  dest: usrUploadDir,
  limits: {fileSize: 100000000}
});

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, usrUploadDir);
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  },
});
/*
const importer = multer({
  storage: storage,
  limits: {fileSize: maxUploadSize}
}).single('bestand');
*/
const tempDicomDir = usrUploadDir + '/temp';
const usrZipDir = path.join(__dirname, '../../', process.env.USRARCHIVE_DIR);
const importer = multer({dest: tempDicomDir, limits: {fileSize: maxUploadSize}});
const transferZipper = multer({dest: usrZipDir, limits: {fileSize: archiveMaxUploadSize}});

const parseStr = function (str) {
  var args = [].slice.call(arguments, 1),
      i = 0;
  return str.replace(/%s/g, () => args[i++]);
}

const genUniqueID = function () {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return s4() + s4() + '-' + s4();
}

const runcommand = function (command) {
	return new Promise(function(resolve, reject) {
		exec(command, (error, stdout, stderr) => {
			if(error === null) {
				resolve(`${stdout}`);
			} else {
				reject(`${stderr}`);
			}
    });
	});
}

module.exports = function (app) {

	app.post('/uploadpatienthistory', upload.array('patienthistory'), function(req, res) {
		//const token = req.cookies[process.env.COOKIE_NAME].token;
		//console.log('token from cookie', token);

		const rootname = req.originalUrl.split('/')[1];

		var filename = req.files[0].originalname;
		var fullnames = filename.split('.');

		var newFileName = genUniqueID() + '.' + fullnames[1];
		var imgPath = req.files[0].destination + '/' + req.files[0].filename;
		var newPath = req.files[0].destination + '/'  + newFileName;
		var readStream = fs.createReadStream(imgPath);
		var writeStream = fs.createWriteStream(newPath);
		readStream.pipe(writeStream);

		var command = parseStr(' rm %s', imgPath);
		runcommand(command).then((stdout) => {
			//var link = 'http://' + req.headers.host + '/' + rootname + '/res' + DWLD + '/' + newFileName;
			var link =  DWLD + '/' + newFileName;
			res.status(200).send({status: {code: 200}, text: 'ok uploadpatienthistory.', link: link});

		}).catch((err) => {
			console.log('err: 500 >>', err);
      res.status(500).send({status: {code: 500}, error: ree});
		});
	});

	app.post('/scannerupload', function(req, res) {
  	const rootname = req.originalUrl.split('/')[1];
		var body = req.body;
		var newFileName = genUniqueID() + '.jpg';
		var newPath = usrUploadDir + '/'  + newFileName;
	  var base64Data = body.image.replace(/^data:image\/jpeg;base64,/,"");
		fs.writeFile(newPath, base64Data, 'base64', function(err) {
			if (err) {
				res.status(500).send({status: {code: 500}, text: 'Write File Error =>', error: err});
			} else {
				var link =  DWLD + '/' + newFileName;
				res.status(200).send({status: {code: 200}, text: 'ok scannerupload.', link: link});
				}
		});
	});

	app.post('/captureupload', upload.array('picture'), function(req, res) {

		var filename = req.files[0].originalname;
		var fullnames = filename.split('.');

		var newFileName = genUniqueID() + '.jpg';
		var imgPath = req.files[0].destination + '/' + req.files[0].filename;
		var newPath = req.files[0].destination + '/'  + newFileName;
		var readStream = fs.createReadStream(imgPath);
		var writeStream = fs.createWriteStream(newPath);
		readStream.pipe(writeStream);

		var command = parseStr('rm %s', imgPath);
		runcommand(command).then(async (stdout) => {
      await runcommand(parseStr('mogrify -format jpg %s', newPath));
			var link =  DWLD + '/' + newFileName;
      res.status(200).send({status: {code: 200}, text: 'ok captureupload.', link: link});
		}).catch((err) => {
			console.log('err: 500 >>', err);
			res.status(500).send({status: {code: 500}, error: err});
		});
	});

  app.post('/portal/archiveupload', importer.single('archiveupload'), function(req, res) {
		var filename = req.file.originalname;
		info.log('originalname=> ' + req.file.originalname);
		var fullnames = filename.split('.');
		var newFileName = genUniqueID() + '.zip';
		var archivePath = req.file.destination + '/' + req.file.filename;
		var newPath = req.file.destination + '/'  + newFileName;
		var readStream = fs.createReadStream(archivePath);
		var writeStream = fs.createWriteStream(newPath);
		readStream.pipe(writeStream);

		var command = parseStr('rm %s', archivePath);
		runcommand(command).then((stdout) => {
			var link =  DWLD + '/' + newFileName;

      res.status(200).send({status: {code: 200}, text: 'ok archive upload.', link: link, file: newFileName});

		}).catch((err) => {
			console.log('err: 500 >>', err);
			res.status(500).send({status: {code: 500}, error: err});
		});
	});

  //app.post('/portal/dicomfileupload', importer.array('archiveupload'), function(req, res) {
  app.post('/portal/dicomfileupload', importer.array('files[]'), function(req, res) {
    var uploadFiles = req.files;
    var fileLinks = [];
    var	promiseList = new Promise(async function(resolve2, reject2){
      await uploadFiles.forEach(async (file, i) => {
        var filename = file.originalname;
    		var fullnames = filename.split('.');
    		var newFileName = genUniqueID() + '.dcm';
    		var archivePath = file.destination + '/' + file.filename;
    		var newPath = file.destination + '/'  + newFileName;
    		var readStream = fs.createReadStream(archivePath);
    		var writeStream = fs.createWriteStream(newPath);
    		await readStream.pipe(writeStream);
        await runcommand('rm ' + file.destination + '/' + file.filename);
        var link =  DWLD + '/temp/' + newFileName;
        fileLinks.push(link);
      });
      setTimeout(()=>{
        resolve2(fileLinks);
      }, 550);
    });
    Promise.all([promiseList]).then((ob)=>{
      res.status(200).send({status: {code: 200}, links: ob[0]});
    });
  });

  app.post('/pricechart/upload', importer.single('pricechart'), function(req, res) {
		var filename = req.file.originalname;
		var fullnames = filename.split('.');
		var newFileName = genUniqueID() + '.xlsx';
		var archivePath = req.file.destination + '/' + req.file.filename;
		var newPath = req.file.destination + '/'  + newFileName;
		var readStream = fs.createReadStream(archivePath);
		var writeStream = fs.createWriteStream(newPath);
		readStream.pipe(writeStream);

	    setTimeout(async()=>{
      var XLSX = require('xlsx');
      var workbook = XLSX.readFile(newPath);
      var sheet_name_list = workbook.SheetNames;
      var xlData = await XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
      res.status(200).send({status: {code: 200}, pricecharts: xlData});
  		var command = parseStr('rm %s & rm %s', archivePath, newPath);
  		runcommand(command);
    }, 3000);
	});

	app.post('/transfer/archive', transferZipper.single('archiveupload'), function(req, res) {
		var filename = req.file.originalname;
		var archivePath = req.file.destination + '/' + req.file.filename;
		var newPath = req.file.destination + '/'  + filename;
		/*
		console.log('originalname=> ' + req.file.originalname);
		console.log('destination=> ' + req.file.destination);
		console.log('archivePath=>' + archivePath);
		console.log('newPath=>' + newPath);
		*/
		var readStream = fs.createReadStream(archivePath);
		var writeStream = fs.createWriteStream(newPath);
		readStream.pipe(writeStream);
		setTimeout(async()=>{
			var command = parseStr('rm %s', archivePath);
			//console.log(command);
			let out = await runcommand(command);
			res.status(200).send({status: {code: 200}, archive: {name: req.file.originalname, link: process.env.USRARCHIVE_PATH + '/' + req.file.originalname}});
		}, 1000);
	});

  app.post('/usr/upload/share/list', function(req, res) {
    let usrShareDir = usrUploadDir + '/share';
    fs.readdir(usrShareDir, (err, files) => {
      res.status(200).send(files);
    });
  });

  app.post('/usr/upload/series/(:seriesId)', function(req, res) {
    let seriesId = req.params.seriesId;
    let usrSeriesDir = usrUploadDir + '/' + seriesId;
    fs.readdir(usrSeriesDir, (err, files) => {
      res.status(200).send(files);
    });
  });

  app.post('/action/counter/read/view', function(req, res) {
    let seriesId = req.body.seriesId;
    let contentId = req.body.contentId;
    let actionCounterJson = require('./mod/actioncounter.json');
    if (seriesId) {
      let seriesTarget = actionCounterJson.find((item)=>{
        if (item.id === seriesId) return item;
      });
      if (seriesTarget){
        if (contentId){
          let contentTarget = seriesTarget.contents.find((item)=>{
            if (item.id === contentId) return item;
          });
          if (contentTarget){
            let result = contentTarget.counter;
            res.status(200).send({status: {code: 200}, result: result});
          } else {
            res.status(200).send({status: {code: 200}, result: {view: 0, like: 0, share: 0, download: 0}});
          }
        } else {
          let result = seriesTarget.counter;
          res.status(200).send({status: {code: 200}, result: result});
        }
      } else {
        res.status(200).send({status: {code: 200}, result: {view: 0, like: 0, share: 0}});
      }
    } else {
      res.status(200).send({status: {code: 200}, result: actionCounterJson});
    }
  });

  app.post('/action/counter/update/view', function(req, res) {
    let seriesId = req.body.seriesId;
    let contentId = req.body.contentId;
    let actioncounterFile = currentDir + '/mod/actioncounter.json';
    let actionCounterJson = require(actioncounterFile);
    if (seriesId) {
      let seriesTarget = actionCounterJson.find((item)=>{
        if (item.id === seriesId) return item;
      });
      if (contentId) {
        if (seriesTarget){
          let contentTarget = seriesTarget.contents.find((item)=>{
            if (item.id === contentId) return item;
          });
          if (contentTarget){
            let oldValue = contentTarget.counter.view;
            contentTarget.counter.view = parseInt(oldValue) + 1;
          } else {
            let newContent = {id: contentId, counter: {view: 1, like: 0, share: 0, download: 0}};
            seriesTarget.contents.push(newContent);
          }
        }
      } else {
        if (seriesTarget){
          let oldValue = seriesTarget.counter.view;
          seriesTarget.counter.view = parseInt(oldValue) + 1;
        } else {
          let newSeries = {id: seriesId, counter: {view: 1, like: 0, share: 0}, contents: []};
          actionCounterJson.push(newSeries);
        }
      }
      fs.writeFile(actioncounterFile, JSON.stringify(actionCounterJson), (err)=>{
        if (err) {
          res.status(500).send({status: {code: 500}, error: err});
        } else {
          res.status(200).send({status: {code: 200}});
        }
      });
    } else {
      res.status(200).send({status: {code: 200}});
    }
  });

  app.post('/shareupload/(:target)', upload.array('picture'), function(req, res) {
    var folderTarget = req.params.target;
    var galleryName = undefined;
    if (folderTarget) {
      galleryName = folderTarget;
    } else {
      galleryName = 'share';
    }
    //console.log('folderTarget=>' + folderTarget);
		var newFileName = genUniqueID() + '.jpg';
		var imgPath = req.files[0].destination + '/' + req.files[0].filename;
		var newPath = req.files[0].destination + '/' + galleryName + '/'  + newFileName;
		var readStream = fs.createReadStream(imgPath);
		var writeStream = fs.createWriteStream(newPath);
		readStream.pipe(writeStream);

    var shareDir = newPath;
    //console.log(shareDir);
		var command = parseStr('rm %s', imgPath);
		runcommand(command).then((stdout) => {
			var link =  DWLD + '/' + galleryName + '/' + newFileName;

      res.status(200).send({status: {code: 200}, text: 'ok shareupload.', link: link});

		}).catch((err) => {
			console.log('err: 500 >>', err);
			res.status(500).send({status: {code: 500}, error: err});
		});
	});

  app.post('/log/upload', upload.single('log'), function(req, res) {
    console.log('data >>' + JSON.stringify(req.body));
    console.log('file >>' + JSON.stringify(req.file));
    var newFileName = genUniqueID() + '.log';

		var filename = req.file.originalname;
		var fullnames = filename.split('.');
		var newFileName = genUniqueID() + '.log';
		var archivePath = req.file.destination + '/' + req.file.filename;
		var newPath = req.file.destination + '/'  + newFileName;
		var readStream = fs.createReadStream(archivePath);
		var writeStream = fs.createWriteStream(newPath);
		readStream.pipe(writeStream);

    let dwnLink = DWLD + '/' + newFileName;
    console.log('dwnLink >>' + dwnLink);
    setTimeout(()=>{
      //res.status(200).send({status: {code: 200}, log: {link: dwnLink}});
      res.json({status: {code: 200}, log: {link: dwnLink}});
  		var command = parseStr('rm %s', archivePath);
  		runcommand(command);
    }, 2100);
	});

	return {
		genUniqueID,
		parseStr,
		runcommand
	}

}
