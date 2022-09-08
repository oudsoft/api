/*activateaccounttask.js*/
function RadconActivateTask (db, log) {
  const $this = this;
  const cron = require('node-cron');
  const nodemailer = require('nodemailer');

	this.activateTasks = [];

  this.doCreateNewTask = function(accountData, callback){
    return new Promise(async function(resolve, reject) {
      let sendRes = await $this.sendActivateAccountEmail(accountData.User_Email, accountData.username);
      const startDate = new Date();
      const day = 0 * 24 * 60 * 60 * 1000;
      const hour = 1 * 60 * 60 * 1000;
      const minute = 0 * 60 * 1000;
      let endDate = new Date(startDate.getTime() + day + hour + minute);
      let endMM = endDate.getMonth() + 1;
      let endDD = endDate.getDate();
      let endHH = endDate.getHours();
      let endMN = endDate.getMinutes();
      let endSS = endDate.getSeconds();
      let scheduleTrigger = endSS + ' ' + endMN + ' ' + endHH + ' ' + endDD + ' ' + endMM + ' *';
  		let task = cron.schedule(scheduleTrigger, function(){
        callback(email, sendRes, endDate);
      });
      let newTask = {email: accountData.User_Email, username: accountData.username, endDate: endDate, data: accountData};
      $this.activateTasks.push(newTask);
      resolve(newTask);
    });
  }

  this.removeTaskByEmail = async function (email) {
    let anotherTasks = await $this.activateTasks.filter((task)=>{
      if (task.email != email) {
        return task;
      }
    });
    $this.activateTasks = anotherTasks;
  }

  this.getTasks = function(){
    return $this.activateTasks;
  }

  this.findTaskByEmail = function (email) {
    return new Promise(async function(resolve, reject) {
      let aTask = await $this.activateTasks.find((task)=>{
        if (task.email == email) {
          return task;
        }
      });
      resolve(aTask);
    });
  }

  this.sendActivateAccountEmail = function(email, username){
    return new Promise(async function(resolve, reject) {
      var transporter = nodemailer.createTransport({
        /*
        https://myaccount.google.com/security
        */
        //host: 'smtp.gmail.com',
        host: 'win05-mail.zth.netdesignhost.com',
        port: 465,
        secure: true,
        auth: {
          user: 'radconnext@smartmedinfo.co.th',
          pass: 'Radconnext@2515'
        }
      });

      var mailOptions = {
        from: 'radconnext@smartmedinfo.co.th',
        to: email,
        subject: '[no-reply]-Activate Account at Radconnext.info',
        //text: 'That was easy!'
        html: '<p><a href="https://radconnext.info/form/activatetask.html?taskId=' + email + '&username=' + username + '">คลิกที่นี่</a>เพื่อ Active บัญขีใช้งานของคุณ</p>'
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          reject(error);
        } else {
          resolve(info.response);
        }
      });
    });
  }
}


module.exports = ( db, monitor ) => {
	const activateTask = new RadconActivateTask(db, monitor);
  return activateTask;
}
