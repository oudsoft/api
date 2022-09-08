/*whomtask.js*/
function RadconWhomTask (socket, db, log) {
  const $this = this;
	this.whomTasks = [];

  const cron = require('node-cron');

  this.doCreateNewTaskConsult = function(consultId, username, triggerParam, radioUsername, hospitalName, baseConsultStatusId, cb){
    return new Promise(async function(resolve, reject) {
      const startDate = new Date();
      const day = Number(triggerParam.dd) * 24 * 60 * 60 * 1000;
      const hour = Number(triggerParam.hh) * 60 * 60 * 1000;
      const minute = Number(triggerParam.mn) * 60 * 1000;
      let endDate = new Date(startDate.getTime() + day + hour + minute);
      let endMM = endDate.getMonth() + 1;
      let endDD = endDate.getDate();
      let endHH = endDate.getHours();
      let endMN = endDate.getMinutes();
      let endSS = endDate.getSeconds();
      let scheduleTrigger = endSS + ' ' + endMN + ' ' + endHH + ' ' + endDD + ' ' + endMM + ' *';
      log.info('scheduleTrigger=> ' + scheduleTrigger);
  		let task = cron.schedule(scheduleTrigger, function(){
        cb(consultId, socket, endDate);
      });
      let newTask = {consultId: consultId, username: username, radioUsername: radioUsername, triggerAt: endDate, task: task};

      $this.whomTasks.push(newTask);

      let msg = 'You have a new Consult of ' + hospitalName + '. This your consult will be acceptation expired at ' + endDate.getFullYear() + '-' + endMM + '-' + endDD + ' : ' + endHH + '.' + endMN;
      let notify = {type: 'notify', message: msg, consultId: consultId, consultstatusId: baseConsultStatusId};
      let canSend = await socket.sendMessage(notify, radioUsername);
      /*
      if (canSend) {
        msg = 'The Radiologist of your new consult can receive message of this your consult, And this consult will be expired at ' + endDate.getFullYear() + '-' + endMM + '-' + endDD + ' : ' + endHH + '.' + endMN;
      } else {
        msg = 'The Radiologist of your new consult can not receive message of this your consult, But this consult will be expire at ' + endDate.getFullYear() + '-' + endMM + '-' + endDD + ' : ' + endHH + '.' + endMN;
      }
      notify = {type: 'notify', message: msg, consultId: consultId, consultstatusId: baseConsultStatusId};
      await socket.sendMessage(notify, username);
      */
      resolve(newTask);
    });
  }

  this.removeTaskByConsultId = function (consultId) {
    return new Promise(async function(resolve, reject) {
      let anotherWhoms = await $this.whomTasks.filter((whom)=>{
        if (whom.consultId != consultId) {
          return whom;
        }
      });
      $this.whomTasks = anotherWhoms;
      resolve(anotherWhoms);
    });
  }

  this.selectTaskByConsultId = function (consultId) {
    return new Promise(async function(resolve, reject) {
      let theCase = await $this.whomTasks.find((task)=>{
        if (task.consultId == consultId) {
          return task;
        }
      });
      if (theCase){
        let thisTask = {consultId: theCase.consultId, username: theCase.username, radioUsername: theCase.radioUsername, triggerAt: theCase.triggerAt};
        resolve(thisTask);
      } else {
        resolve();
      }
    });
  }

  this.getWhoms = function(){
    return $this.whomTasks;
  }
}

module.exports = ( websocket, db, monitor ) => {
	const taskwhom = new RadconWhomTask(websocket, db, monitor);
  return taskwhom;
}
