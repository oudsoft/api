const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const request = require('request-promise');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const express = require('express');
const app = express();

var db, log, auth, lineApi, uti, statusControl, common, socket, Task, Warning, Voip;

const doChangeCaseStatusMany = function(radioId, newStatusId){
  return new Promise(async function(resolve, reject) {
    let allTargetCases = await db.cases.findAll({ attributes: ['id'], where: {casestatusId: 1, Case_RadiologistId: radioId}});
    let changeReses = [];
    const promiseList = new Promise(async function(resolve2, reject2) {
      await allTargetCases.forEach(async (item, i) => {
        let changeCaseRes = await statusControl.doChangeCaseStatus(1, newStatusId, item.id, radioId, 'Radio Accept by VoIP App');
        changeReses.push(changeCaseRes);
      });
      setTimeout(()=>{
        resolve2(changeReses);
      }, 1000);
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
    });
  });
}

app.post('/response', async function(req, res) {
  log.info('voip response => ' + JSON.stringify(req.body));

  /*
  let forwardCmdFmt = "curl -k -X POST -H \"Content-Type: application/json\" https://202.28.68.28:8443/api/voipapp/response  -d  '%s'";
  let forwardCmd = uti.fmtStr(forwardCmdFmt, JSON.stringify(req.body));
  log.info('forwardCmd => ' + forwardCmd);
  let forwardRes = await uti.runcommand(forwardCmd);
  log.info('forwardRes => ' + JSON.stringify(forwardRes));
  res.json({status: {code: 200}, ok: 'me'});
  */

  let changeRes = {};
  let yourResponse = req.body;
  log.info('yourResponse=> ' + JSON.stringify(yourResponse));
  let caseId = req.body.inc_id;
  log.info('yourCaseId => ' + caseId);
  let key = req.body.response_key;
  log.info('yourKey => ' + key);
  let voip = await Voip.selectTaskByCaseId(caseId);
  log.info('yourVoip => ' + JSON.stringify(voip));
  if ((voip) && (voip.caseId)){
    voip.responseKEYs.push(key);
    let action = undefined;
    let targetCases = await db.cases.findAll({ attributes: ['Case_RadiologistId', 'casestatusId'], where: {id: caseId}});
    let radioId = targetCases[0].Case_RadiologistId;
    if (voip.responseKEYs[0] == 1){
      //Accept Case by VoIP
      changeRes = await statusControl.doChangeCaseStatus(1, 2, caseId, radioId, 'Radio Accept by VoIP App');
    } else if (voip.responseKEYs[0] == 3) {
      //Reject Case by VoIP
      changeRes = await statusControl.doChangeCaseStatus(1, 3, caseId, radioId, 'Radio Reject by VoIP App');
    } else if (voip.responseKEYs[0] == 4) {
      changeRes = await doChangeCaseStatusMany(radioId, 2);
    } else if (voip.responseKEYs[0] == 6) {
      changeRes = await doChangeCaseStatusMany(radioId, 3);
    }
    await Voip.removeTaskByCaseId(caseId);
  }
  res.json({status: {code: 200}, voip: {response: {key: key}}, change: {result: changeRes}});
});

app.post('/callradio', async function(req, res) {
  log.info('call params => ' + JSON.stringify(req.body));
  const caseId = '1000';
  let hospitalCode = req.body.hospitalCode;
  let urgentCode = req.body.urgentCode;
  let msisdn = req.body.msisdn;
  let voiceTransactionId = uti.doCreateVoiceTranctionId();

  const voiceCallURLFmt = 'https://202.28.68.6/callradio/callradio.php?transactionid=%s&caseid=%s&urgentcode=%s&hospitalcode=%s&msisdn=%s';
  let voiceCallURL = uti.fmtStr(voiceCallURLFmt, voiceTransactionId, caseId, urgentCode, hospitalCode, msisdn);
  let voiceData = 'inc_id=' + caseId + '&transaction_id=' + voiceTransactionId +'&phone_number=' + msisdn + '&hosp_code=' + hospitalCode + '&urgent_type=' + urgentCode;
  let rqParams = {
    method: 'GET',
    uri: voiceCallURL,
    body: voiceData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }
  let voiceRes = await uti.voipRequest(rqParams)

  log.info('voiceRes => ' + JSON.stringify(voiceRes));
  res.json({status: {code: 200}, ok: 'nano'});
});

app.get('/voip/task/list', async function(req, res) {
  res.json({status: {code: 200}, tasks: Voip.getTasks()});
});

module.exports = ( taskCase, warningTask, voipTask, dbconn, monitor, webSocket ) => {
  db = dbconn;
  log = monitor;
  socket = webSocket;
  Task = taskCase;
  Warning = warningTask;
  Voip = voipTask;
  auth = require('../db/rest/auth.js')(db, log);
  lineApi = require('./mod/lineapi.js')(db, log);
  uti = require('./mod/util.js')(db, log);
  statusControl = require('../db/rest/statuslib.js')(db, log, Task, Warning, Voip, socket);
  common = require('../db/rest/commonlib.js')(db, log);
  return app;
}
