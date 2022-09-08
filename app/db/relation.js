require('dotenv').config();
const Sequelize = require('sequelize');
const crypto = require('crypto')
const log = require('electron-log');
//const moment = require('moment');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
/*
const dburl = 'postgres://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@' + process.env.DB_SERVER_DOMAIN + ':' + process.env.DB_SERVER_PORT + '/' + process.env.DB_NAME;
log.info(dburl);
const sequelize = new Sequelize(dburl, {
  logging: function (str) {
    log.info(str);
  },
  dialectOptions:{
    dateStrings: true,
    typeCast: true,
    useUTC: false
  },
  timezone: 'Asia/Bangkok'
});
*/
//sequelize.sync({ logging: log.info });
const sequelize = new Sequelize( process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD,
{
  logging: function (str) {
    log.info(str);
  },
  host: process.env.DB_SERVER_DOMAIN,
  port: process.env.DB_SERVER_PORT,
  dialect: "postgresql",
  dialectOptions: {
    // useUTC: false, //for reading from database
    dateStrings: true,
    typeCast: true,
    timezone: "+07:00"
  },
  timezone: "+07:00", //for writing to database
  operatorsAliases: false
});

const Op = Sequelize.Op;

sequelize.authenticate().then(() => {
	log.info('Connection has been established successfully.');
}).catch(err => {
	log.error('Unable to connect to the database:', err);
});

const Def = require('./model/model-def.js');

const hospitals = sequelize.define('hospitals',  Def.RadHospitalDef);

const usertypes = sequelize.define('usertypes', Def.RadUserTypeDef);

const userstatuses = sequelize.define('userstatuses', Def.RadUserStatusDef);

const users = sequelize.define('users', Def.RadUserDef);

users.generateSalt = function() {
  return crypto.randomBytes(16).toString('base64')
}
users.encryptPassword = function(plainText, salt) {
  return crypto
    .createHash('RSA-SHA256')
    .update(plainText)
    .update(salt)
    .digest('hex')
}
const setSaltAndPassword = user => {
  if (user.changed('password')) {
    user.salt = users.generateSalt()
    user.password = users.encryptPassword(user.password(), user.salt())
  }
}
users.beforeCreate(setSaltAndPassword)
users.beforeUpdate(setSaltAndPassword)
users.prototype.correctPassword = function(enteredPassword) {
  const encryptYourPassword = users.encryptPassword(enteredPassword, this.salt());
  /*
  log.info('this password => ' + this.password())
  log.info('enteredPassword=>' + enteredPassword);
  log.info('encryptYourPassword=>' + encryptYourPassword);
  */
  return  encryptYourPassword === this.password()
}

const userinfoes = sequelize.define('userinfoes', Def.RadUserInfoDef);
users.belongsTo(hospitals);
users.belongsTo(usertypes);
users.belongsTo(userstatuses);
users.belongsTo(userinfoes);

const userprofiles = sequelize.define('userprofiles', Def.RadUserProfileDef);
users.hasMany(userprofiles);
//userprofiles.belongsTo(users);

const orthancs = sequelize.define('orthancs', Def.RadOrthancDef);
orthancs.belongsTo(hospitals);

const urgenttypes = sequelize.define('urgenttypes', Def.RadUrgentTypeDef);
urgenttypes.belongsTo(hospitals);

const generalstatuses = sequelize.define('generalstatuses', Def.RadGeneralStatusDef);
const cliamerights = sequelize.define('cliamerights', Def.RadCliameRightsDef);

const casestatuses = sequelize.define('casestatuses', Def.RadCaseStatusDef);
casestatuses.belongsTo(generalstatuses);

const patients = sequelize.define('patients', Def.RadPatientDef);
patients.belongsTo(hospitals);

const pricecharts = sequelize.define('pricecharts', Def.RadPriceChartDef);
pricecharts.belongsTo(hospitals);

const dicomtransferlogs = sequelize.define('dicomtransferlogs', Def.RadDicomTransferLogDef);
dicomtransferlogs.belongsTo(orthancs);

const hospitalreports = sequelize.define('hospitalreports', Def.RadHospitalReportDef);
hospitalreports.belongsTo(hospitals);

const workinghours = sequelize.define('workinghours', Def.RadWorkingHourDef);
workinghours.belongsTo(hospitals);

const workingschedules = sequelize.define('workingschedules', Def.RadWorkingScheduleDef);
workingschedules.belongsTo(hospitals);
workingschedules.belongsTo(users);

const templates = sequelize.define('templates', Def.RadTemplateDef);
templates.belongsTo(users);

const cases = sequelize.define('cases', Def.RadCaseDef);
cases.belongsTo(hospitals);
cases.belongsTo(patients);
cases.belongsTo(urgenttypes);
cases.belongsTo(cliamerights);
cases.belongsTo(casestatuses);
cases.belongsTo(users);
/*
cases.prototype.getCreatedAtWithOffset = function (offset) {
  return moment(this.created_at).utcOffset(offset);
};
*/

const caseresponses = sequelize.define('caseresponses', Def.RadCaseResponseDef);
cases.hasMany(caseresponses);
//caseresponses.belongsTo(cases);
caseresponses.belongsTo(users);

const casereports = sequelize.define('casereports', Def.RadCaseReportDef);
casereports.belongsTo(cases);
casereports.belongsTo(caseresponses);
casereports.belongsTo(users);

const lineusers = sequelize.define('lineusers', Def.RadLineUserDef);
lineusers.belongsTo(users);

const risinterfaces = sequelize.define('risinterfaces', Def. RadRisInterfaceDef);

const scanpartrefs = sequelize.define('scanpartrefs', Def. RadScanPartRefDef);

const scanpartauxs = sequelize.define('scanpartauxs', Def. RadScanPartAuxDef);
scanpartauxs.belongsTo(users);

const radkeeplogs = sequelize.define('radkeeplogs', Def.RadKeepLogDef);
radkeeplogs.belongsTo(cases);

const radchatlogs = sequelize.define('radchatlogs', Def.RadChatLogDef);

const radailogs = sequelize.define('radailogs', Def.RadAILogDef);
radailogs.belongsTo(users);

const radconsults = sequelize.define('radconsults', Def.RadConsultDef);
radconsults.belongsTo(hospitals);
radconsults.belongsTo(casestatuses);
radconsults.belongsTo(users);

module.exports =  {
  sequelize,
  Op,
  Def,
  hospitals,
  usertypes,
  userstatuses,
  users,
  userinfoes,
  userprofiles,
  orthancs,
  urgenttypes,
  generalstatuses,
  cliamerights,
  casestatuses,
  patients,
  dicomtransferlogs,
  hospitalreports,
  workinghours,
  workingschedules,
  templates,
  cases,
  caseresponses,
  casereports,
  lineusers,
  risinterfaces,
  scanpartrefs,
  scanpartauxs,
  pricecharts,
  radkeeplogs,
  radchatlogs,
  radailogs,
  radconsults
}
