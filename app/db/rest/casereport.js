const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var websocket, db, Report, CaseResponse, Case, log, auth, uti, common, commonReport;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const genUniqueID = function () {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return s4() + s4() + '-' + s4();
}

const parseStr = function (str) {
  var args = [].slice.call(arguments, 1);
  var i = 0;
  return str.replace(/%s/g, () => args[i++]);
}

const runcommand = function (command) {
	return new Promise(function(resolve, reject) {
		const exec = require('child_process').exec;
		exec(command, (error, stdout, stderr) => {
			if(error === null) {
				resolve(`${stdout}`);
			} else {
				reject(`${stderr}`);
			}
    });
	});
}

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const caseId = req.body.caseId;
          const caserep = await Report.findAll({attributes: excludeColumn, where: {caseId: caseId}});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({ status: {code: 200}, Records: caserep});
        } catch(error) {
          log.error(error);
          res.json({status: {code: 500}, error: error});
        }
			} else if (ur.token.expired){
				res.json({ status: {code: 210}, token: {expired: true}});
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//Select by caseId
app.post('/select/(:caseId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const caseId = req.params.caseId;
          const caserep = await Report.findAll({attributes: excludeColumn, where: {caseId: caseId}});
          //res.json({status: {code: 200}, types: types});
          //log.info('CaseReport=> ' + JSON.stringify(caserep));
          res.json({ status: {code: 200}, Records: caserep});
        } catch(error) {
          log.error(error);
          res.json({status: {code: 500}, error: error});
        }
			} else if (ur.token.expired){
				res.json({ status: {code: 210}, token: {expired: true}});
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//Append Log API
app.post('/appendlog/(:caseId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const caseId = req.params.caseId;
					const appendLog = req.body.log;
          const caserep = await Report.findAll({attributes: ['Log'], where: {caseId: caseId}});
					//log.info('caserep log=>' + JSON.stringify(caserep));
					let currentLog = undefined;
					if ((caserep.length > 0) && (caserep[0]) && (caserep[0].log)) {
						currentLog = caserep[0].Log;
						currentLog.push(appendLog);
					} else {
						currentLog = [appendLog];
					}
					await Report.update({Log: currentLog}, { where: { caseId: caseId }});
					const targetCases = await Case.findAll({attributes: ['casestatusId'], where: {id: caseId}});
					if (targetCases[0].casestatusId != 5){
						let hospitalViewResultNote = 'Hospital open and print result report';
						let reSuccessStatusId = 5;
						let caseStatusChange = { casestatusId: reSuccessStatusId, Case_DESC: hospitalViewResultNote};
						await Case.update(caseStatusChange, { where: { id: caseId } });
					}
          res.json({ status: {code: 200}});
        } catch(error) {
          log.error(error);
          res.json({status: {code: 500}, error: error});
        }
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//insert API
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };
        try {
          const caseId = req.body.caseId;
          let newReport = req.body.data;
          let adReport = await Report.create(newReport);
          await Report.update({caseId: caseId}, { where: { id: adReport.id } });
          res.json({ status: {code: 200}, Record: adReport});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
      	}
			} else if (ur.token.expired){
				res.json({ status: {code: 210}, token: {expired: true}});
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//updatee API
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let upReport = req.body.data;
          await Report.update(upReport, { where: { id: req.body.id } });
          res.json({status: {code: 200}});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
      	}
			} else if (ur.token.expired){
				res.json({ status: {code: 210}, token: {expired: true}});
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//delete API
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          await Report.destroy({ where: { id: req.body.id } });
          res.json({status: {code: 200}});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
      	}
			} else if (ur.token.expired){
				res.json({ status: {code: 210}, token: {expired: true}});
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//Variable Service API
app.post('/variable', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then( (ur) => {
      if (ur.length > 0){
        const caseId = req.body.caseId;
        const userId = req.body.userId;
        commonReport.doLoadVariable(caseId, userId).then((variable) =>{
          res.json({status: {code: 200}, variable: variable});
        })
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//Create Report Service API
app.post('/create', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){


        const caseId = req.body.caseId;
				const responseId = req.body.responseId;
        const userId = req.body.userId;
        const hospitalId = req.body.hospitalId;
				const pdfFileName = req.body.pdfFileName;
				const hostname = req.hostname;

				let newReportRes = await commonReport.doCreateNewReport(caseId, responseId, userId, hospitalId, pdfFileName, hostname);
				res.json(newReportRes);

      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//Convert Report to dicom of ORTHANC Service API
app.post('/convert', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){

        const caseId = req.body.caseId;
        const userId = req.body.userId;
        const hospitalId = req.body.hospitalId;
				const studyID = req.body.studyID;
				const modality = req.body.modality;
				const studyInstanceUID = req.body.studyInstanceUID;

				let yourLocalSocket = await websocket.findOrthancLocalSocket(hospitalId);
				if (yourLocalSocket) {
					let submitResult = await commonReport.doReSubmitReport(caseId, hospitalId);
					res.json({status: {code: 200}, result: submitResult.result});
				} else {
					res.json({status: {code: 205}, cuase: 'not found local orthanc socket'});
				}
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

app.get('/create/(:caseId)', async (req, res) => {
	let caseId = req.params.caseId;
	const targetCases = await Case.findAll({attributes: ['hospitalId'], where: {id: caseId}});
	if (targetCases.length > 0){
		const caseReps = await Report.findAll({where: {caseId: caseId}});
		log.info('caseReps=>' + JSON.stringify(caseReps));
		if (caseReps.length > 0){
			let responseId = caseReps[0].caseresponseId;
			let userId = caseReps[0].userId;
			let hospitalId = targetCases[0].hospitalId;
			let pdfFilePath = caseReps[0].PDF_Filename;
			let pdfFilePaths = pdfFilePath.split('/');
			let pdfFileName = pdfFilePaths[pdfFilePaths.length-1];
		 	let hostname = req.hostname;

			const reports = await db.hospitalreports.findAll({ attributes: ['Content'], where: {hospitalId: hospitalId}});
			//log.info('hospitalReport=>' + JSON.stringify(reports));
      const reportElements = reports[0].Content;

      const reportVar = await commonReport.doLoadVariable(caseId, responseId, userId);
			//log.info('reportVar=>' + JSON.stringify(reportVar));

      const rsH = parseFloat(reportVar.rsH);

      let report = await commonReport.reportCreator(reportElements, reportVar, pdfFileName, caseId, rsH);
			log.info('newReportGen=>' + JSON.stringify(report));

      let creatResult = {status: {code: 200}, reportLink: report.reportPdfLinkPath, htmlLink: report.reportHtmlLinkPath, reportPages: report.reportPages, responseId: responseId};

			res.json(creatResult);
		} else {
			res.json({error: 401, cuase: 'Sorry, not found CaseReport of caseId= ' + caseId});
		}
	} else {
		res.json({error: 401, cuase: 'Sorry, not found Case caseId= ' + caseId});
	}
});

app.get('/select/(:caseId)', async (req, res) => {
    const caseId = req.params.caseId;
    const caserep = await Report.findAll({attributes: excludeColumn, where: {caseId: caseId}});
    res.json({ status: {code: 200}, Records: caserep});
});

module.exports = ( wssocket, dbconn, monitor ) => {
	websocket = wssocket;
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
	uti = require('../../lib/mod/util.js')(db, log);
	common = require('./commonlib.js')(db, log);
	commonReport = require('./commonreport.js')(websocket, db, log);
  Report = db.casereports;
	CaseResponse = db.caseresponses;
  Case = db.cases;
  return app;
}
