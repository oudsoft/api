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

app.post('/select/(:studyId)', async (req, res) => {
  let studyId = req.params.studyId;
  let aiLog = await db.radailogs.findAll({ attributes: ['seriesId', 'instanceId', 'ResultJson'], where: {	studyId: studyId}});
  res.json({status: {code: 200}, Log: aiLog});
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
