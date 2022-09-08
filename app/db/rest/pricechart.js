/* pricechart.js */
const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(bodyParser.json({ limit: "50MB", type:'application/json', extended: true}));
app.use(bodyParser.urlencoded({limit: '50MB', type:'application/x-www-form-urlencoded', extended: true}));

var db, log, auth, uti;

const excludeColumn = { exclude: ['updatedAt'] };

//Download API
app.post('/download', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const hospitalId = req.body.hospitalId;
        const pricecharts = await db.pricecharts.findAll({ attributes: ['Prices'], where: {hospitalId: hospitalId}});
        const prices = pricecharts[0].Prices;

        const XLSX = require('xlsx');
    		const ws = XLSX.utils.json_to_sheet(prices);
    		const wb = XLSX.utils.book_new();
    		XLSX.utils.book_append_sheet(wb, ws, 'PRDF');
        const downloadDir = path.join(__dirname, '../../../', process.env.AIDOWNLOAD_DIR);
        const xlsxFileName = uti.genUniqueID() + '.xlsx';
        const downloadPath = process.env.AIDOWNLOAD_PATH + '/' + xlsxFileName;
        const xlsxFilePath = downloadDir + '/' + xlsxFileName;
        log.info('xlsxFilePath=> ' + xlsxFilePath);
    		XLSX.writeFile(wb, xlsxFilePath);
        setTimeout(()=>{
          res.json({status: {code: 200}, download: {link: downloadPath, file: xlsxFileName}, prdf: prices});
        }, 2400)
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

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const priceCharts = await db.pricecharts.findAll({ attributes: excludeColumn, order: [['id', 'ASC']]});
        res.json({status: {code: 200}, Records: priceCharts});
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
app.post('/select', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const hospitalId = req.body.hospitalId;
        const pricechart = await db.pricecharts.findAll({ attributes: excludeColumn, where: {hospitalId: hospitalId}});
        res.json({status: {code: 200}, Records: pricechart});
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

//Find Post API
app.post('/find', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const hospitalId = req.body.hospitalId;
        const scanpartId = req.body.scanpartId;
        const pricecharts = await db.pricecharts.findAll({attributes: ['Prices'], where: {hospitalId: hospitalId}});
        let prTarget = await pricecharts[0].Prices.find((item)=>{
          if (item.id === scanpartId) return item;
        });
        log.info('prTarget=>'+ JSON.stringify(prTarget));
        let prdf = {pr: {normal: prTarget.PR}, df: {normal: prTarget.DF, night: prTarget.DF_Night}}
        res.json({status: {code: 200}, prdf: prdf});
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

//Find Get API
app.get('/find', async (req, res) => {
  const hospitalId = req.query.hospitalId;
  const scanpartId = req.query.scanpartId;
  const pricecharts = await db.pricecharts.findAll({attributes: ['Prices'], where: {hospitalId: hospitalId}});
  //log.info('pricecharts=>'+ JSON.stringify(pricecharts));
  if ((pricecharts.length > 0) && (pricecharts[0].Prices)) {
    let prTarget = await pricecharts[0].Prices.find((item)=>{
      if (item.id === scanpartId) return item;
    });
    log.info('prTarget=>'+ JSON.stringify(prTarget));
    let prdf = {pr: {normal: prTarget.PR}, df: {normal: prTarget.DF, night: prTarget.DF_Night}}
    res.json({status: {code: 200}, prdf: prdf});
  } else {
    res.json({status: {code: 203}});
  }
});

//Add API
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let hospitalId = req.body.hospitalId;
        let prices = req.body.prices;
        let adPriceChart = await db.pricecharts.create({Prices: prices});
        await db.pricecharts.update({hospitalId: hospitalId}, { where: { id: adPriceChart.id } });
        res.json({status: {code: 200}, PriceChart: adPriceChart});
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

//Update API
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let hospitalId = req.body.hospitalId;
        let prices = req.body.prices;
        await db.pricecharts.update({Prices: prices}, { where: { hospitalId: hospitalId } });
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

//Delete API
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let hospitalId = req.body.hospitalId;
        await db.pricecharts.destroy({ where: { hospitalId: hospitalId } });
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

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  uti = require('../../lib/mod/util.js')(db, log);
  return app;
}
