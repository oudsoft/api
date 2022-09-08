const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, log, auth;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const doGenOptions = function(shopId) {
  return new Promise(function(resolve, reject) {
    const promiseList = new Promise(async function(resolve, reject) {
      const menugroups = await db.menugroups.findAll({ attributes: ['id', 'GroupName'], where: {shopId: shopId} });
      const result = [];
      menugroups.forEach((group, i) => {
        result.push({Value: group.id, DisplayText: group.GroupName});
      });
      setTimeout(()=> {
        resolve({Result: "OK", Options: result});
      },200);
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
    }).catch((err)=>{
      reject(err);
    });
  });
}

//List API
app.post('/list/by/shop/(:shopId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const orderby = [['id', 'ASC']];
          const shopId = req.params.shopId;
          const menugroups = await db.menugroups.findAll({attributes: excludeColumn, where: {shopId: shopId}, order: orderby});
          res.json({status: {code: 200}, Records: menugroups});
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
app.post('/select/(:groupId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let groupId = req.params.groupId;
          const menugroups = await db.menugroups.findAll({ attributes: excludeColumn, where: {id: groupId}});
          res.json({status: {code: 200}, Record: menugroups[0]});
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

//Add New Hospital API
app.post('/add', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let newGroup = req.body.data;
        let adGroup = await db.menugroups.create(newGroup);
        await db.menugroups.update({shopId: req.body.shopId}, {where: {id: adGroup.id}});
        res.json({Result: "OK", status: {code: 200}});
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

//Update Hospital API
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let updateGroup = req.body.data;
        await db.menugroups.update(updateGroup, { where: { id: req.body.id } });
        res.json({Result: "OK", status: {code: 200}});
      } else if (ur.token.expired){
        res.json({status: {code: 210}, token: {expired: true}});
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

app.post('/change/logo', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const menugroups = await db.menugroups.findAll({ attributes: ['GroupPicture'], where: {id: req.body.id}});
        let updateGroup = req.body.data;
        await db.menugroups.update(updateGroup, { where: { id: req.body.id } });
        res.json({Result: "OK", status: {code: 200}});
        if ((menugroups.length > 0) && (menugroups[0].GroupPicture)) {
          let shopPubDir = path.join(__dirname, '../../../../');
          let delteFilePath = shopPubDir + menugroups[0].GroupPicture.substr(1);
          if (fs.existsSync(delteFilePath)) {
            await fs.unlinkSync(delteFilePath);
          }
        }
      } else if (ur.token.expired){
        res.json({status: {code: 210}, token: {expired: true}});
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

//Deltete Hospital API
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        await db.menugroups.destroy({ where: { id: req.body.id } });
        res.json({Result: "OK", status: {code: 200}});
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

app.get('/options/(:shopId)', (req, res) => {
  let shopId = req.params.shopId;
  doGenOptions(shopId).then((result) => {
    res.json(result);
  })
});

app.post('/options/(:shopId)', async (req, res) => {
  let shopId = req.params.shopId;
  doGenOptions(shopId).then((result) => {
    res.json(result);
  })
});

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  return app;
}
