const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, Ris, log, auth, tasks, common;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };
/*
  RIS User
  Token = eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJyaXN1c2VyIiwiaWF0IjoxNjA4ODc5NzIxMTg0fQ.HM3ADA9p7Mtv0nAR47hKYSHhogsZoImSG3OAPuKnGMI
*/
//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const count = await Ris.count();
          const ris = await Ris.findAll({ attributes: excludeColumn});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({Result: "OK", Records: ris, TotalRecordCount: count});
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

//Add API
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if ((ur.length > 0) && (ur.token.expired)){
        let newRisData = {RisData: req.body};
        let adRis = await Ris.create(newRisData);
        let accNo = adRis.RisData.AccessionNo;
        let hn = adRis.RisData.Hn;
        let newResultText = adRis.RisData.ResultText;
        const cases = await db.cases.findAll({attributes: ['id', 'casestatusId'], where: {Case_ACC: accNo}});
        if ((cases) && (cases.length > 0)) {
          //กรณีมีเคสรองรับ
          let caseId = cases[0].id;
          const caseres = await db.caseresponses.findAll({attributes: ['id', 'Response_Text'], where: {caseId: caseId}});
          if ((caseres) && (caseres.length > 0)) {
            let casestatusId = cases[0].casestatusId;
            let remark = 'Change Result Text by Envision\nfrom=> ';
            remark += caseres[0].Response_Text + '\nto=> ';
            remark += newResultText;
            let newKeepLog = { caseId : caseId,	userId : ur.id, from : casestatusId, to : casestatusId, remark : remark};
            await common.doCaseChangeStatusKeepLog(newKeepLog);
            const resultTextChange = { Response_Text: newResultText};
            await db.caseresponses.update(resultTextChange, { where: { id: caseres[0].id } });
            //ผลอ่านที่ถูกแก้ไข ถูกนำไปใช้ในหน้า opencase ของ radio ส่วน backward ประวัติการตรวจ
          }
        } else {
          //กรณีไม่มีเคสรองรับ
          //ยังไม่ต้องทำอะไร
        }
        res.json({status: {code: 200, Result: "OK"}});
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

//Update API
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        //const id = req.body.id;
        const id = 1;
        let updateRis = {RisData: req.body};
        await Ris.update(updateRis, { where: { id: id } });
        res.json({Result: "OK"});
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

//Delete API
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const id = req.body.id;
        await Ris.destroy({ where: { id: id } });
        res.json({Result: "OK"});
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

module.exports = ( dbconn, monitor, casetask ) => {
  db = dbconn;
  log = monitor;
  tasks = casetask;
  auth = require('./auth.js')(db, log);
  common = require('./commonlib.js')(db, log, tasks);
  Ris = db.risinterfaces;
  return app;
}
