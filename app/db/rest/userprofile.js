const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, UserProfile, log, auth, common;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

//load defaultRadioProfile
app.get('/default', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          res.json({status: {code: 200}, default: common.defaultRadioProfileV2});
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

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const limit = req.query.jtPageSize;
          const startAt = req.query.jtStartIndex;
          const count = await UserProfile.count();
          const types = await UserProfile.findAll({offset: startAt, limit: limit, attributes: excludeColumn});
          res.json({Result: "OK", Records: types, TotalRecordCount: count});
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

//select
app.post('/select/(:userId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let userId = req.params.userId;
          const profile = await UserProfile.findAll({attributes: excludeColumn, where: { userId: userId } });
          res.json({status: {code: 200}, Record: profile});
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

//insert
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let newUserProfile = {Profile: req.body.data};
        let userId = req.body.userId;
        let adUserProfile = await UserProfile.create(newUserProfile);
        await UserProfile.update({userId: userId}, { where: { id: adUserProfile.id } });
        res.json({status: {code: 200}, Record: adUserProfile});
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

//update
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let updateUserProfile = {Profile: req.body.data};
        await UserProfile.update(updateUserProfile, { where: { userId: req.body.userId } });
        res.json({status: {code: 200}});
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else if (ur.token.expired){
    res.json({ status: {code: 210}, token: {expired: true}});
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//delete
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        await UserProfile.destroy({ where: { id: req.body.id } });
        res.json({status: {code: 200}});
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

app.get('/restruct', (req, res) => {
  const promiseList = new Promise(async function(resolve2, reject2) {
    let updateReses = [];
    const profiles = await UserProfile.findAll({attributes: ['Profile', 'userId'] });
    profiles.forEach(async (profile, i) => {
      log.info('userId=>' + profile.userId);
      log.info('org profile =>' + JSON.stringify(profile));
      let newProfile = {};
      log.info('start new profile =>' + JSON.stringify(newProfile));

      newProfile.readyState = profile.Profile.readyState;
      newProfile.readyBy = common.defaultRadioProfileV2.readyBy;

      newProfile.activeState = {};
      newProfile.lockState = {};
      newProfile.offlineState = {};

      newProfile.activeState.autoAcc = profile.Profile.autoacc;
      newProfile.activeState.autoReady = common.defaultRadioProfileV2.activeState.autoReady;
      newProfile.activeState.webNotify = profile.Profile.casenotify.webmessage;
      newProfile.activeState.lineNotify = profile.Profile.casenotify.line;
      newProfile.activeState.phoneCall = common.defaultRadioProfileV2.activeState.phoneCall;
      newProfile.activeState.phoneCallOptions = common.defaultRadioProfileV2.activeState.phoneCallOptions;

      newProfile.lockState.autoLockScreen = profile.Profile.screen.lock;
      newProfile.lockState.passwordUnlock = profile.Profile.screen.unlock;
      newProfile.lockState.lineNotify = common.defaultRadioProfileV2.lockState.lineNotify
      newProfile.lockState.phoneCall = common.defaultRadioProfileV2.lockState.phoneCall;
      newProfile.lockState.phoneCallOptions = common.defaultRadioProfileV2.lockState.phoneCallOptions;

      newProfile.offlineState.autoLogout = common.defaultRadioProfileV2.offlineState.autoLogout;
      newProfile.offlineState.lineNotify = common.defaultRadioProfileV2.offlineState.lineNotify
      newProfile.offlineState.phoneCall = common.defaultRadioProfileV2.offlineState.phoneCall;
      newProfile.offlineState.phoneCallOptions = common.defaultRadioProfileV2.offlineState.phoneCallOptions;

      log.info('final new profile =>' + JSON.stringify(newProfile));
      let updateRes = await UserProfile.update({Profile: newProfile}, { where: { userId: profile.userId } });
      updateReses.push(updateRes);
    });
    setTimeout(()=>{
      resolve2(updateReses);
    }, 10000);
  });
  Promise.all([promiseList]).then((ob)=> {
    log.info('updateReses=>' + JSON.stringify(ob[0]));
    res.json({status: {code: 200}, result: ob[0]});
  });
});

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  common = require('./commonlib.js')(db, log);
  UserProfile = db.userprofiles;
  return app;
}
