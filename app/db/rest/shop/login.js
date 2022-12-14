const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, log, auth;

app.get('/', (req, res) => {
  res.json({status: {code: 200}, login: 'failed', why: 'This API don\'t support HTTPT GET Method'});
});

app.post('/', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  auth.doVerifyUser(username, password).then((result) => {
    //log.info('your result => ' + JSON.stringify(result));
    if (result.result === true) {
      const yourToken = auth.doEncodeToken(username);
      res.json({status: {code: 200}, success: true, token: yourToken, data: result.data });
    } else {
      res.json({status: {code: 200}, success: false});
    }
  }).catch ((err) => {
    res.json({status: {code: 500}, error: err});
  });
});

app.post('/newtoken', (req, res) => {
  const username = req.body.username;
  auth.doExistUser(username).then((ur) => {
    if ((ur.length > 0) && (ur[0].username === username)) {
      const yourNewToken = auth.doEncodeToken(username);
      res.json({status: {code: 200}, success: true, token: yourNewToken, data: ur[0] });
    } else {
      res.json({status: {code: 200}, success: false});
    }
  }).catch ((err) => {
    log.error('auth.doExistUser(' + username + ') Erroe => ' + JSON.stringify(err));
    res.json({status: {code: 500}, error: err});
  });
});

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  return app;
}
