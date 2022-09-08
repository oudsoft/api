/*resetpwdapp.js*/
const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, Task, log;

app.get('/list', (req, res) => {
  let tasks = Task.getTasks();
  res.json({status: {code: 200}, Task: tasks});
});

app.post('/new', (req, res) => {
  let email = req.body.email;
  let username = req.body.username;
  let userId = req.body.userId;
  const promiseList = new Promise(async function(resolve, reject) {
    let aTask = await Task.doCreateNewTask(email, username, userId, (email, sendRes, triggerAt)=>{
      log.info('sendRes=>' + JSON.stringify(sendRes));
      log.info(email + '=>' + triggerAt);
    });
    resolve(aTask);
  });
  Promise.all([promiseList]).then((ob)=> {
    res.json({status: {code: 200}, Task: ob[0]});
  });
});

app.post('/reset', (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let username = req.body.username;
  const promiseList = new Promise(async function(resolve, reject) {
    let aTask = await Task.findTaskByEmail(email);
    if (aTask) {
      let yourUser = await db.users.findAll({ where: {username: username}});
      let yourSalt = yourUser[0].salt();
      let yourEncryptPassword = db.users.encryptPassword(password, yourSalt);
      await db.users.update({password: yourEncryptPassword}, { where: { username: username } });
      await Task.removeTaskByEmail(email);
      resolve({email, username});
    } else {
      resolve();
    }
  });
  Promise.all([promiseList]).then((ob)=> {
    res.json({status: {code: 200}, Task: ob[0]});
  });
});

module.exports = ( resetTask, dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  Task = resetTask;
  return app;
}
