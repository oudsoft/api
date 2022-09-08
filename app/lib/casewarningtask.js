/* casewarningtask.js */
/*
use this task for warning 10 minute before expired
*/

function RadconWarningTask (socket, db, log) {
  const $this = this;
  const cron = require('node-cron');

	this.warningTasks = [];

  this.doCreateNewWarningTask = function (caseId, triggerTime, radioUsername, baseCaseStatusId, cb) {
    return new Promise(async function(resolve, reject) {
      let endDate = new Date(triggerTime);
      let endMM = endDate.getMonth() + 1;
      let endDD = endDate.getDate();
      let endHH = endDate.getHours();
      let endMN = endDate.getMinutes();
      let endSS = endDate.getSeconds();
      let scheduleTrigger = endSS + ' ' + endMN + ' ' + endHH + ' ' + endDD + ' ' + endMM + ' *';
      let task = cron.schedule(scheduleTrigger, function(){
        cb(caseId, socket, endDate);
      });
      let newTask = {caseId: caseId, radioUsername: radioUsername, triggerAt: endDate, task: task};

      $this.warningTasks.push(newTask);

      resolve(newTask);
    });
  }

  this.removeTaskByCaseId = function (caseId) {
    return new Promise(async function(resolve, reject) {
      let anotherTasks = await $this.warningTasks.filter((task)=>{
        if (task.caseId != caseId) {
          return task;
        }
      });
      $this.warningTasks = anotherTasks;
      resolve(anotherTasks);
    });
  }

  this.selectTaskByCaseId = function (caseId) {
    return new Promise(async function(resolve, reject) {
      let theCase = await $this.warningTasks.find((task)=>{
        if (task.caseId == caseId) {
          return task;
        }
      });
      if (theCase){
        let thisTask = {caseId: theCase.caseId, radioUsername: theCase.radioUsername, triggerAt: theCase.triggerAt};
        resolve(thisTask);
      } else {
        resolve();
      }
    });
  }

  this.getTasks = function(){
    return new Promise(async function(resolve, reject) {
      let finalTasks = [];
      await $this.warningTasks.forEach((item, i) => {
        let nwTask = {caseId: item.caseId, radioUsername: item.radioUsername, triggerAt: item.triggerAt};
        finalTasks.push(nwTask);
      });
      resolve(finalTasks);
    });
  }

}

module.exports = ( websocket, db, monitor ) => {
	const warningtask = new RadconWarningTask(websocket, db, monitor);
  return warningtask;
}
