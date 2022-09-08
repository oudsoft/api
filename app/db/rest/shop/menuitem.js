const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, log, auth, lkQRgen;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const doGenOptions = function(shopId, gropId) {
  return new Promise(function(resolve, reject) {
    const promiseList = new Promise(async function(resolve, reject) {
      const menuitems = await db.menuitems.findAll({ attributes: ['id', 'MenuName'], where: {shopId: shopId, menugroupId: gropId}});
      const result = [];
      menuitems.forEach((group, i) => {
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
          const menuInclude = [{model: db.menugroups, attributes: ['id', 'GroupName']}];
          const menuitems = await db.menuitems.findAll({attributes: excludeColumn, include: menuInclude, where: {shopId: shopId}, order: orderby});
          res.json({status: {code: 200}, Records: menuitems});
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
app.post('/select/(:itemId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let itemId = req.params.itemId;
          const menuitems = await db.menuitems.findAll({ attributes: excludeColumn, where: {id: itemId}});
          res.json({status: {code: 200}, Record: menuitems[0]});
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
        let newItem = req.body.data;
        let adItem = await db.menuitems.create(newItem);
        await db.menuitems.update({shopId: req.body.shopId, menugroupId: req.body.groupId}, {where: {id: adItem.id}});
        const menuInclude = [{model: db.menugroups, attributes: ['id', 'GroupName']}];
        const menuitems = await db.menuitems.findAll({ attributes: excludeColumn, include: menuInclude, where: {id: adItem.id}});
        res.json({Result: "OK", status: {code: 200}, Record: menuitems[0]});
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
        let updateItem = req.body.data;
        await db.menuitems.update(updateItem, { where: { id: req.body.id } });
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
        const menuitems = await db.menuitems.findAll({ attributes: ['MenuPicture'], where: {id: req.body.id}});
        let updateGroup = req.body.data;
        await db.menuitems.update(updateGroup, { where: { id: req.body.id } });
        res.json({Result: "OK", status: {code: 200}});
        if ((menuitems.length > 0) && (menuitems[0].MenuPicture)) {
          let shopPubDir = path.join(__dirname, '../../../../');
          let delteFilePath = shopPubDir + menuitems[0].MenuPicture.substr(1);
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
        await db.menuitems.destroy({ where: { id: req.body.id } });
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

app.get('/options/(:shopId)/(:groupId)', (req, res) => {
  let shopId = req.params.shopId;
  let groupId = req.params.groupId
  doGenOptions(shopId, groupId).then((result) => {
    res.json(result);
  })
});

app.post('/options/(:shopId)/(:groupId)', async (req, res) => {
  let shopId = req.params.shopId;
  let groupId = req.params.groupId
  doGenOptions(shopId, groupId).then((result) => {
    res.json(result);
  })
});

app.post('/qrcode/create/(:menuId)', (req, res) => {
  let menuId = req.params.menuId;
  let lkText = 'https://radconnext.tech/shop/scanaccess/?mid=' + menuId;
  lkQRgen.doCreateLKQRCode(lkText).then(async(qrCode)=>{
    await db.menuitems.update({QRCodePicture: qrCode.qrName}, { where: { id: menuId } });
    res.json(qrCode);
  });
});

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  lkQRgen = require('../../../lib/shop/lk-qrcode.js')(log);
  return app;
}
