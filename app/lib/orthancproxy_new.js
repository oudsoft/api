/* orthancproxy.js */
//require('dotenv').config();
const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const archiver = require('archiver');
const unzip = require('unzip');
const fetch = require('node-fetch');
const exec = require('child_process').exec;
const express = require('express');
const app = express();

const { promisify } = require('util');
const { resolve } = require('path');
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

const cron = require('node-cron');

const userpass = process.env.ORTHANC_USER + ':' + process.env.ORTHANC_PASSWORD;
const currentDir = __dirname;
const publicDir = path.normalize(currentDir + '/../..');
const usrPreviewDir = publicDir + process.env.USRPREVIEW_DIR;
const usrArchiveDir = publicDir + process.env.USRARCHIVE_DIR;
const usrUploadDir = publicDir + process.env.USRUPLOAD_DIR;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

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

const formatStr = function (str) {
  var args = [].slice.call(arguments, 1),
    i = 0;
  return str.replace(/%s/g, () => args[i++]);
}

const zipDirectory = function(source, out) {
  const archive = archiver('zip', { zlib: { level: 9 }});
  const stream = fs.createWriteStream(out);

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on('error', err => reject(err))
      .pipe(stream);
    stream.on('close', () => resolve());
    archive.finalize();
  });
}

var db, Orthanc, log, auth, uti, lineApi, socket, aiCritiria, imageStamper;

app.post('/find', function(req, res) {
	let hospitalId = req.body.hospitalId;
	if (hospitalId) {
		let rqBody = req.body.body;
		uti.doLoadOrthancTarget(hospitalId, req.hostname).then((orthanc) => {
			let username = req.body.username;
			let method = req.body.method;
			let cloud = JSON.parse(orthanc.Orthanc_Cloud)
			let orthancUrl = 'http://' + cloud.ip + ':' + cloud.httpport;
      log.info('orthancUrl=> ' + orthancUrl);

			let rqParams = {
				method: method,
				auth:  {user: cloud.user, pass: cloud.pass},
				uri: orthancUrl + req.body.uri,
				body: JSON.parse(rqBody)
			}
			uti.proxyRequest(rqParams).then((proxyRes)=>{
        if (proxyRes.res.body) {
  				let orthancRes = JSON.parse(proxyRes.res.body);
  				res.status(200).send(orthancRes);
        } else {
          let orthancError = {error: 'Response from your orthanc with blank object'};
      		log.error('Request Orthanc Error =>' + orthancError.error);
          res.status(200).send({status: {code: 211}, error: orthancError.error});
        }
			});
		});
	} else {
		let orthancError = {error: 'Your hospitalId is incurrect. Please verify.'};
		log.error('Request Orthanc Error =>' + orthancError.error);
		res.status(500).send({status: {code: 500}, error: orthancError.error});
	}
});

app.get('/find', function(req, res) {
	let hospitalId = req.query.hospitalId;
	uti.doLoadOrthancTarget(hospitalId, req.hostname).then((orthanc) => {
		let username = req.query.username;
    let httpMethod = req.query.method;
		let cloud = JSON.parse(orthanc.Orthanc_Cloud)
		let orthancUrl = 'http://' + cloud.ip + ':' + cloud.httpport;
		var command = 'curl -X ' + httpMethod + ' --user ' + cloud.user + ':' + cloud.pass + ' -H "user:' + cloud.user + '" ' + orthancUrl + req.query.uri;
		log.info('Find Dicom with command >>', command);
		runcommand(command).then((stdout) => {
      log.info('Command output>>', stdout);
      if ((stdout) && (stdout !=='')){
  			let studyObj = JSON.parse(stdout);
  			res.status(200).send(studyObj);
      } else {
        res.status(200).send({error: {data: 'empty output'}});
      }
		});
	});
});

app.post('/preview/(:instanceID)', function(req, res) {
	let hospitalId = req.body.hospitalId;
	uti.doLoadOrthancTarget(hospitalId, req.hostname).then((orthanc) => {
		var instanceID = req.params.instanceID;
		var username = req.body.username;
		var previewFileName = instanceID + '.png';
		let cloud = JSON.parse(orthanc.Orthanc_Cloud);
		let orthancUrl = 'http://' + cloud.ip + ':' + cloud.httpport;
		var command = 'curl --user ' + cloud.user + ':' + cloud.pass + ' -H "user: ' + cloud.user + '" ' + orthancUrl + '/instances/' + instanceID + '/preview > ' + usrPreviewDir + '/' + previewFileName;
		log.info('Open Dicom preview with command >>', command);
		runcommand(command).then((stdout) => {
			//res.redirect('/' + rootname + USRPREVIEW_PATH + '/' + previewFileName);
			let link = process.env.USRPREVIEW_PATH + '/' + previewFileName;
			res.status(200).send({preview: {link: link}});
		});
	});
});

app.post('/create/preview', function(req, res) {
	let hospitalId = req.body.hospitalId;
	uti.doLoadOrthancTarget(hospitalId, req.hostname).then(async(orthanc) => {
		let cloud = JSON.parse(orthanc.Orthanc_Cloud);
		let orthancUrl = 'http://' + cloud.ip + ':' + cloud.httpport;
		let seriesId = req.body.seriesId;
		let username = req.body.username;
		let instanceList = req.body.instanceList;

		var command = formatStr('rm -rf %s/%s', usrPreviewDir, seriesId);
		var stdout = await runcommand(command);

		command = formatStr('mkdir %s/%s', usrPreviewDir, seriesId);
		stdout = await runcommand(command);

		command = formatStr('chmod 0777 %s/%s', usrPreviewDir, seriesId);
		stdout = await runcommand(command);

		var targetDir = usrPreviewDir + '/' + seriesId;
		var stdouts = [];
		let	promiseList = new Promise(async function(resolve2, reject2){
			instanceList.forEach(async(item, i) => {
				var targetFilename = item + '.png';
				command = formatStr('curl --user %s:%s -H "user: %s" %s/instances/%s/preview > %s/%s', cloud.user, cloud.pass, cloud.user, orthancUrl, item, targetDir, targetFilename);
				stdout = await runcommand(command);
				stdouts.push({id: item, result: stdout});
			});
			setTimeout(()=>{
				resolve2(stdouts);
			}, 500);
		});
		Promise.all([promiseList]).then((ob)=>{
			res.status(200).send({result: ob[0]});
		});
	});
});

app.post('/create/zip/instance', function(req, res) {
	let hospitalId = req.body.hospitalId;
	uti.doLoadOrthancTarget(hospitalId, req.hostname).then(async(orthanc) => {
		let cloud = JSON.parse(orthanc.Orthanc_Cloud);
		let orthancUrl = 'http://' + cloud.ip + ':' + cloud.httpport;
		let seriesId = req.body.seriesId;
		let username = req.body.username;
		let instanceId = req.body.instanceId;

		var command = formatStr('rm -rf %s/%s/%s', usrPreviewDir, seriesId, instanceId);
		var stdout = await runcommand(command);

		command = formatStr('mkdir %s/%s/%s', usrPreviewDir, seriesId, instanceId);
		stdout = await runcommand(command);

		command = formatStr('chmod 0777 %s/%s/%s', usrPreviewDir, seriesId, instanceId);
		stdout = await runcommand(command);

		var targetDir = formatStr('%s/%s/%s', usrPreviewDir, seriesId, instanceId);
		let dcmTargetFilename = instanceId + '.dcm';
		command = formatStr('curl --user %s:%s -H "user: %s" %s/instances/%s/file > %s/%s', cloud.user, cloud.pass, cloud.user, orthancUrl, instanceId, targetDir, dcmTargetFilename);
		stdout = await runcommand(command);
		let zipTargetFilename = instanceId + '.zip';
		let zipPath = formatStr('%s/%s/%s', usrPreviewDir, seriesId, zipTargetFilename);
		/*
		command = formatStr('zip %s %s', zipPath, dcmPath);
		stdout = await runcommand(command);
		*/
		await zipDirectory(targetDir, zipPath);
		res.status(200).send({result: stdout, archive: {link: '/img/usr/preview/' + seriesId + '/' + zipTargetFilename}});
	});
});

app.post('/sendai', function(req, res) {
  const publicDir = path.normalize(__dirname + '/../..');
  const aiDownloadDir = publicDir + process.env.AIDOWNLOAD_DIR;
	const { AIChest4allAsyncCall, downloadAIChestFile, downloadFile, checkStatus } = require('./mod/aichest4all_call.js');
  const imgCanvas = require('canvas');

	const printAIProps = function(userId, seriesId, instanceId, data, studyId){
    return new Promise(async function(resolve, reject) {
  		//log.info('AI Data=>' + JSON.stringify(data.data));
  	  //log.info('AI Result=>' + JSON.stringify(data.data.result));
      let aiResultJson = data.data.result;
      let resultTags = Object.keys(aiResultJson);
      let resultPass = [];
      await resultTags.forEach((mtag, i) => {
        let tagObject = Object.values(aiResultJson)[i];
        let percentage = uti.preciseMathDotRound((tagObject.probability * 100), 2);
        let isPass = aiCritiria.doProveCritiria(mtag, percentage);
        if (isPass == true) {
          let heatmap = tagObject.heatmap;
          let newPass = {type: mtag, percentage: percentage, heatmap: heatmap};
          resultPass.push(newPass);
        }
  		});
  		let newAILog = {seriesId: seriesId, instanceId: instanceId, ResultId: data.data.id, ResultJson: aiResultJson, studyId: studyId};
  		let adAILog = await db.radailogs.create(newAILog);
  		await db.radailogs.update({userId: userId}, {where: {id: adAILog.id}});
      resolve(resultPass);
    });
	};

	let userId = req.body.userId;
  let hospitalId = req.body.hospitalId;
	let seriesId = req.body.seriesId;
	let instanceId = req.body.instanceId;
  let studyId = req.body.studyId;
  let patientName = req.body.patientName;

	let zipTargetFilename = instanceId + '.zip';
	let zipPath = formatStr('%s/%s/%s', usrPreviewDir, seriesId, zipTargetFilename);

	AIChest4allAsyncCall(zipPath, "zip").then(aiRes => {
		log.info("Upload done")
		if (!aiRes.ids) {
		  throw new Error("No have IDs")
		}
		return aiRes.ids.map(id => checkStatus(id, async (airesult) => {
			let aiCritiriaPass = await printAIProps(userId, seriesId, instanceId, airesult, studyId);
      log.info('aiCritiriaPass=>' + JSON.stringify(aiCritiriaPass));

      let links = [];
      if (aiCritiriaPass.length == 0) {
      //if ((aiCritiriaPass.length == 0) || ((aiCritiriaPass.length == 1) && (aiCritiriaPass[0].type === 'NoFinding'))) {
        let resultPdfPath = await downloadAIChestFile(airesult.data.id, 'pdf');
        //stampimage ด้านล่าง สีแดง
        //"Inconclusive result, please wait for radiologist report"

        let codes = [];
        //if (aiCritiriaPass.length == 0) {
          let resultPdfDir = aiDownloadDir + '/' + airesult.data.id + '.pdf';
          let resultImageDir = aiDownloadDir + '/' + airesult.data.id + '.png';

          let command = formatStr('convert -density 300 %s %s', resultPdfDir, resultImageDir);
          let convertOutput = await runcommand(command);

          const bgImage = new imgCanvas.Image;
      		bgImage.src = resultImageDir;

      		const imageWidth = bgImage.width;
      		const imageHeight = bgImage.height;

          const inconcludeText = 'Inconclusive result, please wait for radiologist report';
          let maxThreshold = await aiCritiria.doFindMaxThreshold(airesult.data.result);
          let maxName = aiCritiria.doFindCritiriaNameByType(maxThreshold.tag);
          let maxPercentage = uti.preciseMathDotRound((maxThreshold.probability * 100), 2);
          let stampTypeText = maxName + ' ' + maxPercentage + '%';

          let stampTextJSON = [
            {text: stampTypeText, font: 'bold 140px "THSarabunNew"', color: 'red', align: 'center', x: (imageWidth/2), y: (imageHeight-250)},
            {text: inconcludeText, font: 'bold 140px "THSarabunNew"', color: 'red', align: 'center', x: (imageWidth/2), y: (imageHeight-150)}
          ];
          let imageLink = await imageStamper.imageStamperPDF(resultImageDir, stampTextJSON);

          links.push(imageLink);
          /*
          command = formatStr('rm %s && rm %s', resultPdfDir, resultImageDir);
          await runcommand(command);
          */
          links.forEach((pdf, i) => {
            let frags = pdf.split('/');
            let filename = frags[frags.length-1];
            let code = filename.split('.');
            codes.push(code[0]);
          });
          /*
        } else {
          links.push(resultPdfPath);
          codes.push(airesult.data.id);
        }
        */
        log.info('codes=>' + JSON.stringify(codes));
        //res.status(200).send({result: {links: pdfLinks, id: airesult.data.id, pdfs: pdfs, codes: codes, finalpdf: pdfLink}});
        res.status(200).send({result: {links: links, id: airesult.data.id, pdfs: codes, codes: codes, finalpdf: links[0]}});
      } else {
        //ดาวโหลด
        //stemp ข้อความ
        //{type: mtag, percentage: percentage, heatmap: heatmap}
        let pngLinks = [];
        const promiseList = new Promise(async function(resolve2, reject2) {
          await aiCritiriaPass.forEach(async(item, i) => {
            if (item.type !== 'NoFinding') {
              let newCode = uti.genUniqueID();
              let newPNG = newCode + '.png';
              let newPNGDir = aiDownloadDir + '/' + newPNG;
              let passImageDir = await downloadFile(item.heatmap, newPNGDir);
              let typeName = aiCritiria.doFindCritiriaNameByType(item.type);

              let bgImage = new imgCanvas.Image;
          		bgImage.src = newPNGDir;

          		let imageWidth = bgImage.width;
          		let imageHeight = bgImage.height;

              let textColor = 'red';
              /*
              if (item.type === 'NoFinding') {
                textColor = 'green';
              }
              */
              let stampText = typeName + ' ' + item.percentage + '%';
              var stampTextJSON = [
                {text: stampText, font: 'bold 70px "THSarabunNew"', color: textColor, align: 'center', x: (imageWidth/2), y: (imageHeight-80)},
              ];
              let pngLink = await imageStamper.imageStamperPNG(newPNGDir, stampTextJSON);
              pngLinks.push(pngLink);
              let pdfLink = await imageStamper.imageStamperPDF(newPNGDir, stampTextJSON);
              links.push(pdfLink);
              /*
              let command = formatStr('rm %s', newPNGDir);
              await runcommand(command);
              */
            }
          });

          let findNoFindings = await aiCritiriaPass.filter((item)=>{
            if (item.type === 'NoFinding') {
              return item;
            }
          });
          if (findNoFindings.length > 0){
            let resultPdfPath = await downloadAIChestFile(airesult.data.id, 'pdf');
            links.push(resultPdfPath);
          }

          setTimeout(()=> {
            resolve2({links: links, images: pngLinks, airesultpass: aiCritiriaPass});
          },5000);
        });
        Promise.all([promiseList]).then(async(ob)=> {
          let airesultpass = ob[0].airesultpass;
          log.info('airesultpass=>' + JSON.stringify(airesultpass));

          let pdfLinks = ob[0].links;
          log.info('pdfLinks=>' + JSON.stringify(pdfLinks));
          let pdfs = [];
          pdfLinks.forEach((pdf, i) => {
            let frags = pdf.split('/');
            let filename = frags[frags.length-1];
            let code = filename.split('.');
            pdfs.push(code[0]);
          });
          let images = ob[0].images;
          log.info('pngLinks=>' + JSON.stringify(images));
          let codes = [];
          await images.forEach((image, i) => {
            let frags = image.split('/');
            let filename = frags[frags.length-1];
            let code = filename.split('.');
            codes.push(code[0]);
          });

          //let finalPdfName = airesult.data.id;
          let finalPdfName = uti.genUniqueID();
          let pdfLink = await imageStamper.multiImagesToPDF(codes, finalPdfName);

          /*
          await codes.forEach(async(code, i) => {
            let stampPNGDir = aiDownloadDir + '/' + code + '.png';
            let command = formatStr('rm %s', stampPNGDir);
            await runcommand(command);
          });
          */

          let criticalresult = await airesultpass.filter((item)=>{
            if ((item.type === 'SuspectedActiveTB') || (item.type === 'IntrathoracicAbnormalFindings')) {
            //if ((item.type === 'SuspectedLungMalignancy') || (item.type === 'ExtrathoracicAbnormalFindings')) {
              return item;
            }
          });
          log.info('criticalresult=>' + JSON.stringify(criticalresult));
          if (criticalresult.length > 0){
            let hn = airesult.data.hn;
            let percentageValue = criticalresult[0].percentage;
            let resultTypeName = aiCritiria.doFindCritiriaNameByType(criticalresult[0].type)
            let lineCriticalMsgFormat = 'แจ้งเตือนผล cxr ผิดปกติ\nชื่อ: %s, HN: %s\n%s %s%';
            let lineCriticalMsg = uti.fmtStr(lineCriticalMsgFormat, patientName, hn, resultTypeName, percentageValue);
            let hospitalAlertUsers = await db.users.findAll({attributes: ['id'], where: {hospitalId: hospitalId}});
            await hospitalAlertUsers.forEach(async(alertuser, i) => {
              let userLines = await db.lineusers.findAll({ attributes: ['id', 'UserId'], where: {userId: alertuser.id}});
              if (userLines.length > 0) {
                userLines.forEach(async(user, i) => {
                  let menuQuickReply = lineApi.createBotMenu(lineCriticalMsg, 'quick', lineApi.radioMainMenu);
                  await lineApi.pushConnect(user.UserId, menuQuickReply);
                });
              }
            });
          }
          res.status(200).send({result: {links: pdfLinks, id: airesult.data.id, pdfs: pdfs, codes: codes, finalpdf: pdfLink}});
        });
      }
		}, console.error))
	}).catch(error => {
		console.error("Error!!!", error.message);
		res.status(500).send({error: error.message});
	})
});

app.post('/convert/ai/report', function(req, res) {
	let hospitalId = req.body.hospitalId;
	uti.doLoadOrthancTarget(hospitalId, req.hostname).then(async(orthanc) => {
		const publicDir = path.normalize(__dirname + '/../..');
    const aiDownloadDir = publicDir + process.env.AIDOWNLOAD_DIR;

		let cloud = JSON.parse(orthanc.Orthanc_Cloud);
		let orthancUrl = 'http://' + cloud.ip + ':' + cloud.httpport;
		let userPASS = cloud.user + ':' + cloud.pass;
		let studyId = req.body.studyId;
		let username = req.body.username;
		//let reportFileCode = req.body.pdffilecode;
    let pdfCodes = req.body.pdfcodes;
		let modality = req.body.modality;

    log.info('pdfCodes=>'+ JSON.stringify(pdfCodes));

		//log.info('orthancUrl=> '+ orthancUrl)
		let outterCommand = formatStr('curl --user %s %s/studies/%s', userPASS, orthancUrl, studyId);
		let stdout = await runcommand(outterCommand);

		let studyObj = JSON.parse(stdout);
		let mainTags = Object.keys(studyObj.MainDicomTags);
		let patientMainTags = Object.keys(studyObj.PatientMainDicomTags);

    if (pdfCodes) {
      await pdfCodes.forEach(async(reportFileCode, i) => {
        let pdfFileName = reportFileCode + '.pdf';
    		let bpmFile = reportFileCode + '.bmp';
        let jpgFile = reportFileCode + '.jpg';
    		let dcmFile = reportFileCode + '.dcm';
    		let command = '';
        //convert -verbose -density 50 -trim -background white -alpha background -alpha off  dfb604bf-b90c.pdf -quality 90 dfb604bf-b90c.jpg
    		command += 'convert -verbose -density 150 -trim ' + aiDownloadDir + '/' + pdfFileName + '[0]';
        //command += 'convert -verbose -density 50 -trim -background white -alpha background -alpha off -colorspace rgb -quality 90 ';
    		command += ' -define bmp:format=BMP3 -quality 100 -flatten -sharpen 0x1.0 ';
        //command += aiDownloadDir + '/' + pdfFileName + '[0]';
    		command += ' ' + aiDownloadDir + '/' + bpmFile;
        //command += ' ' + aiDownloadDir + '/' + jpgFile;
    		command += ' && cd ' + aiDownloadDir;
    		command += ' && img2dcm -i BMP ' + bpmFile + ' ' + dcmFile;
        //command += ' && img2dcm ' + jpgFile + ' ' + dcmFile;
    		await mainTags.forEach((tag, i) => {
    			command += formatStr(' -k "%s=%s"', tag, Object.values(studyObj.MainDicomTags)[i]);
    		});
    		await patientMainTags.forEach((tag, i) => {
    			if (tag !== 'OtherPatientIDs')	{
    				command += formatStr(' -k "%s=%s"', tag, Object.values(studyObj.PatientMainDicomTags)[i]);
    			}
    		});

    		command += formatStr(' -k "Modality=%s" -v', modality);

    		command += ' && storescu';
        //command += ' && dcmsend --verbose --decompress-lossy';
        //command += ' && dcmsend --decompress-lossy';
    		command += formatStr(' %s %s', cloud.ip, cloud.dicomport);
    		command +=  ' ' + aiDownloadDir + '/' + dcmFile;
    		command +=  ' -v';

    		stdout = await runcommand(command);

        coppyFileCmd = formatStr('cp %s %s && cp %s %s', (aiDownloadDir + '/' + pdfFileName), (publicDir + process.env.USRPDF_DIR + '/' + pdfFileName), (aiDownloadDir + '/' + dcmFile), (publicDir + process.env.USRPDF_DIR + '/' + dcmFile));

        await runcommand(coppyFileCmd);
      });
      /*
      /*** ค้าง  ****/
      /*
      ตำแหน่ง download file pdf/dcm
      studyInstanceUID
      */

      let triggerMsg = 'Please tell your orthanc update';
      let studyInstanceUID = studyObj.MainDicomTags.StudyInstanceUID;
      let socketTrigger = {type: 'trigger', message: triggerMsg, studyid: studyId, dcmcodes: pdfCodes, studyInstanceUID: studyInstanceUID, owner: username, hostname: req.hostname};
      //await websocket.sendMessage(socketTrigger, 'orthanc');
      let yourLocalSocket = await socket.findOrthancLocalSocket(hospitalId);
      if (yourLocalSocket) {
        yourLocalSocket.send(JSON.stringify(socketTrigger));
      }
  		res.status(200).send({result: {code: 200}, output: stdout});
    } else {
      res.status(200).send({result: {code: 403}, output: 'Not found PDS-Code'});
    }
	});
});

app.post('/importarchive/(:hospitalId)/(:archivecode)/(:username)', function(req, res) {
	let hospitalId = req.params.hospitalId;
	uti.doLoadOrthancTarget(hospitalId, req.hostname).then(async (orthanc) => {
		let cloud = JSON.parse(orthanc.Orthanc_Cloud);
		let orthancUrl = 'http://' + cloud.ip + ':' + cloud.httpport;
		let archiveCode = req.params.archivecode;
		let username = req.params.username;
    let pacsImportOption = req.body.pacsImportOption;
    log.info('option=>' + pacsImportOption);
		let archiveFileName = archiveCode + '.zip';
		let archiveParh = usrUploadDir + '/' + archiveFileName;
		let archiveDir = formatStr('%s/%s', usrUploadDir, archiveCode);
		let command = formatStr('mkdir %s', archiveDir);
		let stdout = await runcommand(command);
		fs.createReadStream(archiveParh).pipe(unzip.Extract({ path: archiveDir })).on('close', function () {
			log.info('Unzip Archive Success, and start import for you.');
			getFiles(archiveDir).then((files) => {
				const delay = 5000;
				const importDicom = function(dicomFile, pos){
					return new Promise(async function(resolve, reject){
						let command = formatStr('curl -X POST --user %s:%s %s/instances --data-binary @%s', cloud.user, cloud.pass, orthancUrl, dicomFile);
						let stdout = await runcommand(command);
						setTimeout(()=>{
							log.info('order => ' + pos);
              log.info('result => ' + stdout);
							resolve(JSON.parse(stdout));
						}, 415);
					});
				}

				let execResults = [];
				let	promiseList = new Promise(async function(resolve2, reject2){
					let i = 0;
					while (i < files.length) {
						let item = files[i];
						let pathFormat = item.split(' ').join('\\ ');
						let importRes = await importDicom(pathFormat, i);
            //socket
            if (pacsImportOption) {
              let startUrlAt = item.indexOf('/img');
              let internalUrl = item.substring(startUrlAt);
              var port = req.app.settings.port || process.env.SERVER_PORT;
              let downloadlink = req.protocol + '://' + req.hostname  + ( port == 80 || port == 443 ? '' : ':'+port )  + internalUrl;
              let socketTrigger = {type: 'import', message: 'Please sync new dicom to Pacs', download: {link: downloadlink} };
              await socket.sendLocalGateway(socketTrigger, hospitalId);
            }
						execResults.push(importRes);
						i++;
					}
					setTimeout(()=>{
						resolve2(execResults);
					}, delay);
				});
				log.info('countt all Files => ' + files.length);
				res.status(200).send({result: files});
				Promise.all([promiseList]).then(async (ob)=>{
          let instanceTag = ob[0][0];
          let importResult = {type: 'importresult', result: instanceTag};
          if (username) {
            await socket.sendMessage(importResult, username);
          }
          res.status(200).send({result: instanceTag});
				});
			}).catch((error) => {
				log.error('Error=>'+ JSON.stringify(error));
				res.status(500).send({error: error});
			});
		});
	});
});

app.post('/importdicom', function(req, res) {
	let hospitalId = req.body.hospitalId;
	uti.doLoadOrthancTarget(hospitalId, req.hostname).then(async (orthanc) => {
		let cloud = JSON.parse(orthanc.Orthanc_Cloud);
		let orthancUrl = 'http://' + cloud.ip + ':' + cloud.httpport;
		let archiveCode = req.body.archivecode;
		let username = req.body.username;
    let pacsImportOption = req.body.pacsImportOption;
    let dicomList = req.body.dicomList;

    let execResults = [];
    let	promiseList = new Promise(async function(resolve2, reject2){
      let i = 0;
      while (i < dicomList.length) {
        let dicomFilePath = publicDir + '/public' + dicomList[i];
        let command = formatStr('curl -X POST --user %s:%s %s/instances --data-binary @%s', cloud.user, cloud.pass, orthancUrl, dicomFilePath);
        let stdout = await runcommand(command);
        let resultTag = JSON.parse(stdout);

        //socket
        if (pacsImportOption) {
          let internalUrl = dicomList[i];
          var port = req.app.settings.port || process.env.SERVER_PORT;
          let downloadlink = req.protocol + '://' + req.hostname  + ( port == 80 || port == 443 ? '' : ':'+port )  + internalUrl;
          let socketTrigger = {type: 'import', message: 'Please sync new dicom to Pacs', download: {link: downloadlink} };
          await socket.sendLocalGateway(socketTrigger, hospitalId);
        }

        execResults.push(resultTag);
        i++;
      }
      setTimeout(()=>{
        resolve2(execResults);
      }, 5000);
    });
    log.info('countt all Files => ' + dicomList.length);
    res.status(200).send({result: dicomList});
    Promise.all([promiseList]).then(async (ob)=>{
      let instanceTag = ob[0][0];
      let importResult = {type: 'importresult', result: instanceTag};
      if (username){
        await socket.sendMessage(importResult, username);
      }
      res.status(200).send({result: instanceTag});
    });
  });
});

app.post('/loadarchive/(:studyID)', function(req, res) {
  var studyID = req.params.studyID;
  var fileName = studyID + '.zip'
  try {
    var existPath = usrArchiveDir + '/' + fileName;
    var isExist = fs.existsSync(existPath);
    if (isExist) {
      let link = process.env.USRARCHIVE_PATH + '/' + fileName;
      res.status(200).send({link: link});
    } else {
    	let hospitalId = req.body.hospitalId;
    	uti.doLoadOrthancTarget(hospitalId, req.hostname).then((orthanc) => {
    		var username = req.body.username;
    		var archiveFileName = fileName;
    		let cloud = JSON.parse(orthanc.Orthanc_Cloud);
    		let orthancUrl = 'http://' + cloud.ip + ':' + cloud.httpport;
    		var command = 'curl --user ' + cloud.user + ':' + cloud.pass + ' -H "user: ' + cloud.user + '" ' + orthancUrl + '/studies/' + studyID + '/archive > ' + usrArchiveDir + '/' + archiveFileName;
    		log.info('Download Dicom archive with command >>', command);
    		runcommand(command).then((stdout) => {
          log.info('Dicom archive result => ' + stdout)
    			let link = process.env.USRARCHIVE_PATH + '/' + archiveFileName;
    			res.status(200).send({link: link});
    		});
    	});
    }
  } catch(err) {
    log.error('Check Archive Error=>' + JSON.stringify(err));
    res.status(500).send({error: err});
  }
});

app.post('/create/archive/advance/(:studyID)', function(req, res) {
  var studyID = req.params.studyID;
  let hospitalId = req.body.hospitalId;
  try {
    uti.doLoadOrthancTarget(hospitalId, req.hostname).then((orthanc) => {
      var username = req.body.username;
      var archiveFileName = studyID + '.zip';
      let cloud = JSON.parse(orthanc.Orthanc_Cloud);
      let orthancUrl = 'http://' + cloud.ip + ':' + cloud.httpport;
      var command = 'curl --user ' + cloud.user + ':' + cloud.pass + ' -H "user: ' + cloud.user + '" ' + orthancUrl + '/studies/' + studyID + '/archive > ' + usrArchiveDir + '/' + archiveFileName;
      log.info('Create Dicom achive advance with command >>', command);
      runcommand(command);
      uti.removeArchiveScheduleTask(usrArchiveDir + '/' + archiveFileName);
      res.status(200).send({status: {code: 200}});
    });
  } catch(err) {
    log.error('Create Archive Advance Error=>' + JSON.stringify(err));
    res.status(500).send({error: err});
  }
});

app.post('/deletedicom/(:studyID)', function(req, res) {
	let hospitalId = req.body.hospitalId;
	uti.doLoadOrthancTarget(hospitalId, req.hostname).then(async (orthanc) => {
		let studyID = req.params.studyID;
		let cloud = JSON.parse(orthanc.Orthanc_Cloud);
    let orthancUrl = 'http://' + cloud.ip + ':' + cloud.httpport;

    let allInstances = await uti.doCollectInstancesFromStudy(studyID, cloud);
    if (allInstances.length > 0){

      const dataInput = {instances: allInstances, dbName: cloud.dbname};
      const unLinkDicomWorker = require('worker-farm');
      const unLinkDicomService = unLinkDicomWorker(require.resolve('./unlinkidicom-worker.js'));
      try {
        await unLinkDicomService(dataInput, function (output) {
          log.info('UnLink Process Result=>' + JSON.stringify(output));
        });
      } catch(err){
        log.info('UnLink Process Error=>' + JSON.stringify(err));
        res.status(500).send({error: err});
      }

      var command = 'curl -X DELETE --user ' + cloud.user + ':' + cloud.pass + ' -H "user: ' + cloud.user + '" ' + orthancUrl + '/studies/' + studyID;
  		log.info('Delete Dicom with command >>', command);
  		runcommand(command).then(async (stdout) => {
        await db.dicomtransferlogs.destroy({ where: { ResourceID: studyID } });
  			res.status(200).send({response: {message: stdout}});
  		});
    } else {
      log.info('not found instances from studyID ' + studyID);
      res.status(200).send({test: allInstances});
    }
	});
});

app.get('/orthancexternalport', function(req, res) {
	let hospitalId = req.query.hospitalId;
	let hostname = req.hostname;
	uti.doLoadOrthancTarget(hospitalId, hostname).then((orthanc) => {
		let cloud = JSON.parse(orthanc.Orthanc_Cloud);
		res.status(200).send({ip: cloud.ipex, port: cloud.portex});
	});
});

app.post('/archivefile/exist', function(req, res) {
  let fileName = req.body.filename;
  let existPath = usrArchiveDir + '/' + fileName;
  let isExist = fs.existsSync(existPath);
  if (isExist) {
    let link = process.env.USRARCHIVE_PATH + '/' + fileName;
    res.status(200).send({link: link});
  } else {
    res.status(200).send({});
  }
});

module.exports = ( dbconn, monitor, websocket ) => {
  db = dbconn;
  log = monitor;
  socket = websocket;
  Orthanc = db.orthancs;
	uti = require('./mod/util.js')(db, log);
  lineApi = require('./mod/lineapi.js')(db, log);
  aiCritiria = require('./mod/ai-critiria.js')(log);
  imageStamper = require('./mod/imagestamper.js')(log);
  return app;
}
