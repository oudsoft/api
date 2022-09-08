/*activateaccountapp.js*/
const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, Task, log, auth, common;

app.get('/list', (req, res) => {
  let tasks = Task.getTasks();
  res.json({status: {code: 200}, Task: tasks});
});

app.post('/new', (req, res) => {
  let accountData = req.body;
  const promiseList = new Promise(async function(resolve, reject) {
    let aTask = await Task.doCreateNewTask( accountData, (email, sendRes, triggerAt)=>{
      log.info('sendRes=>' + JSON.stringify(sendRes));
      log.info(email + '=>' + triggerAt);
    });
    resolve(aTask);
  });
  Promise.all([promiseList]).then((ob)=> {
    res.json({status: {code: 200}, Task: ob[0]});
  });
});

app.post('/activate', (req, res) => {
  let email = req.body.email;
  let username = req.body.username;
  let usertypeId = req.body.usertypeId;
  let hospitalId = req.body.hospitalId;
  const promiseList = new Promise(async function(resolve, reject) {
    let aTask = await Task.findTaskByEmail(email);
    if (aTask) {
      //log.info('aTask Data =>' + JSON.stringify(aTask));
      let newUserinfo = {
        User_NameEN: aTask.data.User_NameEN,
        User_LastNameEN: aTask.data.User_LastNameEN,
        User_NameTH: aTask.data.User_NameTH,
        User_LastNameTH: aTask.data.User_LastNameTH,
        User_Email: aTask.data.User_Email,
        User_Phone: aTask.data.User_Phone,
        User_LineID: aTask.data.User_LineID,
        User_PathRadiant: aTask.data.User_PathRadiant
      };
      let adUserinfo = await db.userinfoes.create(newUserinfo);
      let newUser = {username: aTask.data.username, password: aTask.data.password, usertypeId: usertypeId, hospitalId: hospitalId, userinfoId: adUserinfo.id};
      log.info('newUser =>' + JSON.stringify(newUser));
      let adUser = await db.users.create(newUser);
      let userstatuses = await auth.doGetUserstatusActive();
      adUser.setUserstatus(userstatuses[0]);
      if (usertypeId == 4) {
        let newUserProfile = {Profile: common.defaultRadioProfile};
        let adUserProfile = await db.userprofiles.create(newUserProfile);
        await db.userprofiles.update({userId: adUser.id}, { where: { id: adUserProfile.id } });
      }
      resolve({email: email});
    } else {
      resolve();
    }
  });
  Promise.all([promiseList]).then((ob)=> {
    res.json({status: {code: 200}, Task: ob[0]});
  });
});

module.exports = ( activateTask, dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  Task = activateTask;
  auth = require('../db/rest/auth.js')(db, log);
  common = require('../db/rest/commonlib.js')(db, log);
  return app;
}
