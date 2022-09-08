const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const request = require('request-promise');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const express = require('express');
const app = express();

var db, log, auth, uti, socket;

const sendBugReportByEmail = function(email, bugreport){
  return new Promise(async function(resolve, reject) {
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'oudsoft@gmail.com',
        pass: 'oud@2515'
      }
    });
    var mailOptions = {
      from: 'oudsoft@gmail.com',
      to: email,
      subject: subject,
      html: msgHtml
    };
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        log.info('send mail error => ' + JSON.stringify(error));
        reject(error);
      } else {
        resolve(info.response);
      }
    });
  });
}


app.post('/report/email', function(req, res) {
  let email = req.body.email;
  let bugreport = req.body.bugreport;
  sendBugReportByEmail(email, bugreport).then((sendRes)=>{
    res.status(200).send({status: {code: 200}, response: sendRes});
  }).catch((err)=>{
    res.status(500).send({status: {code: 500},error: err});
  });
});

module.exports = ( dbconn, monitor, webSocket ) => {
  db = dbconn;
  log = monitor;
  socket = webSocket;
  auth = require('../db/rest/auth.js')(db, log);
  uti = require('./mod/util.js')(db, log);
  return app;
}
