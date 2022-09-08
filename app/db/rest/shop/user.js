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

const excludeColumn = { exclude: [ 'updatedAt', 'createdAt'] };

//
app.get('/(:userId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const userId = req.params.userId;
          const anyUser = await db.users.findAll({ attributes: ['id', 'userinfoId', 'usertypeId'], where: {id: userId}});
          const yourUser = await db.userinfoes.findAll({ where: {id: anyUser[0].userinfoId}});
          let record = {user: anyUser[0], info: yourUser[0], type: anyUser[0].usertypeId}
          res.json({status: {code: 200}, Record: record});
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

app.post('/verifyusername/(:username)', async (req, res) => {
  const username = req.params.username;
  const password = req.body.password;
  auth.doVerifyUser(username, password).then((result) => {
    res.json({status: {code: 200}, result: result});
  }).catch ((err) => {
    res.json({status: {code: 500}, error: err});
  });
});

//List By Shop
app.post('/list/by/shop/(:shopId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let shopId = req.params.shopId;
        const orderby = [['id', 'ASC']];
        const userInclude = [{model: db.userinfoes, attributes: excludeColumn}, {model: db.usertypes, attributes: excludeColumn}];
        const users = await db.users.findAll({attributes: excludeColumn, include: userInclude, where: {shopId: shopId}, order: orderby});
        res.json({status: {code: 200}, Records: users});
      } else {
        log.info('Authorization Wrong.');
        res.json({status: {code: 400}, error: 'Your authorization wrong'});
      }
    });
  } else {
    log.info('Empty Token.');
    res.json({status: {code: 400}, error: 'Empty Token'});
  }
});

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const shopId = req.query.shopId;
          const usertypeId = req.query.usertypeId;
          const userInclude = [{model: db.userinfoes, attributes: excludeColumn}];
          let whereClouse;
          if (usertypeId) {
            if (usertypeId > 0) {
              whereClouse = {shopId: shopId, usertypeId: usertypeId};
            } else {
              whereClouse = {shopId: shopId};
            }
          } else {
            whereClouse = {shopId: shopId};
          }
          const users = await db.users.findAll({attributes: excludeColumn, include: userInclude, where: whereClouse});
          const result = [];
          users.forEach((user, i) => {
            let tempUser = {shopId: user.shopId, userId: user.id, username: user.username, usertypeId: user.usertypeId};
            if (user.userinfo) {
              tempUser.infoId = user.userinfo.id,
              tempUser.NameEN = user.userinfo.User_NameEN;
              tempUser.LastNameEN = user.userinfo.User_LastNameEN;
              tempUser.NameTH = user.userinfo.User_NameTH;
              tempUser.LastNameTH = user.userinfo.User_LastNameTH;
              tempUser.Email = user.userinfo.User_Email;
              tempUser.Phone = user.userinfo.User_Phone;
              tempUser.LineID = user.userinfo.User_LineID;
            }
            result.push(tempUser);
          });
          res.json({Result: "OK", Records: result});
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
/*
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
*/
        try {
          let newUsername = req.body.username;
          auth.doExistUser(newUsername).then(async (users) => {
            log.info('users=>' + JSON.stringify(users));
            if ((users.length === 0) || (!users[0].username)) {
              let shopId = req.body.shopId;
              try {
                auth.doGetShopFromId(shopId).then((shops) => {
                  let usertypeId = req.body.usertypeId;
                  auth.doGetUsertypeById(usertypeId).then(async(usertypes) => {
                    let newUserinfo = {
                      User_NameEN: req.body.User_NameEN,
                      User_LastNameEN: req.body.User_LastNameEN,
                      User_NameTH: req.body.User_NameTH,
                      User_LastNameTH: req.body.User_LastNameTH,
                      User_Email: req.body.User_Email,
                      User_Phone: req.body.User_Phone,
                      User_LineID: req.body.User_LineID,
                    };
                    let adUserinfo = await db.userinfoes.create(newUserinfo);
                    log.info('adUserinfo => ' + JSON.stringify(adUserinfo));
                    let newUser = {username: req.body.username, password: req.body.password};
                    let adUser = await db.users.create(newUser);
                    log.info('adUser => ' + JSON.stringify(adUser));
                    adUser.setShop(shops[0]);
                    adUser.setUsertype(usertypes[0]);
                    adUser.setUserinfo(adUserinfo);
                    const yourToken = auth.doEncodeToken(newUsername);
                    res.json({status: {code: 200}, token: yourToken });
                  });
                });
              } catch(error) {
                log.error(error);
                res.json({status: {code: 500}, error: error});
              }
            } else {
              res.json({status: {code: 200}, error: {why: 'your username is duplicate on DB'}});
            }
          });
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
      	}
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

//update api
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let userId, infoId;
        try {
          let updateUser = req.body.data;
          userId = req.body.id;
          infoId = req.body.userinfoId;
          await db.userinfoes.update(updateUser, { where: { id: infoId } });
          //await db.users.update({usertypeId: updateUser.usertypeId}, { where: { id: userId } });
          res.json({status: {code: 200}, Result: "OK"});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
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

//delete api
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let userId, infoId;
        try {
          userId = req.body.id;
          let anyUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: userId}});
          infoId = anyUser[0].userinfoId;
          await db.userinfoes.destroy({ where: { id: infoId } });
          await db.users.destroy({ where: { id: userId } });
          res.json({Result: "OK", status: {code: 200}});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
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

app.post('/resetpassword', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let yourUserId = req.body.userId;
          let yourNewPassword = req.body.password;
          if (yourUserId){
            let yourUser = await db.users.findAll({ where: {	id: yourUserId}});
            let yourSalt = yourUser[0].salt();
            let yourEncryptPassword = db.users.encryptPassword(yourNewPassword, yourSalt);
            log.info('yourEncryptPassword => ' + yourEncryptPassword);
            await db.users.update({password: yourEncryptPassword}, { where: { id: yourUserId } });
            res.json({status: {code: 200}});
          } else {
            res.json({status: {code: 203}, result: 'Your userId is undefined.'});
          }
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

module.exports = ( dbconn, monitor, casetask) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  return app;
}
