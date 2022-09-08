require('dotenv').config();
const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

var db, User, log, auth;

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

///////////////////////////////////////////////////////

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

app.get('/', async function(req, res) {
  const hostname = req.headers.host;
	const rootname = req.originalUrl.split('/')[1];
	//log.info('hostname => ' + hostname);
	//log.info('rootname => ' + rootname);
  try {
		const users = await db.users.findAll();
		res.json({ users })
	} catch(error) {
		log.error(error)
	}
});
app.get('/select/(:userId)', async (req, res) => {
	const userId = req.params.userId;
  const userInclude = [{ model: db.hospitals, attributes: excludeColumn}, {model: db.usertypes, attributes: excludeColumn}, {model: db.userstatuses, attributes: excludeColumn}, {model: db.userinfoes, attributes: excludeColumn}];
	try {
		const users = await db.users.findAll({ include: userInclude, attributes: excludeColumn, where: {	id: userId}});
    const radioUserLines = await db.lineusers.findAll({ attributes: ['UserId'], where: {userId: userId}});
		res.json({user: users, lineusers: radioUserLines});
	} catch(error) {
		log.error(error)
	}
});
app.get('/searchusername/(:username)', async (req, res) => {
	const username = req.params.username;
  //const userInclude = [db.hospitals, db.usertypes, db.userstatuses, db.userinfoes];
  const userInclude = [{model: db.userinfoes, attributes: excludeColumn}];
	try {
		const user = await db.users.findAll({	include: userInclude, attributes: excludeColumn, where: {	username: username}});
    //log.info('user=>' + JSON.stringify(user));
    if ((user) && (user.length == 0)) {
      res.json({status: {code: 200}, result: true, reson: 'Valid username'});
    } else if ((user) && (user.length > 0)) {
		  res.json({status: {code: 200}, result: (user.length > 0), email: user[0].userinfo.User_Email, id: user[0].id});
    } else {
      res.json({status: {code: 200}, result: false, reson: 'Invalid username'});
    }
	} catch(error) {
		log.error(error)
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
app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  auth.doVerifyUser(username, password).then((result) => {
    if (result.result === true) {
      const yourToken = auth.doEncodeToken(username);
      res.json({status: {code: 200}, login: 'success', token: yourToken });
    } else {
      res.json({status: {code: 200}, login: 'failed',});
    }
  }).catch ((err) => {
    res.json({status: {code: 500}, error: err});
  });
});
app.put('/changepassword', async (req, res) => {
  let token = req.headers.authorization;
  if (token !== 'null') {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let yourNewPassword = req.body.password;
          let yourUser = await User.findAll({ where: {	username: ur[0].username}});
          let yourSalt = yourUser[0].salt();
          let yourEncryptPassword = User.encryptPassword(yourNewPassword, yourSalt);
          log.info('yourEncryptPassword => ' + yourEncryptPassword);
          await User.update({password: yourEncryptPassword}, { where: { username: ur[0].username } });
          res.json({status: {code: 200}});
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
app.post('/resetpassword', async (req, res) => {
  let token = req.headers.authorization;
  if (token !== 'null') {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let yourUserId = req.body.userId;
          let yourNewPassword = req.body.password;
          if (yourUserId){
            let yourUser = await User.findAll({ where: {	id: yourUserId}});
            let yourSalt = yourUser[0].salt();
            let yourEncryptPassword = User.encryptPassword(yourNewPassword, yourSalt);
            log.info('yourEncryptPassword => ' + yourEncryptPassword);
            await User.update({password: yourEncryptPassword}, { where: { id: yourUserId } });
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

app.get('/gentoken/(:username)', (req, res) => {
  const username = req.params.username;
  const yourToken = auth.doEncodeToken(username);
  res.json({status: {code: 200}, token: yourToken});
});
app.post('/', function(req, res) {
  let newUsername = req.body.username;
  auth.doExistUser(newUsername).then(async (users) => {
    if (users.length === 0) {
      let hospitalId = req.body.hospitalId;
      try {
        auth.doGetHospitalFromId(hospitalId).then((hospitals) => {
          let usertypeId = req.body.usertypeId;
          auth.doGetUsertypeById(usertypeId).then((usertypes) => {
            auth.doGetUserstatusActive().then(async (userstatuses) => {
              let newUserinfo = {
                User_NameEN: req.body.User_NameEN,
              	User_LastNameEN: req.body.User_LastNameEN,
              	User_NameTH: req.body.User_NameTH,
              	User_LastNameTH: req.body.User_LastNameTH,
              	User_Email: req.body.User_Email,
              	User_Phone: req.body.User_Phone,
              	User_LineID: req.body.User_LineID,
              	User_PathRadiant: req.body.User_PathRadiant
              };
              let adUserinfo = await db.userinfoes.create(newUserinfo);
              log.info('adUserinfo => ' + JSON.stringify(adUserinfo));
              let newUser = {username: req.body.username, password: req.body.password};
              let adUser = await db.users.create(newUser);
              log.info('adUser => ' + JSON.stringify(adUser));
              adUser.setHospital(hospitals[0]);
              adUser.setUsertype(usertypes[0]);
              adUser.setUserstatus(userstatuses[0]);
              adUser.setUserinfo(adUserinfo);
              const yourToken = auth.doEncodeToken(newUsername);
              res.json({status: {code: 200}, token: yourToken });
            });
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
});
app.post('/info', function(req, res) {
  let token = req.headers.authorization;
  let yourPayload = auth.doDecodeToken(token);
  let yourUsername = yourPayload.sub;
  log.info('yourUsername => ' + JSON.stringify(yourUsername));
  auth.doExistUser(yourUsername).then(async (users) => {
    log.info('users => ' + JSON.stringify(users));
    if (users.length > 0) {
      const newInfo = req.body;
      let adInfo = await db.userinfoes.create(newInfo);
      res.json({ userinfo: adInfo }) // Returns the new user that is created in the database
    } else {
      res.json({status: {code: 200}, error: {why: 'your username incorrect'}});
    }
  });
});
app.put('/(:userId)', async function(req, res) {
  const userId = req.params.userId;
  try {
    await User.update(req.body, { where: { id: userId } });
    res.json({status: {code: 200}});
  } catch(error) {
		log.error(error)
	}
});
app.put('/settype/(:userId)/(:typeId)', async function(req, res) {
  const userId = req.params.userId;
  const typeId = req.params.typeId;
  try {
    const user = await db.users.findAll({	where: {	id: userId}});
    const type = await db.usertypes.findAll({	where: {	id: typeId}});
    await user[0].setUsertype(type[0]);
    res.json({status: {code: 200}});
  } catch(error) {
		log.error(error)
	}
});
app.put('/setstatus/(:userId)/(:statusId)', async function(req, res) {
  const userId = req.params.userId;
  const statusId = req.params.statusId;
  try {
    const user = await db.users.findAll({	where: {	id: userId}});
    const status = await db.userstatuses.findAll({	where: {	id: statusId}});
    await user[0].setUserstatus(status[0]);
    res.json({status: {code: 200}});
  } catch(error) {
		log.error(error)
	}
});
app.put('/sethospital/(:userId)/(:hospitalId)', async function(req, res) {
  const userId = req.params.userId;
  const hospitalId = req.params.hospitalId;
  try {
    const user = await db.users.findAll({	where: {	id: userId}});
    const hospital = await db.hospitals.findAll({	where: {	id: hospitalId}});
    await user[0].setHospital(hospital[0]);
    res.json({status: {code: 200}});
  } catch(error) {
		log.error(error)
	}
});
app.put('/setinfo/(:userId)/(:infoId)', async function(req, res) {
  const userId = req.params.userId;
  const infoId = req.params.infoId;
  try {
    const user = await db.users.findAll({	where: {	id: userId}});
    const info = await db.userinfoes.findAll({	where: {	id: infoId}});
    await user[0].setUserinfo(info[0]);
    res.json({status: {code: 200}});
  } catch(error) {
		log.error(error)
	}
});
app.delete('/(:userId)', async function(req, res) {
  const userId = req.params.userId;
  try {
    let n = await User.destroy({ where: { id: userId } });
    log.info(`number of deleted rows: ${n}`);
		res.json({users: n})
	} catch(error) {
		log.error(error)
	}
});

app.get('/randomusername', async function(req, res) {
  function randomArg() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  function verifyUsername(yourUsername) {
    return new Promise(async function(resolve, reject) {
      let users = await auth.doExistUser(yourUsername);
      if ((users.length > 0) && ((Object.keys(users[0]).length > 0) && (users[0].username))) {
        let newUsername = 'USER' + randomArg() + randomArg();
        newUsername = await verifyUsername(newUsername);
      } else {
        resolve({username: yourUsername});
      }
    });
  }
	let newUsername = 'USER' + randomArg() + randomArg();
  newUsername = await verifyUsername(newUsername);
  res.json({status: {code: 200}, random: {username: newUsername.username}});
});
//email exist api
app.post('/email', async (req, res) => {
  let userEmail = req.body.email;
  let username = req.body.username;
  const users = await db.users.findAll({	attributes: ['id', 'username', 'userinfoId'], where: {	username: username}});
  const profiles = await db.userinfoes.findAll({attributes: excludeColumn, where: { User_Email: userEmail } });
  if (users[0].userinfoId == profiles[0].id) {
    res.json({status: {code: 200}, data: {userId: users[0].id, username: users[0].username, email: profiles[0].User_Email}});
  } else {
    res.json({status: {code: 200}, data: {}});
  }
});
//Exist Email
app.post('/email/exist', async (req, res) => {
  let userEmail = req.body.email;
  const profiles = await db.userinfoes.findAll({attributes: ['User_Email'], where: { User_Email: userEmail } });
  res.json({status: {code: 200}, data: profiles});
});
app.get('/nextsipphonenumber/(:usertypeId)', async function(req, res) {
  const usertypeId = req.params.usertypeId;
  const userInclude = [{model: db.userinfoes, attributes: ['User_SipPhone']}];
  const sipPhones = await db.users.findAll({	include: userInclude, attributes: ['id', 'usertypeId'], where: {usertypeId: usertypeId}});

  let sipMax = 0;
  const promiseList = new Promise(async function(resolve, reject) {
    sipPhones.forEach((item, i) => {
      if (Number(item.userinfo.User_SipPhone) > sipMax){
        sipMax = Number(item.userinfo.User_SipPhone);
      }
    });
    setTimeout(()=> {
      let sipNext = (sipMax + 1);
      resolve(sipNext);
    },500);
  });
  Promise.all([promiseList]).then((ob)=> {
    res.json({status: {code: 200}, sipNext: ob[0]});
  });
});

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  //User = db.sequelize.define('users', db.Def.RadUserDef);
  User = db.users;
  auth = require('./auth.js')(db, log);
  return app;
}
