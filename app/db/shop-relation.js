require('dotenv').config();
const Sequelize = require('sequelize');
const crypto = require('crypto')
const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
const sequelize = new Sequelize( process.env.SHOP_DB_NAME, process.env.SHOP_DB_USERNAME, process.env.SHOP_DB_PASSWORD,
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

const Def = require('./model/shopmodel-def.js');

const shops = sequelize.define('shops',  Def.ShopShopDef);

const usertypes = sequelize.define('usertypes', Def.ShopUserTypeDef);

const users = sequelize.define('users', Def.ShopUserDef);

users.generateSalt = function() {
  return crypto.randomBytes(16).toString('base64')
}
users.encryptPassword = function(plainText, salt) {
  return crypto.createHash('RSA-SHA256').update(plainText).update(salt).digest('hex');
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
  return  encryptYourPassword === this.password()
}

const userinfoes = sequelize.define('userinfoes', Def.ShopUserInfoDef);
users.belongsTo(shops);
users.belongsTo(usertypes);
users.belongsTo(userinfoes);

const menugroups = sequelize.define('menugroups', Def.ShopMenuGroupDef);
menugroups.belongsTo(shops);

const menuitems = sequelize.define('menuitems', Def.ShopMenuItemDef);
menuitems.belongsTo(menugroups);
menuitems.belongsTo(shops);

const customers = sequelize.define('customers', Def.ShopCustomerDef);
customers.belongsTo(shops);

const orders = sequelize.define('orders', Def.ShopOrderDef);
orders.belongsTo(shops);
orders.belongsTo(customers);
orders.belongsTo(users);
orders.belongsTo(userinfoes);

const invoices = sequelize.define('invoices', Def.ShopInvoiceDef);
invoices.belongsTo(shops);
invoices.belongsTo(orders);
invoices.belongsTo(users);
invoices.belongsTo(userinfoes);

const paytypes = sequelize.define('paytypes', Def.ShopPaytypeDef);

const payments = sequelize.define('payments', Def.ShopPaymentDef);
payments.belongsTo(shops);
payments.belongsTo(orders);
payments.belongsTo(paytypes);
payments.belongsTo(users);
payments.belongsTo(userinfoes);

const bills = sequelize.define('bills', Def.ShopBillDef);
bills.belongsTo(shops);
bills.belongsTo(orders);
bills.belongsTo(users);
bills.belongsTo(userinfoes);

const taxinvoices = sequelize.define('taxinvoices', Def.ShopTaxInvoiceDef);
taxinvoices.belongsTo(shops);
taxinvoices.belongsTo(orders);
taxinvoices.belongsTo(users);
taxinvoices.belongsTo(userinfoes);

const templates = sequelize.define('templates', Def.ShopTemplateDef);
templates.belongsTo(shops);

module.exports =  {
  sequelize,
  Op,
  Def,
  shops,
  usertypes,
  users,
  userinfoes,
  menugroups,
  menuitems,
  customers,
  orders,
  paytypes,
  payments,
  invoices,
  bills,
  taxinvoices,
  templates
}
