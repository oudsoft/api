/* voiptask.js */

function RadconVoipTask (socket, db, log) {
  const $this = this;
  const cron = require('node-cron');

	this.voipTasks = [];

  this.doCreateNewTaskVoip = function (caseId, username, triggerParam, radioUsername, cb) {
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
      log.info('VoIP scheduleTrigger => ' + scheduleTrigger);
  		let task = cron.schedule(scheduleTrigger, function(){
        log.info('VoIP start trigger => ' + caseId);
        cb(caseId, socket, endDate);
      });
      let responseKEYs = [];
      let newTask = {caseId: caseId, username: username, radioUsername: radioUsername, triggerAt: endDate, responseKEYs: responseKEYs, task: task};

      $this.voipTasks.push(newTask);
      resolve(newTask);
    });
  }

  this.removeTaskByCaseId = function (caseId) {
    return new Promise(async function(resolve, reject) {
      let anotherTasks = await $this.voipTasks.filter((task)=>{
        if (task.caseId != caseId) {
          return task;
        }
      });
      $this.voipTasks = anotherTasks;
      resolve(anotherTasks);
    });
  }

  this.selectTaskByCaseId = function (caseId) {
    return new Promise(async function(resolve, reject) {
      let theCase = await $this.voipTasks.find((task)=>{
        if (task.caseId == caseId) {
          return task;
        }
      });
      if (theCase){
        let thisTask = {caseId: theCase.caseId, username: theCase.username, radioUsername: theCase.radioUsername, triggerAt: theCase.triggerAt, responseKEYs: theCase.responseKEYs};
        resolve(thisTask);
      } else {
        resolve();
      }
    });
  }

  this.filterTaskByRadioUsername = function (radioUserName) {
    return new Promise(async function(resolve, reject) {
      let yourcases = await $this.voipTasks.filter((task)=>{
        if (task.radioUsername == radioUserName) {
          return task;
        }
      });
      let fmtTasks = [];
      await yourcases.forEach((task, i) => {
        let thisTask = {caseId: task.caseId, username: task.username, radioUsername: task.radioUsername, triggerAt: task.triggerAt, responseKEYs: task.responseKEYs};
        fmtTasks.push(thisTask);
      });
      resolve(fmtTasks);
    });
  }

  this.filterTaskByUsername = function (userName) {
    return new Promise(async function(resolve, reject) {
      let yourcases = await $this.voipTasks.filter((task)=>{
        if (task.username == userName) {
          return task;
        }
      });
      let fmtTasks = [];
      await yourcases.forEach((task, i) => {
        let thisTask = {caseId: task.caseId, username: task.username, radioUsername: task.radioUsername, triggerAt: task.triggerAt, responseKEYs: task.responseKEYs};
        fmtTasks.push(thisTask);
      });
      resolve(fmtTasks);
    });
  }

  this.getTasks = function(){
    return new Promise(async function(resolve, reject) {
      let finalTasks = [];
      await $this.voipTasks.forEach((item, i) => {
        let nwTask = {caseId: item.caseId, username: item.username, radioUsername: item.radioUsername, triggerAt: item.triggerAt, responseKEYs: item.responseKEYs};
        finalTasks.push(nwTask);
      });
      resolve(finalTasks);
    });
  }

  this.doAppendNewKEY = function(key){
    return new Promise(async function(resolve, reject) {
      let myTask = await $this.selectTaskByCaseId(caseId);
      if ((myTask) && (myTask.caseId)){
        myTask.responseKEYs.push(key);
      }
      resolve(myTask);
    });
  }

  this.getKEYs = function(caseId){
    return new Promise(async function(resolve, reject) {
      let myTask = await $this.selectTaskByCaseId(caseId);
      let key = [];
      if ((myTask) && (myTask.caseId)){
        key = myTask.responseKEYs;
      }
      resolve(key);
    });
  }
}

module.exports = ( websocket, db, monitor ) => {
	const taskvoip = new RadconVoipTask(websocket, db, monitor);
  return taskvoip;
}
