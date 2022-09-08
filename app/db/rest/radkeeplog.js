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

app.post('/select/(:caseId)', async (req, res) => {
  const orderby = [['id', 'ASC']];
  let caseId = req.params.caseId;
  let keepLogs = await db.radkeeplogs.findAll({ where: {	caseId: caseId}, order: orderby});
  res.json({status: {code: 200}, Logs: keepLogs});
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
