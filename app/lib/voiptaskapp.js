const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, Task, log, auth;

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          Task.getTasks().then((tasks)=>{
            res.status(200).send({Result: "OK", Records: tasks});
          });
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

app.post('/select/(:caseId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let caseId = req.params.caseId;
          let thatCase = await Task.selectTaskByCaseId(caseId);
          //log.info('ThatTask=>' + JSON.stringify(thatCase));
          res.status(200).send({status: {code: 200}, Records: [thatCase]});
        } catch(error) {
          log.error(error);
          res.json({status: {code: 500}, error: error});
        }
      } else if (ur.token.expired){
        res.json({ status: {code: 210}, token: 'expired'});
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

app.post('/filter/radio/(:radioId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let radioId = req.params.radioId;
          let radioUsername = req.body.username;
          let theseCases = await Task.filterTaskByRadioUsername(radioUsername);
          //log.info('ThatTask=>' + JSON.stringify(thatCase));
          res.status(200).send({status: {code: 200}, Records: theseCases});
        } catch(error) {
          log.error(error);
          res.json({status: {code: 500}, error: error});
        }
      } else if (ur.token.expired){
        res.json({ status: {code: 210}, token: 'expired'});
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

app.get('/list', (req, res) => {
  Task.getTasks().then((tasks)=>{
    res.status(200).send({Result: "OK", Records: tasks});
  });
});

app.get('/remove/(:caseId)', (req, res) => {
  let caseId = req.params.caseId;
  Task.removeTaskByCaseId(caseId).then((tasks)=>{
    res.status(200).send({Result: "OK"});
  });
});

module.exports = ( taskVoip, dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('../db/rest/auth.js')(db, log);
  Task = taskVoip;
  return app;
}
