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

const doSearchOrder = function(whereCluase, orderby) {
  return new Promise(async function(resolve, reject) {
    const orderInclude = [{model: db.customers, attributes: ['id', 'Name', 'Address', 'Tel']}, {model: db.userinfoes, attributes: ['id', 'User_NameEN', 'User_LastNameEN', 'User_NameTH', 'User_LastNameTH', 'User_Phone', 'User_LineID']}];
    const orders = await db.orders.findAll({include: orderInclude, where: whereCluase, order: orderby});
    const promiseList = new Promise(async function(resolve2, reject2) {
      let orderList = [];
      for (let i=0; i < orders.length; i++){
        let order = orders[i];
        let newOrder = {};
        if (order.Status == 1) {
          newOrder = order
          orderList.push(newOrder);
        } else if (order.Status == 2) {
          let invoices = await db.invoices.findAll({attributes: excludeColumn, where: {orderId: order.id}});
          newOrder = JSON.parse(JSON.stringify(order));
          if (invoices.length > 0) {
            newOrder.invoice = invoices[0];
          }
          orderList.push(newOrder);
        } else if (order.Status == 3) {
          let invoices = await db.invoices.findAll({attributes: excludeColumn, where: {orderId: order.id}});
          let bills = await db.bills.findAll({attributes: excludeColumn, where: {orderId: order.id}});
          let payments = await db.payments.findAll({attributes: excludeColumn, where: {orderId: order.id}});
          newOrder = JSON.parse(JSON.stringify(order));
          if (invoices.length > 0) {
            newOrder.invoice = invoices[0];
          }
          if (bills.length > 0) {
            newOrder.bill = bills[0];
          }
          if (payments.length > 0) {
            newOrder.payment = payments[0];
          }
          orderList.push(newOrder);
        } else if (order.Status == 4) {
          let invoices = await db.invoices.findAll({attributes: excludeColumn, where: {orderId: order.id}});
          let bills = await db.bills.findAll({attributes: excludeColumn, where: {orderId: order.id}});
          let taxinvoices = await db.taxinvoices.findAll({attributes: excludeColumn, where: {orderId: order.id}});
          let payments = await db.payments.findAll({attributes: excludeColumn, where: {orderId: order.id}});
          newOrder = JSON.parse(JSON.stringify(order));
          if (invoices.length > 0) {
            newOrder.invoice = invoices[0];
          }
          if (bills.length > 0) {
            newOrder.bill = bills[0];
          }
          if (taxinvoices.length > 0) {
            newOrder.taxinvoice = taxinvoices[0];
          }
          if (payments.length > 0) {
            newOrder.payment = payments[0];
          }
          orderList.push(newOrder);
        } else if (order.Status == 0) {
          newOrder = order
          orderList.push(newOrder);
        }
      }
      setTimeout(()=> {
        resolve2(orderList);
      },800);
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
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
          const whereCluase = {shopId: shopId};
          const orderDate = req.body.orderDate;
          if (orderDate) {
            let fromDateWithZ = new Date(orderDate);
            let toDateWithZ = new Date(orderDate);
            toDateWithZ.setDate(toDateWithZ.getDate() + 1);
            whereCluase.createdAt = { [db.Op.between]: [new Date(fromDateWithZ), new Date(toDateWithZ)]};
          }

          let orederRecords = await doSearchOrder(whereCluase, orderby);
          res.json({status: {code: 200}, Records: orederRecords});

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

app.post('/list/by/user/(:userId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const orderby = [['id', 'ASC']];
          const userId = req.params.userId;
          const whereCluase = {userId: userId};
          const orderDate = req.body.orderDate;
          if (orderDate) {
            let fromDateWithZ = new Date(orderDate);
            let toDateWithZ = new Date(orderDate);
            toDateWithZ.setDate(toDateWithZ.getDate() + 1);
            whereCluase.createdAt = { [db.Op.between]: [new Date(fromDateWithZ), new Date(toDateWithZ)]};
          }
          let orederRecords = await doSearchOrder(whereCluase, orderby);
          res.json({status: {code: 200}, Records: orederRecords});
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

app.post('/list/by/customer/(:customerId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const orderby = [['id', 'DESC']];
          const customerId = req.params.customerId;
          const whereCluase = {customerId: customerId};
          const orderDate = req.body.orderDate;
          if (orderDate) {
            let fromDateWithZ = new Date(orderDate);
            let toDateWithZ = new Date(orderDate);
            toDateWithZ.setDate(toDateWithZ.getDate() + 1);
            whereCluase.createdAt = { [db.Op.between]: [new Date(fromDateWithZ), new Date(toDateWithZ)]};
          }
          let orederRecords = await doSearchOrder(whereCluase, orderby);
          res.json({status: {code: 200}, Records: orederRecords});
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
app.post('/select/(:orderId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let orderId = req.params.orderId;
          const orderInclude = [{model: db.customers, attributes: ['id', 'Name', 'Address', 'Tel', 'Mail']}, {model: db.userinfoes, attributes: ['id', 'User_NameEN', 'User_LastNameEN', 'User_NameTH', 'User_LastNameTH', 'User_Phone', 'User_LineID']}];
          const orders = await db.orders.findAll({ attributes: excludeColumn, include: orderInclude, where: {id: orderId}});
          res.json({status: {code: 200}, Record: orders[0]});
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
        let newOrder = req.body.data;
        let adOrder = await db.orders.create(newOrder);
        await db.orders.update({shopId: req.body.shopId, customerId: req.body.customerId, userId: req.body.userId, userinfoId: req.body.userinfoId}, {where: {id: adOrder.id}});
        res.json({Result: "OK", status: {code: 200}, Records: [adOrder]});
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
        let updateOrder = req.body.data;
        await db.orders.update(updateOrder, { where: { id: req.body.id } });
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
        await db.orders.destroy({ where: { id: req.body.id } });
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

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  return app;
}
