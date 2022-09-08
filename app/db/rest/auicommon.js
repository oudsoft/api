const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(bodyParser.json({ limit: "50MB", type:'application/json', extended: true}));
app.use(bodyParser.urlencoded({limit: '50MB', type:'application/x-www-form-urlencoded', extended: true}));

const excludeColumn = { exclude: ['updatedAt'] };

var db, log, auth, uti, tasks, warnings, voips, socket, common, commonReport, statusControl;


//Radio OPen case for start type response result API
app.post('/radio/createresult', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let caseId = req.body.caseId;
          let radioId = req.body.radioId;
          let statusId = req.body.statusId;
          let patientId = req.body.patientId;
          let hospitalId = req.body.hospitalId;
          let currentCaseId = req.body.currentCaseId;
          let smartTemplateFilter = req.body.smartTemplateFilter;
          let limit = req.body.limit;
          let filterParams = {statusId, patientId, hospitalId, currentCaseId, limit}


          /*
          "/api/cases/select/<caseId>"
          "/api/cases/filter/patient"
          "/api/template/options/<radioId>"
          "/api/caseresponse/select/<caseId>"
          */

          let selectedCase = await common.doSelectCaseById(caseId);
          //log.info('selectedCase=>' + JSON.stringify(selectedCase));
          let patientFilter = await common.doFilterPatient(filterParams);
          //log.info('patientFilter=>' + JSON.stringify(patientFilter));
          let templateOptions = await common.doActiveAutoApply(smartTemplateFilter, radioId)
          //log.info('templateOptions=>' + JSON.stringify(templateOptions));
          let caseres = await db.caseresponses.findAll({ where: {caseId: caseId}});
          //log.info('caseres=>' + JSON.stringify(caseres));
          let resultFormat = await common.doLoadResultFormat(hospitalId);

          let previewOption = await common.doLoadRadioPreviewPDFOption(hospitalId);

          let callResponse = {selectedCase: selectedCase, patientFilter: patientFilter, caseResponse: {Record: caseres}, resultFormat: resultFormat, previewOption: previewOption};
          if (caseres.length > 0) {
            let caserep = await db.casereports.findAll({attributes: ['Report_Type'], where: {caseresponseId: caseres[0].id}});
            log.info('caserep=>' + JSON.stringify(caserep));
            if (caserep.length > 0){
              callResponse.reportType = caserep[caserep.length-1].Report_Type;
            } else {
              callResponse.reportType = 'none';
            }
          }
          if (templateOptions.length == 0){
            let allTemplates = await common.doGenTemplateOptions(radioId);
            if (allTemplates.length > 0) {
              callResponse.allTemplates = {Options: allTemplates.Options};
            } else {
              const hospital = await db.hospitals.findAll({ attributes: ['id', 'Hos_Name'], order: [['id', 'ASC']] });
              callResponse.allTemplates = {Options: [{Value: -2, DisplayText: 'ระบบฯ ไม่พบรายการ Template ของคุณ', hospitalmap: hospital}]};
            }
          } else {
            const hospital = await db.hospitals.findAll({ attributes: ['id', 'Hos_Name'], order: [['id', 'ASC']] });
            let autoApplyTemplateId = undefined;
            let tmOptions = [];
            await templateOptions.forEach((item, i) => {
              tmOptions.push({Value: item.id, DisplayText: item.Name, Modality: item.Modality, StudyDescription: item.StudyDescription, ProtocolName: item.ProtocolName, Hospitals: item.Hospitals, AutoApply: item.AutoApply, hospitalmap: hospital});
              if (item.AutoApply == 1){
                autoApplyTemplateId = item.id;
              }
            });

            //log.info('autoApplyTemplateId=>' + JSON.stringify(autoApplyTemplateId));
            if (autoApplyTemplateId) {
              const autoApplyContents = await db.templates.findAll({ attributes: ['Content'], where: {id: autoApplyTemplateId} });
              callResponse.templateOptons = {Options: tmOptions, Content: autoApplyContents[0].Content};
            } else {
              callResponse.templateOptons = {Options: tmOptions};
            }
          }
          res.json({ status: {code: 200}, result: callResponse});
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

//Radio save case's Result and generate pdf of result API
app.post('/radio/saveresult', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let reqData = req.body;
          if ((reqData.caseId) && (Number(reqData.caseId) > 0)) {
      			let hostname = req.hostname;
            //log.info('Radio Save Result with reqData => ' + JSON.stringify(reqData));
            let addNewResResult = await statusControl.doControlAddNewResponse(reqData);
            log.info('Control-addNewResponse=> ' + JSON.stringify(addNewResResult));
            if (addNewResResult.status.code == 200){
              let caseId = reqData.caseId;
              let userId = reqData.userId;
              let hospitalId = reqData.hospitalId;
      				let pdfFileName = reqData.pdfFileName;
              let responseId = reqData.responseId;
              if (!responseId){
                responseId = addNewResResult.result.responseId
              }

              let newReportRes = await commonReport.doCreateNewReport(caseId, responseId, userId, hospitalId, pdfFileName, hostname);
              log.info('Create-Report=> ' + JSON.stringify(newReportRes));
              if ((!newReportRes.reportLink) || (newReportRes.reportLink == '')) {
                /*
                  UI Pdf Preview Dialog Box Blank.
                */
                let subject = 'Cuase of UI Pdf Preview Dialog Box Blank happen.'
                let msgHtml = uti.fmtStr('<p>caseId=%s</p><p>userId=%s</p><p>hospitalId=%s</p><p>pdfFileName=%s</p><p>responseId=%s</p>', caseId, userId, hospitalId, pdfFileName, responseId);
                msgHtml += uti.fmtStr('<p>Create-Report=> %s</p>', JSON.stringify(newReportRes));
                let caseData = await db.cases.findAll({ where: {id: caseId}});
                msgHtml += uti.fmtStr('<p>Case Data=> %s</p>', JSON.stringify(caseData));
                let sendEmailRes = await common.doSendEmailToAdmin(subject, msgHtml);
                msgHtml = uti.fmtStr('มีข้อผิดพลาดจากการบันทึกผลอ่านรังสีแพทย์ CaseId=%s รายละเอียดส่งทางอีเมล์ %s แล้ว', caseId, process.env.EMAIL_ADMIN_ADDRESS);
                await common.sendNotifyChatBotToAdmin(msgHtml);
              }
      				res.json(newReportRes);

              //res.json({ status: {code: 200}, result: callResponse});
            } else if (addNewResResult.status.code == 203){
              //Can not change status
              res.json(addNewResResult);
            } else {
              //error
              res.json(addNewResResult);
            }
          } else {
            res.json({status: {code: 500}, error: {text: 'your caseId undefined!'}});
          }
        } catch(error) {
          log.error(error);
          res.json({status: {code: 500}, error: error});
          let errorMsg = uti.fmtStr('มีข้อผิดพลาดเกิดที่ API %s', '/radio/saveresult');
          common.sendNotifyChatBotToAdmin(errorMsg);
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

//Radio save case's Result and generate pdf of result API
app.post('/radio/saveresponse', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let reqData = req.body;
          if ((reqData.caseId) && (Number(reqData.caseId) > 0)) {
      			let hostname = req.hostname;
            //log.info('Radio Save Result with reqData => ' + JSON.stringify(reqData));
            let addNewResResult = await statusControl.doControlAddNewResponse(reqData);
            log.info('Control-addNewResponse=> ' + JSON.stringify(addNewResResult));
            res.json(addNewResResult);
          } else {
            res.json({status: {code: 500}, error: {text: 'your caseId undefined!'}});
          }
        } catch(error) {
          log.error(error);
          res.json({status: {code: 500}, error: error});
          let errorMsg = uti.fmtStr('มีข้อผิดพลาดเกิดที่ API %s', '/radio/saveresponse');
          common.sendNotifyChatBotToAdmin(errorMsg);
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

//Radio submit case's Result for convert dicom and send result text to RIS API
app.post('/radio/submitresult', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let caseId = req.body.caseId;
          let userId = req.body.userId;
          let hospitalId = req.body.hospitalId;
          let responseId = req.body.responseId;
          let hostname = req.hostname;
          let report = req.body.report;
          let reportType = req.body.reportType;
          let cases = await db.cases.findAll({attributes: ['casestatusId'], where: {id: caseId}});
          let nowStatusId = cases[0].casestatusId;

          let submitRes = await commonReport.doSubmitReport(caseId, responseId, userId, hospitalId, reportType, hostname, report);

          let responseType = 'normal';
          let nextStatus = common.nextCaseStausOnResponseChange(nowStatusId, responseType, reportType);
          let remark = 'Radio Submit Result Success.';
          let changeResult = await statusControl.doChangeCaseStatus(nowStatusId, nextStatus, caseId, userId, remark);
          //res.json({submit: submitRes, change: changeResult});
          log.info('==' + remark + '==');
          log.info('nowStatusId => ' + nowStatusId);
          log.info('nextStatus => ' + nextStatus);
          log.info('caseId => ' + caseId);
          log.info('userId => ' + userId);
          log.info('case change status Result => ' + JSON.stringify(changeResult));
          log.info('=============');
          if (nowStatusId == 14){
            db.radchatlogs.update({topicStatus: 0}, {where: { caseId: caseId }});
          }
          res.json(submitRes);
        } catch(error) {
          log.info('==Radio Submit Result with Error==');
          log.error(error);
          res.json({status: {code: 500}, error: error});
          let errorMsg = uti.fmtStr('มีข้อผิดพลาดเกิดที่ API %s', '/radio/submitresult');
          common.sendNotifyChatBotToAdmin(errorMsg);
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

app.get('/test/submitresult', async (req, res) => {
  const pdfFileName = 'ATCHARIN_MAN-AM-20210719.pdf';
  const publicDir = path.normalize(__dirname + '/../../../public');
  const usrPdfPath = publicDir + process.env.USRPDF_PATH + '/' + pdfFileName;

  let pdfPage = await commonReport.doCountPagePdf(usrPdfPath);
  res.json({status: {code: 200}, pages: pdfPage});
});

app.get('/test/send/admin', async (req, res) => {
  let subject = 'test';
  let msgHtml = uti.fmtStr('<p>%s</p>', 'My Test Send.');
  let sendEmailRes = await common.doSendEmailToAdmin(subject, msgHtml);
  msgHtml = uti.fmtStr('มีข้อผิดพลาดจากการบันทึกผลอ่านรังสีแพทย์ CaseId=%s รายละเอียดส่งทางอีเมล์ %s แล้ว', 1, process.env.EMAIL_ADMIN_ADDRESS);
  let sendBotRes = await common.sendNotifyChatBotToAdmin(msgHtml);
  res.json({status: {code: 200}, result: {mail: sendEmailRes, bot: sendBotRes}});
});

app.get('/do/resubmit/(:caseId)', async (req, res) => {
  let caseId = req.params.caseId;
  let hostname = req.hostname;
  let reSubmitRes = await commonReport.doReSubmitReport(caseId, hostname);
  res.json({status: {code: 200}, result: reSubmitRes});
});

app.get('/radio/profile/(:radioId)', async (req, res) => {
  let radioId = req.params.radioId;
  let profileRes = await common.doLoadRadioProfile(radioId);
  res.json({status: {code: 200}, result: profileRes});
});

app.get('/do/test/push/(:lineUserId)/(:msg)', async (req, res) => {
  let lineUserId = req.params.lineUserId;
  let msg = req.params.msg;
  let pushRes = await common.doTestPushConnect(lineUserId, msg);
  res.json({status: {code: 200}, result: pushRes});
});

module.exports = ( dbconn, caseTask, warningTask, voipTask, monitor, websocket ) => {
  db = dbconn;
  log = monitor;
  tasks = caseTask;
  warnings = warningTask;
  voips = voipTask;
  socket = websocket;
  auth = require('./auth.js')(db, log);
  common = require('./commonlib.js')(db, log);
  uti = require('../../lib/mod/util.js')(db, log);
  commonReport = require('./commonreport.js')(socket, db, log);
  statusControl = require('./statuslib.js')(db, log, tasks, warnings, voips, socket);
  return app;
}
