require('dotenv').config();
const crypto = require('crypto');
const jwt = require("jwt-simple");

var db, log;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const doExistUser = function(username){
  return new Promise(async function(resolve, reject) {
    const userInclude = [{model: db.usertypes, attributes: excludeColumn}, {model: db.userinfoes, attributes: excludeColumn}];
    try {
      const users = await db.users.findAll({ include: userInclude, attributes: excludeColumn, where: {	username: username}});
      if (users.length > 0) {
        resolve(users);
      } else {
        resolve([{id: undefined}]);
      }
    } catch(error) {
      log.error('auth=>doExitUserError=>' + JSON.stringify(error))
      reject(error)
    }
  });
}

const doVerifyUser = function (username, password) {
  return new Promise(function(resolve, reject) {
    doExistUser(username).then((users) => {
      if (users.length > 0) {
        if (users[0].username) {
          const isCorect = users[0].correctPassword(password);
          resolve({ result: isCorect, data: users[0] });
        } else {
          resolve({ result: false, reson: 'Invalid username or password'});
        }
      } else {
        resolve({ result: false, reson: 'Invalid username'});
      }
    });
  });
}

const doEncodeToken = function(username) {
  const oneDayAgeTime = 24 * 60 * 60 * 1000;
  //const oneDayAgeTime = 2 * 60 * 1000;
  const nowTime = new Date().getTime();
  const expTime = nowTime + oneDayAgeTime;
  const payload = {
		sub: username,
    exp: expTime,
		iat: nowTime, //มาจากคำว่า issued at time (สร้างเมื่อ)
	};
	const payloadEncode = jwt.encode(payload, process.env.SECRET_KAY);
  return payloadEncode;
};

const doDecodeToken = function(token){
  return new Promise(async function(resolve, reject) {
    //log.info('You send token => ' + token);
    const nowTime = new Date().getTime();
    const payloadDecode = jwt.decode(token, process.env.SECRET_KAY);
    //log.info('payloadDecode stringify => ' + JSON.stringify(payloadDecode));
    let yourUsername = payloadDecode.sub;
    let yourTokenExp = payloadDecode.exp;
    let yourTokenIat = payloadDecode.iat;
    if (parseFloat(yourTokenExp) > nowTime) {
      try {
        const users = await db.users.findAll({ where: {	username: yourUsername}});
        resolve(users);
      } catch(error) {
        log.info('Can not found username = ' + yourUsername);
        reject(error);
      }
    } else {
      resolve({token: {expired: true}});
    }
  });
}

const doGetShopFromId = function (id){
  return new Promise(async function(resolve, reject) {
    try {
      const hosp = await db.shops.findAll({ where: {	id: id}});
      resolve(hosp);
    } catch(error) {
      reject(error)
    }
  });
}

const doGetUsertypeById = function (typeId){
  return new Promise(async function(resolve, reject) {
    try {
      const types = await db.usertypes.findAll({ where: {	id: typeId}});
      resolve(types);
    } catch(error) {
      reject(error)
    }
  });
}

const setSaltAndPassword = user => {
  if (user.changed('password')) {
    user.salt = db.users.generateSalt()
    user.password = db.users.encryptPassword(user.password(), user.salt())
  }
}

const resetAdmin = async (username, newPassword) => {
  let yourNewPassword = 'Limparty';
  let anyuser = await db.users.findAll({ where: {	username: username}});
  let yourSalt = anyuser[0].salt();
  let yourEncryptPassword = db.users.encryptPassword(newPassword, yourSalt);
  log.info('yourEncryptPassword => ' + yourEncryptPassword);
  await db.users.update({password: yourEncryptPassword}, { where: { username: username } });
}

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;

  return {
    setSaltAndPassword,
    doExistUser,
    doVerifyUser,
    doEncodeToken,
    doDecodeToken,
    doGetShopFromId,
    doGetUsertypeById,
    resetAdmin
  }
}
