const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, Template, log, auth, common;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const doFindMatchHospital = function(){
  return new Promise(async function(resolve, reject) {

  });
}

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const raduserId = req.body.userId;
          const template = await Template.findAll({attributes: excludeColumn, where: {userId: raduserId}});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({ status: {code: 200}, Records: template});
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

//Select API
app.post('/select/(:templateId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const templateId = req.params.templateId;
          const template = await Template.findAll({attributes: ['id', 'Name', 'Content', 'Modality', 'StudyDescription', 'ProtocolName', 'Hospitals', 'AutoApply'], where: {id: templateId}});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({ status: {code: 200}, Record: template});
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

//add api
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let radioId = req.body.radioId;
        let newTemplate = req.body.data;
        let autoApply = newTemplate.AutoApply;
        if (autoApply == 1) {
          let findSome = await common.doActiveAutoApply(newTemplate, radioId);
          await findSome.forEach(async(some, i) => {
            await Template.update({AutoApply: 0}, { where: { id: some.id } });
          });
        }

        let adTemplate = await Template.create(newTemplate);
        await Template.update({userId: radioId}, { where: { id: adTemplate.id } });
        res.json({ status: {code: 200}, Record: adTemplate});
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

//update api
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let radioId = req.body.radioId;
        let upTemplate = req.body.data;
        let autoApply = upTemplate.AutoApply;
        if (autoApply == 1) {
          let findSome = await common.doActiveAutoApply(upTemplate, radioId);
          await findSome.forEach(async(some, i) => {
            await Template.update({AutoApply: 0}, { where: { id: some.id } });
          });
        }

        await Template.update(upTemplate, { where: { id: req.body.id } });
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

//delete api
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        await Template.destroy({ where: { id: req.body.id } });
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

app.post('/autoapply/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let autoApply = req.body.data;
        let templateId = req.body.id;
        let radioId = req.body.radioId;
        if (autoApply.AutoApply == 1) {
          let templateData = await Template.findAll({attributes: ['id', 'Name', 'Modality', 'StudyDescription', 'ProtocolName', 'Hospitals', 'AutoApply'], where: {id: templateId}});
          let findSome = await comon.doActiveAutoApply(templateData[0], radioId);
          await findSome.forEach(async(some, i) => {
            await Template.update({AutoApply: 0}, { where: { id: some.id } });
          });
        }
        await Template.update(autoApply, { where: { id: templateId } });
        let result = await common.doGenTemplateOptions(radioId);
        res.json({status: {code: 200}, result: result});
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

app.post('/check/duplicate', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let radioId = req.body.radioId;
        let templateData = req.body.data;
        let findSome = await common.doActiveAutoApply(templateData, radioId);
        let autoApplyDup = await findSome.find((some, i) => {
          if (some.AutoApply == 1) {
            return some;
          }
        });
        res.json({ status: {code: 200}, result: autoApplyDup});
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

app.get('/options/(:raduserId)', (req, res) => {
  const raduserId = req.params.raduserId;
  common.doGenTemplateOptions(raduserId).then((result) => {
    res.json(result);
  })
});

app.post('/options/(:raduserId)', (req, res) => {
  const raduserId = req.params.raduserId;
  common.doGenTemplateOptions(raduserId).then((result) => {
    res.json(result);
  })
});

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  common = require('./commonlib.js')(db, log);
  Template = db.templates;
  return app;
}
