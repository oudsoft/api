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

const doGenOptions = function() {
  return new Promise(function(resolve, reject) {
    const promiseList = new Promise(async function(resolve, reject) {
      const shops = await db.shops.findAll({ attributes: ['id', 'Shop_Name'] });
      const result = [];
      shops.forEach((shop, i) => {
        result.push({Value: shop.id, DisplayText: shop.Shop_Name});
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
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const orderby = [['id', 'ASC']];
          const shops = await db.shops.findAll({attributes: excludeColumn, order: orderby});
          res.json({status: {code: 200}, Records: shops});
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
app.post('/select/(:shopId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let shopId = req.params.shopId;
          const shops = await db.shops.findAll({ attributes: excludeColumn, where: {id: shopId}});
          res.json({status: {code: 200}, Record: shops[0]});
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
/*
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
*/

        let newShop = req.body;
        let adShop = await db.shops.create(newShop);

        let newGroup = {GroupName: 'Default Group', GroupPicture: '/shop/favicon.ico'};
        let adGroup = await db.menugroups.create(newGroup);
        await db.menugroups.update({shopId: adShop.id}, {where: {id: adGroup.id}});

        res.json({Result: "OK", status: {code: 200}, Records: [adShop]});
/*
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
*/
});

//Update Hospital API
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let updateShop = req.body.data;
        await db.shops.update(updateShop, { where: { id: req.body.id } });
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
        let updateShop = req.body.data;
        await db.shops.update(updateShop, { where: { id: req.body.id } });
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

//Deltete Hospital API
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        await db.shops.destroy({ where: { id: req.body.id } });
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

app.get('/options', (req, res) => {
  doGenOptions().then((result) => {
    res.json(result);
  })
});

app.post('/options', async (req, res) => {
  doGenOptions().then((result) => {
    res.json(result);
  })
});

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  return app;
}
