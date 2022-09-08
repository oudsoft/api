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

app.get('/select/(:topicType)/(:topicId)', async (req, res) => {
  let topicType = req.params.topicType;
  let topicId = req.params.topicId;
  let whereCondition = {
    caseId: topicId,
    topicType: topicType
  }
  let chatLog = await db.radchatlogs.findAll({ attributes: ['Log'], where: whereCondition});
  if (chatLog.length > 0){
    res.json({status: {code: 200}, Log: chatLog[0].Log});
  } else {
    res.json({status: {code: 200}, Log: []});
  }
});

app.post('/select', async (req, res) => {
  //log.info('reqBody=>' + JSON.stringify(req.body));
  let topicType = req.body.topicType;
  let topicId = req.body.topicId;
  let whereCondition = {
    caseId: topicId,
    topicType: topicType
  }
  let chatLog = await db.radchatlogs.findAll({ attributes: ['Log'], where: whereCondition});
  if (chatLog.length > 0){
    res.json({status: {code: 200}, Log: chatLog[0].Log});
  } else {
    res.json({status: {code: 200}, Log: []});
  }
});

/*
  when
  /add api
  /update api

  are work in file lib/websocket.js
*/

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  return app;
}
