const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const nodemailer = require('nodemailer');
const FormData = require('form-data');
const fetch = require('node-fetch');

var log, db, uti, lineApi;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };
const usermsg = require('../../lib/mod/usermsg.json');
/*
  channel:<wb/lb>/usertype:<tech/radio>/msgtype:<succes/error/info/info>/[...]
*/

const casestatusFlowTable = [
    /* acc = accept rej = reject upd = update */
    /* Update หมายถึงการแก้ไขข้อมูลที่เป็นเนื้อหาของเคส */
    /* Renew หมายถึงเปลี่ยนรังสีแพทย์ ซึ่งจะทำให้เคสมีสถานะเป็น new ใหม่อีกครั้ง แต่เป็นรังสีแพทย์คนใหม่(หรือคนเดมก็ได้)*/
    {now: 1, next: [2, 3, 4, 7], actions: ['accR', 'rejR', 'updH', 'cancelH', 'changeH']},
    {now: 2, next: [4, 8], actions: ['openR', 'updH']},
    {now: 3, next: [7], actions: ['cancelH', 'renewH', 'updH', 'changeH']},
    {now: 4, next: [7], actions: ['cancelH', 'renewH', 'updH', 'changeH']},
    {now: 5, next: [6, 10, 11, 12, 14], actions: ['viewH', 'printH', 'convertH', 'closeH', 'callzoomH', 'editR']},
    {now: 6, next: [12, 14], actions: ['printH', 'editR']},
    {now: 7, next: [1], actions: ['renewH', 'deleteH', 'updH', 'changeH']},
    {now: 8, next: [4, 9, 5, 13], actions: ['draftR', 'replyR']}, // <- Open
    {now: 9, next: [9, 5, 13], actions: ['replyR', 'editR']}, // <- Draft
    {now: 10, next: [11, 14], actions: ['viewH', 'printH', 'convertH', 'callzoomH', 'editR']}, // <- Owner Case View
    {now: 11, next: [6, 12, 14], actions: ['viewH', 'printH', 'convertH', 'closeH', 'editR', 'callzoomH']},
    {now: 12, next: [6, 10, 11, 13, 14], actions: ['editR', 'viewH', 'printH', 'convertH', 'closeH', 'callzoomH']},
    {now: 13, next: [6, 10, 11, 12, 14], actions: ['editR', 'viewH', 'printH', 'convertH', 'closeH', 'callzoomH']},
    {now: 14, next: [6, 10, 11, 12, 13], actions: ['editR', 'viewH', 'printH', 'convertH', 'callzoomH', 'closeH']}
];

//usertype role on casestatus.
const casestatusRightAccessTable = [
    {now: 1, next: 2, changeBy: 4},
    {now: 1, next: 3, changeBy: 4},
    {now: 1, next: 4, changeBy: 0},
    {now: 1, next: 7, changeBy: 2},
    {now: 2, next: 4, changeBy: 0},
    {now: 2, next: 8, changeBy: 4},
    {now: 3, next: 7, changeBy: 2},
    {now: 4, next: 7, changeBy: 2},
    {now: 5, next: 6, changeBy: 2},
    {now: 5, next: 10, changeBy: 2},
    {now: 5, next: 11, changeBy: 2},
    {now: 5, next: 12, changeBy: 4},
    {now: 5, next: 14, changeBy: 4},
    {now: 6, next: 12, changeBy: 4},
    {now: 6, next: 14, changeBy: 5},
    {now: 7, next: 1, changeBy: 2},
    {now: 8, next: 9, changeBy: 4},
    {now: 8, next: 5, changeBy: 4},
    {now: 8, next: 13, changeBy: 4},
    {now: 9, next: 9, changeBy: 4},
    {now: 9, next: 5, changeBy: 4},
    {now: 9, next: 13, changeBy: 4},
    {now: 10, next: 11, changeBy: 4},
    {now: 10, next: 14, changeBy: 5},
    {now: 11, next: 6, changeBy: 2},
    {now: 11, next: 12, changeBy: 4},
    {now: 11, next: 14, changeBy: 5},
    {now: 12, next: 12, changeBy: 4},
    {now: 12, next: 10, changeBy: 2},
    {now: 12, next: 11, changeBy: 2},
    {now: 13, next: 6, changeBy: 2},
    {now: 13, next: 5, changeBy: 4}
];

//usertypeId=2 can edit/update case data
const casestatusCanUpdate = [1, 2, 3, 4, 7, 8];
const newResponseStatus = [8, 9, 13];
const editResponseStatus = [5, 6, 10, 11, 12, 14];

const defaultRadioProfile = {
  readyState: 1,
  readyBy: 'user',
  screen: {
    lock: 30,
    unlock: 0
  },
  auotacc: 0,
  casenotify: {
    webmessage: 1,
    line: 1,
    autocall: 0,
    mancall:0
  }
};

const defaultRadioProfileV2 = {
  readyState: 1,
  readyBy: 'user',
  activeState: {
    autoAcc: 0,
    autoReady:0,
    webNotify: 1,
    lineNotify: 1,
    phoneCall: 0,
    phoneCallOptions: {
      manAutoOption: 1,
      optionCaseControl: {
        case1H: 0,
        case4H: 0,
        case24HL: 0,
        case24HU: 0
      }
    }
  },
  lockState: {
    autoLockScreen: 30,
    passwordUnlock: 0,
    lineNotify: 1,
    phoneCall: 0,
    phoneCallOptions: {
      manAutoOption: 1,
      optionCaseControl: {
        case1H: 0,
        case4H: 0,
        case24HL: 0,
        case24HU: 0
      }
    }
  },
  offlineState: {
    autoLogout: 0,
    lineNotify: 1,
    phoneCall: 0,
    phoneCallOptions: {
      manAutoOption: 1,
      optionCaseControl: {
        case1H: 0,
        case4H: 0,
        case24HL: 0,
        case24HU: 0
      }
    }
  }
};

const msgNewCaseRadioDetailFormat = 'เคสใหม่\nจากโรงพยาบาล %s\nผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\n';
const msgEditCaseRadioDetailFormat = 'มีการแก้ไขเคส่\nจากโรงพยาบาล %s\nผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\n';
const msgAccCaseRadioDetailPattern = 'เคสจากโรงพยาบาล %s\nผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\n';
const msgAccCaseHospitalDetailPattern = 'รังสีแพทย์ตอบรับเคสใหม่ของผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\nแล้ว และกำลังรอเปิดอ่านเคส';
const msgRejCaseHospitalDetailPattern = 'รังสีแพทย์ปฏิเสธเคสใหม่ของผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\nเสียใจด้วยตรับ แต่คุณยังสามารถส่งเคสนี้ไปหาหมอคนอื่นได้อีกนะครับ';
const msgExpCaseRadioDetailPattern = 'เคสจากโรงพยาบาล %s\nผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\nหมดเวลาแล้วครับ';
const msgExpCaseHospitalDetailPattern = 'เคสใหม่ของผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\nหมดเวลาแล้วตรับ แต่คุณยังสามารถส่งเคสนี้ไปหาหมอคนอื่นได้อีกครับ';
const msgSucCaseHospitalDetailPattern = 'รังสีแพทย์ %s %s ส่งผลเคส %s\n%s\n';
const msgUpdateCaseResultDetailPattern = 'เคส่ของผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\n';

const doCanNextStatus = function (from) {
  return new Promise(async function(resolve, reject) {
    let canDoNext = await casestatusFlowTable.find((item)=>{
      if (item.now == from) return item;
    });
    resolve(canDoNext);
  });
}

const doCanAccessStatus = function (from, to) {
  return new Promise(async function(resolve, reject) {
    let canAccess = await casestatusRightAccessTable.find((item)=>{
      if ((item.now == from) && (item.next == to)) return item;
    });
    resolve(canAccess);
  });
}

const doSearchRadioForHospital = function(hospitalId) {
  return new Promise(function(resolve, reject) {
    const promiseList = new Promise(async function(resolve, reject) {
      const userInclude = [{model: db.userinfoes, attributes: excludeColumn}];
      const radusers = await db.users.findAll({ attributes: excludeColumn, include: userInclude, where: {usertypeId: 4}});
      let rades = [];
      radusers.forEach(async (user, i) => {
        let userHospitals = JSON.parse(user.userinfo.User_Hospitals);
        let tempHos = await userHospitals.find((item)=> {
          return item.id === hospitalId;
        });
        if (tempHos) {
          let tempRdl = {Value: user.id, DisplayText: user.userinfo.User_NameTH + ' ' + user.userinfo.User_LastNameTH};
          rades.push(tempRdl);
        }
      });
      setTimeout(()=> {
        resolve(rades);
      },400);
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
    }).catch((err)=>{
      reject(err);
    });
  });
}

const doGenNewCaseOptions = function(hospitalId) {
  return new Promise(function(resolve, reject) {
    const promiseList = new Promise(async function(resolve, reject) {
      const userInclude = [{model: db.userinfoes, attributes: excludeColumn}];
      const clmes = await db.cliamerights.findAll({ attributes: ['id', 'CR_Name'] });
      const urges = await db.urgenttypes.findAll({ attributes: ['id', 'UGType_Name'], where: {hospitalId: hospitalId, UGType: 'standard'} });
      //const radusers = await db.users.findAll({ attributes: excludeColumn, include: userInclude, where: {hospitalId: hospitalId, usertypeId: 4}});
      const refusers = await db.users.findAll({ attributes: excludeColumn, include: userInclude, where: {hospitalId: hospitalId, usertypeId: 5}});
      let cliames = [];
      clmes.forEach((clm, i) => {
        let tempRad = {Value: clm.id, DisplayText: clm.CR_Name};
        cliames.push(tempRad);
      });
      let urgents = [];
      urges.forEach((urg, i) => {
        let tempUrg = {Value: urg.id, DisplayText: urg.UGType_Name};
        urgents.push(tempUrg);
      });
      /*
      let rades = [];
      radusers.forEach((user, i) => {
        let tempRdl = {Value: user.id, DisplayText: user.userinfo.User_NameTH + ' ' + user.userinfo.User_LastNameTH};
        rades.push(tempRdl);
      });
      */
      let refes = [];
      refusers.forEach((user, i) => {
        let tempRef = {Value: user.id, DisplayText: user.userinfo.User_NameTH + ' ' + user.userinfo.User_LastNameTH};
        refes.push(tempRef);
      });
      /*
      let rades = await doSearchRadioForHospital(hospitalId);
      */
      setTimeout(()=> {
        resolve({Result: "OK", Options: {cliames, urgents, /* rades,*/ refes}});
      },400);
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
    }).catch((err)=>{
      reject(err);
    });
  });
}

const doCallCaseStatusByName = function(Name) {
  return new Promise(async (resolve, reject) => {
    const casestatus = await db.casestatuses.findAll({ attributes: excludeColumn, where: {CS_Name_EN: Name} });
    resolve(casestatus);
  });
}

const doGetCaseDescription = function(caseId) {
  return new Promise(async (resolve, reject) => {
    const caseDesc = await db.cases.findAll({ attributes: ['id', 'Case_DESC'], where: {id: caseId} });
    resolve(caseDesc);
  });
}

const doLoadUserProfile = function(userId){
  return new Promise(async (resolve, reject) => {
    let userInclude = [{model: db.userinfoes, attributes: excludeColumn}, {model: db.hospitals, attributes: ['Hos_Name']}];
    let ownerCaseUsers = await db.users.findAll({attributes: excludeColumn, include: userInclude, where: {id: userId}});
    let ownerCaseUserLines = await db.lineusers.findAll({ attributes: ['id', 'UserId'], where: {userId: userId}});
    let ownerCaseUserProfile = {userId: userId, username: ownerCaseUsers[0].username, User_NameEN: ownerCaseUsers[0].User_NameEN, User_LastNameEN: ownerCaseUsers[0].User_LastNameEN, hospitalId: ownerCaseUsers[0].hospitalId, hospitalName: ownerCaseUsers[0].hospital.Hos_Name, User_NameTH: ownerCaseUsers[0].userinfo.User_NameTH, User_LastNameTH: ownerCaseUsers[0].userinfo.User_LastNameTH};
    if ((ownerCaseUserLines) && (ownerCaseUserLines.length > 0)) {
      ownerCaseUserProfile.lineUserId = ownerCaseUserLines[0].UserId;
    }
    resolve(ownerCaseUserProfile);
  });
}

const doLoadRadioProfile = function(radioId){
  return new Promise(async (resolve, reject) => {
    if (radioId){
      let userInclude = [{model: db.userinfoes, attributes: excludeColumn}];
      let radioUsers = await db.users.findAll({attributes: excludeColumn, include: userInclude, where: {id: radioId}});
      let radioUserLines = await db.lineusers.findAll({ attributes: ['id', 'UserId'], where: {userId: radioId}});
      let radioUserProfiles = await db.userprofiles.findAll({ attributes: ['Profile'], where: {userId: radioId}});
      if (radioUserProfiles.length > 0) {
        let radioLineNotify = radioUserProfiles[0].Profile.activeState.lineNotify;
        let radioAutoAcc = radioUserProfiles[0].Profile.activeState.autoAcc;
        let radioAutoCall = radioUserProfiles[0].Profile.activeState.phoneCall;
        let radioPhoneCallOptions = {
          activeState: radioUserProfiles[0].Profile.activeState.phoneCallOptions,
          lockState: radioUserProfiles[0].Profile.lockState.phoneCallOptions,
          offlineState: radioUserProfiles[0].Profile.offlineState.phoneCallOptions
        }
        let radioProfile = {userId: radioId, username: radioUsers[0].username, User_NameEN: radioUsers[0].userinfo.User_NameEN, User_LastNameEN: radioUsers[0].userinfo.User_LastNameEN, autoacc: radioAutoAcc, linenotify: radioLineNotify, User_NameTH: radioUsers[0].userinfo.User_NameTH, User_LastNameTH: radioUsers[0].userinfo.User_LastNameTH, radioAutoCall: radioAutoCall, radioPhoneNo: radioUsers[0].userinfo.User_Phone, radioPhoneCallOptions: radioPhoneCallOptions};
        if ((radioUserLines) && (radioUserLines.length > 0)) {
          radioProfile.lineUserId = radioUserLines[0].UserId;
        }
        resolve(radioProfile);
      } else {
        let newUserProfile = {Profile: defaultRadioProfile, userId: radioId};
        let adUserProfile = await db.userprofiles.create(newUserProfile);
        let radioLineNotify = newUserProfile.Profile.activeState.lineNotify;
        let radioAutoAcc = newUserProfile.Profile.activeState.autoAcc;
        let radioAutoCall = newUserProfile.Profile.activeState.phoneCall;
        let radioPhoneCallOptions = {
          activeState: newUserProfile.Profile.activeState.phoneCallOptions,
          lockState: newUserProfile.Profile.lockState.phoneCallOptions,
          offlineState: newUserProfile.Profile.offlineState.phoneCallOptions
        }
        let radioProfile = {userId: radioId, username: radioUsers[0].username, User_NameEN: radioUsers[0].userinfo.User_NameEN, User_LastNameEN: radioUsers[0].userinfo.User_LastNameEN, autoacc: radioAutoAcc, linenotify: radioLineNotify, User_NameTH: radioUsers[0].userinfo.User_NameTH, User_LastNameTH: radioUsers[0].userinfo.User_LastNameTH, radioAutoCall: radioAutoCall, radioPhoneNo: radioUsers[0].userinfo.User_Phone, radioPhoneCallOptions: radioPhoneCallOptions};
        resolve(radioProfile);
      }
    } else {
      reject({error: 'radioId is undefined can not support!'});
    }
  });
}

const doLoadCaseReport = function(caseId){
  return new Promise(async (resolve, reject) => {
    const reportCases = await db.casereports.findAll({ attributes: ['createdAt'], where: {caseId: caseId}});
    if (reportCases[0]) {
      resolve(reportCases[0]);
    } else {
      resolve();
    }
  });
}

const doCaseExpireAction = function(tasks, caseId, socket, newcaseStatusId, radioProfile, userProfile, caseMsgData, hospitalName){
  return new Promise(async (resolve, reject) => {
    const expiredStatus = await doCallCaseStatusByName('Expired');
    const targetCases = await db.cases.findAll({ attributes: excludeColumn, where: {id: caseId}});
    let fromStusId = targetCases[0].casestatusId;
    let radioId = targetCases[0].Case_RadiologistId;
    let curRadioProfile = await doLoadRadioProfile(radioId);
    const action = 'quick';

    // Update Case Status
    await targetCases[0].setCasestatus(expiredStatus[0]);

    let radioMsgFmt =  undefined;
    let ownerMsgFmt = undefined;
    if (fromStusId == 1){
      radioMsgFmt = 'ระบบปฏิเสธเคสจากโรงพยาบาล %s\nชื่อ %s\ อัติโนมัติแล้ว เนื่องจากหมดเวลา';
      ownerMsgFmt = 'รังสีแพทย์ไม่ได้ตอบรับเคสชื่อ %s\n%s\n ภายในเวลาที่กำหนด';
    } else if ((fromStusId == 2) || (fromStusId == 8)/* || (fromStusId == 9)*/){
      radioMsgFmt = 'ระบบปฏิเสธเคสจากโรงพยาบาล %s\nชื่อ %s\ อัติโนมัติแล้ว เนื่องจากหมดเวลาอ่านผล';
      ownerMsgFmt = 'รังสีแพทย์ไม่ได้เริ่มอ่านผลชื่อ %s\n%s\n ภายในเวลาที่กำหนด';
    }

    let systemId = 0;
    let newKeepLog = { caseId : caseId,	userId : systemId, from : fromStusId, to : newcaseStatusId, remark : 'Expire by Case Task on System Cron Job.'};
    doCaseChangeStatusKeepLog(newKeepLog);

    await tasks.removeTaskByCaseId(caseId);
    log.info('caseId ' + caseId + ' was expired by schedule.');

    let refreshExpCase = {type: 'refresh', statusId: expiredStatus[0].id, caseId: caseId, thing: 'case'};
    await socket.sendMessage(refreshExpCase, curRadioProfile.username);

    // Notify Case Owner Feedback
    let msg = 'Your new Case on ' + hospitalName + ' - expired';
    let notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: caseId, casestatusId: newcaseStatusId};
    await socket.sendMessage(notify, curRadioProfile.username);
    // Notify Case Radio
    msg = 'Your new Case - expired';
    notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: caseId, casestatudId: newcaseStatusId};
    await socket.sendMessage(refreshExpCase, userProfile.username);
    await socket.sendMessage(notify, userProfile.username);

    let patientNameEN = caseMsgData.patientNameEN;
    let studyDesc = caseMsgData.studyDescription;
    // Chatbot message to Radio
    if ((curRadioProfile.lineUserId) && (curRadioProfile.lineUserId !== '')) {
      //let lineCaseMsg = lineCaseDetaileMsg + 'หมดเวลาในช่วง' + intervalExpiredName + ' หากคุณต้องการใช้บริการอื่นเชิญเลือกจากเมนูครับ';
      let lineCaseMsg = uti.fmtStr(radioMsgFmt, hospitalName, patientNameEN);
      let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, action, lineApi.radioMainMenu);
      await lineApi.pushConnect(curRadioProfile.lineUserId, menuQuickReply);
    }

    // Chatbot message to Owner Case
    if ((userProfile.lineUserId) && (userProfile.lineUserId !== '')) {

      //let lineCaseMsg = uti.fmtStr(common.msgExpCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);

      let lineCaseMsg = uti.fmtStr(ownerMsgFmt, patientNameEN, studyDesc);
      let lineMsg = lineApi.createBotMenu(lineCaseMsg, action, lineApi.techMainMenu);
      await lineApi.pushConnect(userProfile.lineUserId, lineMsg);
    }

    resolve(targetCases);
  });
}

const doCreateTaskAction = function(tasks, caseId, userProfile, radioProfile, triggerParam, baseCaseStatusId, lineCaseDetaileMsg, caseMsgData){
  return new Promise(async function(resolve, reject) {
    const action = 'quick';
    log.info('The Task of caseId ' + caseId + ' will be clear and will be replace with new task.');
    await tasks.removeTaskByCaseId(caseId);

    let newTask = await tasks.doCreateNewTaskCase(caseId, userProfile.username, triggerParam, radioProfile.username, userProfile.hospitalName, baseCaseStatusId, async (caseId, socket, endDateTime)=>{
      let nowcaseStatus = await db.cases.findAll({ attributes: ['casestatusId'], where: {id: caseId}});
      if (nowcaseStatus.length > 0){
        if (nowcaseStatus[0].casestatusId === baseCaseStatusId) {
          let nextList = await doCanNextStatus(nowcaseStatus[0].casestatusId);
          log.info('nextList=> ' + JSON.stringify(nextList.next));
          const caseExpireStatusId = 4;
          let canExpired = (nextList.next.indexOf(caseExpireStatusId) >= 0);
          if (canExpired) {
            await doCaseExpireAction(tasks, caseId, socket, caseExpireStatusId, radioProfile, userProfile, caseMsgData, userProfile.hospitalName);
          } else {
            log.info('case ' + caseId + ' can not set to expire because not found its next ' + JSON.stringify(nextList.next));
          }
        } else {
          await tasks.removeTaskByCaseId(caseId);
        }
      }
    });
    let endTime = newTask.triggerAt;

    let endDateText = uti.doFormateDateTimeChatbot(endTime);

    let caseDateText = uti.doFormateDateTimeChatbot(caseMsgData.caseCreateAt);
    // Chatbot message to Radio
    if ((radioProfile.linenotify == 1) && (radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
      if (baseCaseStatusId == 1 ) {
        let dataOnCaseBot = {
          headerTitle: 'แจ้งเคสใหม่',
          caseDatetime: caseDateText,
          hospitalName: caseMsgData.hospitalName,
          urgentName: 'Due',
          expireDatetime: endDateText,
          patientName: caseMsgData.patientNameEN,
          studyDescription: caseMsgData.studyDescription
        };
        let acceptActionMenu =  [{id: 'x401', name: 'รับ', data: caseId}, {id: 'x402', name: 'ไม่รับ', data: caseId}];
        let bubbleMenu = lineApi.doCreateCaseAccBubbleReply(dataOnCaseBot, acceptActionMenu);
        await lineApi.pushConnect(radioProfile.lineUserId, bubbleMenu);
      } else if (baseCaseStatusId == 2 ) {
        /*
        ย้ายไปส่ง line notift ให้ radio ที่
        linebot -> postMeassage x401 แทน
        */
        /*
        let lineCaseMsgFmt = 'แจ้งกำหนดเวลาส่งผลอ่านของเคส\nชื่อ %s\nรพ.%s\n\nกำหนดส่งผลอ่าน %s\n\nหากคุณต้องการใช้บริการอื่นๆ เชิญเลือกจากเมนูด้านล่างครับ'
        let lineCaseMsg = uti.fmtStr(lineCaseMsgFmt, caseMsgData.patientNameEN, caseMsgData.hospitalName, endDateText);

        let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, action, lineApi.radioMainMenu);
        await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
        */
        if ((userProfile.lineUserId) && (userProfile.lineUserId !== '')) {
          let radioNameTH = radioProfile.User_NameTH;
          let radioLastNameTH = radioProfile.User_LastNameTH;
          let patientNameEN = caseMsgData.patientNameEN;
          let lineCaseMsg = uti.fmtStr('รังสีแพทย์(%s %s)รับเคส\nชื่อ %s\แล้ว', radioNameTH, radioLastNameTH, patientNameEN);
          //lineCaseMsg = lineCaseDetaileMsg  + 'ได้ถูกตอบรับโดยรังสีแพทย์เรียบร้อยแล้ว\nเคสนี้จะหมดอายุสำหรับส่งผลอ่านภายใน ' + endDateText + '\nหากคุณต้องการใช้บริการอื่นๆ เชิญเลือกจากเมนูด้านล่างครับ';
          menuQuickReply = lineApi.createBotMenu(lineCaseMsg, action, lineApi.techMainMenu);
          await lineApi.pushConnect(userProfile.lineUserId, menuQuickReply);
        }
      }
    }

    resolve(endTime);
  });
}

const doCreateTaskVoip = function(tasks, caseId, userProfile, radioProfile, triggerParam, baseCaseStatusId, caseData){
  return new Promise(async function(resolve, reject) {
    let newTask = await tasks.doCreateNewTaskVoip(caseId, userProfile.username, triggerParam, radioProfile.username, async (caseId, socket, endDateTime)=>{
      let nowcaseStatus = await db.cases.findAll({ attributes: ['casestatusId'], where: {id: caseId}});
      log.info('VoIp Task nowcaseStatus => ' + JSON.stringify(nowcaseStatus));
      if (nowcaseStatus[0].casestatusId === baseCaseStatusId) {
      //if ([2, 8].includes(nowcaseStatus[0].casestatusId)) {
        let callPhoneRes = await doRequestPhoneCalling(caseId, radioProfile, triggerParam, caseData.hospitalCode, caseData.urgentType);
        log.info('callPhoneRes => ' + JSON.stringify(callPhoneRes));
      }
    });
    let endTime = newTask.triggerAt;

    resolve(endTime);
  });
}

const doRequestPhoneCalling = function(caseId, radioProfile, triggerParam, hospitalCode, urgentType){
  return new Promise(async function(resolve, reject) {
    if ((radioProfile.radioAutoCall == 1) && (radioProfile.radioPhoneNo) && (radioProfile.radioPhoneNo !== '')) {
      /*
      let dayMn = Number(triggerParam.dd) * 24 * 60;
      let hourMn = Number(triggerParam.hh) * 60;
      let minuteMn = Number(triggerParam.mn);
      let totalMinute = dayMn + hourMn + minuteMn;
      let urgentCode = uti.doCalUrgentVoiceCall(totalMinute);
      */

      let urgentCode = urgentType;
      let voiceTransactionId = uti.doCreateVoiceTranctionId();
      let msisdn = radioProfile.radioPhoneNo;
      log.info('urgentCode=>' + urgentCode);
      if (urgentCode){
        const voiceCallURLFmt = 'https://202.28.68.6/callradio/callradio.php?transactionid=%s&caseid=%s&urgentcode=%s&hospitalcode=%s&msisdn=%s';
        let voiceCallURL = uti.fmtStr(voiceCallURLFmt, voiceTransactionId, caseId, urgentCode, hospitalCode, msisdn);
        let voiceData = 'inc_id=' + caseId + '&transaction_id=' + voiceTransactionId +'&phone_number=' + msisdn + '&hosp_code=' + hospitalCode + '&urgent_type=' + urgentCode;
        let rqParams = {
          method: 'GET',
          uri: voiceCallURL,
          body: voiceData,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
        let voiceRes = await uti.voipRequest(rqParams);
        //log.info('voiceRes=> ' + JSON.stringify(voiceRes));
        resolve(voiceRes);
      } else {
        resolve();
      }
    } else {
      resolve();
    }
  });
}

const doCreateTaskWarning = function(warnings, caseId, radioProfile, triggerTime, baseCaseStatusId, caseMsgData){
  return new Promise(async function(resolve, reject) {
    const action = 'quick';
    let newTask = await warnings.doCreateNewWarningTask(caseId, triggerTime, radioProfile.username, baseCaseStatusId, async (caseId, socket, endDateTime)=>{
      let nowcaseStatus = await db.cases.findAll({ attributes: ['casestatusId'], where: {id: caseId}});
      if (nowcaseStatus.length > 0) {
        log.info('Warning Task nowcaseStatus => ' + JSON.stringify(nowcaseStatus));
        //if (nowcaseStatus[0].casestatusId === baseCaseStatusId) {
        if ([2, 8].includes(nowcaseStatus[0].casestatusId)) {
          let msgFmt = 'เคสของผู้ป่วยชื่อ %s จากโรงพยาบาล %s เหลือเวลาส่งผลอ่านอีก 10 นาที';
          let msg = uti.fmtStr(msgFmt, caseMsgData.patientNameEN, caseMsgData.hospitalName);
          let notify = {type: 'notify', message: msg, statusId: baseCaseStatusId, caseId: caseId};
          await socket.sendMessage(notify, radioProfile.username);
          // Chatbot message to Radio
          if ((radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
            let lineCaseMsg = 'แจ้งเตือน\n\n' + msg + '\n\n' + 'ใช้งานอื่นจากเมนู';
            let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, action, lineApi.radioMainMenu);
            await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
          }
        } else {
          await warnings.removeTaskByCaseId(caseId);
        }
      }
    });
    resolve(newTask);
  });
}

const doSaveScanpartAux = function(scanpartAuxData, userId){
  return new Promise(async function(resolve, reject) {
    ////let scanpartAuxData = {StudyDesc: newCase.Case_StudyDescription,ProtocolName: newCase.Case_ProtocolName,Scanparts: newCase.Case_ScanPart};
    const whereClous = {StudyDesc: scanpartAuxData.StudyDesc, ProtocolName: scanpartAuxData.ProtocolName, userId: userId};
    const scanPartAuxs = await db.scanpartauxs.findAll({ attributes: excludeColumn, where: whereClous});
    if (scanPartAuxs.length > 0) {
      let auxId = scanPartAuxs[0].id;
      let updateData = {Scanparts: scanpartAuxData.Scanparts};
      await db.scanpartauxs.update(updateData, { where: { id: auxId } });
      resolve(scanPartAuxs[0]);
    } else {
      let adAux = await db.scanpartauxs.create(scanpartAuxData);
      await db.scanpartauxs.update({userId: userId}, { where: { id: adAux.id } });
      resolve(adAux);
    }
  });
}

const doCaseChangeStatusKeepLog = function(data) {
  return new Promise(async function(resolve, reject) {
    let newKeepLog = { caseId : data.caseId,	userId : data.userId, from : data.from, to : data.to, remark : data.remark};
    let adLog = await db.radkeeplogs.create(newKeepLog);
    resolve(adLog);
  });
}

const doCollectRadioCurrentState = function(radioId, radioUsername, socket) {
  return new Promise(async function(resolve, reject) {
    const profiles = await db.userprofiles.findAll({attributes: ['Profile'], where: { userId: radioId } });
    const radioSocket = await socket.findUserSocket(radioUsername);
    let readyState = undefined;
    if ((profiles) && (profiles.length > 0)){
      readyState = profiles[0].Profile.readyState;
    } else {
      readyState = 0;
    }
    let screenState = undefined;
    if (radioSocket) {
      screenState = {online: 1, state: radioSocket.screenstate, minute: radioSocket.counterping};
    } else {
      screenState = {online: 0};
    }
    let currentState = {
      readyState: readyState,
      screenState: screenState
    }
    resolve(currentState);
  });
}

const doSummaryBillReport = function(hospitalId, key) {
  return new Promise(async function(resolve, reject) {
    //{fromDateKeyValue: 2021-04-01 00:00:00, toDateKeyValue: 2021-04-30 23:59:59}
    let fromDateWithZ = new Date(key.fromDateKeyValue);
    let toDateWithZ = new Date(key.toDateKeyValue);
    let casewhereClous = {hospitalId: hospitalId};
    casewhereClous.createdAt = { [db.Op.between]: [new Date(fromDateWithZ), new Date(toDateWithZ)]};
    const orderby = [['createdAt', 'ASC']];
    const caseInclude = [{model: db.hospitals, attributes: ['Hos_Name']}, {model: db.patients, attributes: ['Patient_HN', 'Patient_NameEN', 'Patient_LastNameEN', 'Patient_NameTH', 'Patient_LastNameTH']}];
    const caseContents = await db.cases.findAll({attributes: ['id', 'createdAt', 'Case_ScanPart', 'Case_RadiologistId', 'Case_OrthancStudyID', 'hospitalId'], include: caseInclude, where: [casewhereClous], order: orderby});
    let finalSumaryRows = [];
    const promiseList = new Promise(function(resolve2, reject2) {
      caseContents.forEach(async (row, i) => {
        let radioRes = await doLoadRadioProfile(row.Case_RadiologistId);
        let caseReportRes = await doLoadCaseReport(row.id);
        let studyTagsRes = await db.dicomtransferlogs.findAll({attributes: ['StudyTags'], where: {ResourceID: row.Case_OrthancStudyID}});
        let radioBill = {User_NameEN: radioRes.User_NameEN, User_LastNameEN: radioRes.User_LastNameEN, User_NameTH: radioRes.User_NameTH, User_LastNameTH: radioRes.User_LastNameTH};
        let newItem = JSON.parse(JSON.stringify(row));
        newItem.radio = radioBill;
        if (caseReportRes) {
          newItem.reportCreatedAt = caseReportRes.createdAt;
        }
        if (studyTagsRes) {
          newItem.scanDate = studyTagsRes[0].StudyTags.MainDicomTags.StudyDate;
          newItem.scanTime = studyTagsRes[0].StudyTags.MainDicomTags.StudyTime;
        }
        finalSumaryRows.push(newItem);
      });
      setTimeout(()=> {
        resolve2(finalSumaryRows);
      },4000);
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
    });
  });
}

const doSelectCaseById = function(caseId){
  return new Promise(async function(resolve, reject) {
    const caseInclude = [{model: db.hospitals, attributes: ['Hos_Name']}, {model: db.patients, attributes: excludeColumn}, {model: db.casestatuses, attributes: ['id', 'CS_Name_EN']}, {model: db.urgenttypes, attributes: ['id', 'UGType', 'UGType_Name']}, {model: db.cliamerights, attributes: ['id', 'CR_Name']}];
    const cases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const casesFormat = [];
    const promiseList = new Promise(async function(resolve2, reject2) {
      cases.forEach(async (item, i) => {
        const radUser = await db.users.findAll({ attributes: ['username', 'userinfoId'], where: {id: item.Case_RadiologistId}});
        const rades = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH', 'User_Email', 'User_Phone', 'User_SipPhone'], where: {id: radUser[0].userinfoId}});
        const radioUserLines = await db.lineusers.findAll({ attributes: ['UserId'], where: {userId: item.Case_RadiologistId}});
        let radioData = undefined;
        if (radioUserLines.length > 0){
          radioData = {id: rades[0].id, User_NameTH: rades[0].User_NameTH, User_LastNameTH: rades[0].User_LastNameTH, username: radUser[0].username, email: rades[0].User_Email, phone: rades[0].User_Phone, sipphone: rades[0].User_SipPhone, LineUserId: radioUserLines[0].UserId};
        } else {
          radioData = {id: rades[0].id, User_NameTH: rades[0].User_NameTH, User_LastNameTH: rades[0].User_LastNameTH, username: radUser[0].username, email: rades[0].User_Email, phone: rades[0].User_Phone, sipphone: rades[0].User_SipPhone};
        }
        const refUser = await db.users.findAll({ attributes: ['username', 'userinfoId'], where: {id: item.Case_RefferalId}});
        const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
        const referData = {id: refes[0].id, User_NameTH: refes[0].User_NameTH, User_LastNameTH: refes[0].User_LastNameTH, username: refUser[0].username};
        const ownerUser = await db.users.findAll({ attributes: ['username', 'userinfoId'], where: {id: item.userId}});
        const owners = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: ownerUser[0].userinfoId}});
        const ownerData = {id: owners[0].id, User_NameTH: owners[0].User_NameTH, User_LastNameTH: owners[0].User_LastNameTH, username: ownerUser[0].username};
        casesFormat.push({case: item, Radiologist: radioData, Refferal: referData, Owner: ownerData});
      });
      setTimeout(()=> {
        resolve2(casesFormat);
      },500);
    });
    Promise.all([promiseList]).then((ob)=> {
      //res.json({status: {code: 200}, Records: ob[0]});
      resolve({Records: ob[0]})
    }).catch((err)=>{
      reject(err);
    });
  });
}

const doFilterPatient = function(filterParams){
  return new Promise(async function(resolve, reject) {
    const statusId = filterParams.statusId;
    const patientId = filterParams.patientId;
    const hospitalId = filterParams.hospitalId;
    const currentCaseId = filterParams.currentCaseId;
    const limit = filterParams.limit;

    const caseInclude = [{model: db.caseresponses, attributes: ['id', 'Response_HTML', 'Response_Text']}];
    const whereClous = {patientId: patientId, hospitalId: hospitalId, casestatusId: { [db.Op.in]: statusId}/*, id: { [db.Op.ne]: currentCaseId} */};
    const orderby = [['id', 'DESC']];
    let query = undefined;
    if ((limit) && (limit > 0)) {
      query = {limit: limit, attributes: ['id', 'createdAt', 'Case_BodyPart', 'Case_OrthancStudyID', 'Case_StudyInstanceUID', 'Case_PatientHRLink', 'hospitalId', 'Case_RadiologistId', 'Case_DicomZipFilename', 'casestatusId'], include: caseInclude, where: whereClous, order: orderby};
    } else {
      query = {attributes: ['id', 'createdAt', 'Case_BodyPart', 'Case_OrthancStudyID', 'Case_StudyInstanceUID', 'Case_PatientHRLink', 'hospitalId', 'Case_RadiologistId', 'Case_DicomZipFilename', 'casestatusId'], include: caseInclude, where: whereClous, order: orderby};
    }
    const patientCases = await db.cases.findAll(query);
    //res.json({status: {code: 200}, Records: patientCases});
    resolve({Records: patientCases});
  });
}

const doGenTemplateOptions = function(raduserId) {
  return new Promise(function(resolve, reject) {
    const promiseList = new Promise(async function(resolve2, reject2) {
      const hospital = await db.hospitals.findAll({ attributes: ['id', 'Hos_Name'], order: [['id', 'ASC']] });
      const template = await db.templates.findAll({ attributes: ['id', 'Name', 'Modality', 'StudyDescription', 'ProtocolName', 'Hospitals', 'AutoApply'], where: {userId: raduserId}, order: [['id', 'ASC']] });
      const result = [];
      if (template.length > 0){
        template.forEach((item, i) => {
          result.push({Value: item.id, DisplayText: item.Name, Modality: item.Modality, StudyDescription: item.StudyDescription, ProtocolName: item.ProtocolName, Hospitals: item.Hospitals, AutoApply: item.AutoApply, hospitalmap: hospital});
        });
        setTimeout(()=> {
          resolve2({ status: {code: 200}, Options: result});
        },200);
      } else {
        resolve2({ status: {code: 200}, Options: {hospitalmap: hospital}});
      }
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
    }).catch((err)=>{
      reject(err);
    });
  });
}

const doActiveAutoApply = function(templateData, radioId){
  return new Promise(async function(resolve, reject) {
    //log.info('templateData=>' + JSON.stringify(templateData));
    // setep 1. load all template of radio that match to modality
    let allModalityMatch = undefined;
    if (templateData.id) {
      allModalityMatch = await db.templates.findAll({attributes: ['id', 'Name', 'Modality', 'StudyDescription', 'ProtocolName', 'Hospitals', 'AutoApply'], where: {userId: radioId, Modality: templateData.Modality, id: { [db.Op.ne]: templateData.id }}});
    } else {
      allModalityMatch = await db.templates.findAll({attributes: ['id', 'Name', 'Modality', 'StudyDescription', 'ProtocolName', 'Hospitals', 'AutoApply'], where: {userId: radioId, Modality: templateData.Modality}});
    }
    //log.info('allModalityMatch=>' + JSON.stringify(allModalityMatch));
    // step 2. find match StudyDes
    if (allModalityMatch.length > 0) {
      let newStudyDescription = templateData.StudyDescription.toLowerCase();
      let newStudyArray = newStudyDescription.split(',');
      //log.info('newStudyArray=>' + JSON.stringify(newStudyArray));
      let matchRows = [];
      await allModalityMatch.forEach((item, i) => {
        let rowStudyDescription = item.StudyDescription.toLowerCase();
        let rowStudyArray = rowStudyDescription.split(',');
        //log.info('rowStudyArray=>' + JSON.stringify(rowStudyArray));
        let intersaction = newStudyArray.filter(Set.prototype.has, new Set(rowStudyArray));
        //log.info('intersaction=>' + JSON.stringify(intersaction));
        if (intersaction.length > 0) {
          matchRows.push(item);
        }
      });
      //log.info('matchRows=>' + JSON.stringify(matchRows));
      if (matchRows.length > 0) {
        // step 3. find same hospitalId
        let finalResult = [];
        let newHospitals = [];
        await templateData.Hospitals.forEach((item, i) => {
          newHospitals.push(item.id);
        });
        //log.info('newHospitals=>' + JSON.stringify(newHospitals));
        await matchRows.forEach(async (item, i) => {
          if (newHospitals[0] != 0) {
            if (item.Hospitals[0].id != 0) {
              let rowHospitals = [];
              await item.Hospitals.forEach((hos, ind) => {
                rowHospitals.push(hos.id);
              });
              //log.info('rowHospitals=>' + JSON.stringify(rowHospitals));
              let intersaction = newHospitals.filter(Set.prototype.has, new Set(rowHospitals));
              if (intersaction.length > 0) {
                finalResult.push(item);
              }
            } else {
              finalResult.push(item);
            }
          } else {
            finalResult.push(item);
          }
        });
        //log.info('finalResult=>' + JSON.stringify(finalResult));
        resolve(finalResult);
      } else {
        resolve(matchRows)
      }
    } else {
      resolve(allModalityMatch);
    }
  });
}

const doGenSmartTemplateOptions = function(templateData, radioId) {
  return new Promise(function(resolve, reject) {
    const promiseList = new Promise(async function(resolve2, reject2) {
      let autoFoundTms = await doActiveAutoApply(templateData, radioId);
      // <-- ต้องส่ง Template Content ด้วยไปให้ทันที
      setTimeout(()=> {
        resolve2({ status: {code: 200}, Options: autoFoundTms});
      },200);
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
    }).catch((err)=>{
      reject(err);
    });
  });
}

const nextCaseStausOnResponseChange = function(nowStatus, responseType, reportType){
  log.info('nowStatus=> ' + nowStatus);
  let nextStatus = undefined;
  //let newResponseStatus = [8, 9, 13];
  //let editResponseStatus = [5, 6, 10, 11, 12, 14];
  let isNewResponse = uti.contains.call(newResponseStatus, nowStatus);
  let isEditResponse = uti.contains.call(editResponseStatus, nowStatus);
  if (isNewResponse) {
    if (responseType === 'normal'){
      if (reportType === 'preliminary') {
        nextStatus = 13;
      } else {
        nextStatus = 5;
      }
    } else if (responseType === 'draft'){
      nextStatus = 9;
    }
  } else if (isEditResponse) {
    nextStatus = 12;
  }
  return nextStatus;
}

const doConvertPatientHistoryImage2Dicom = function(studyID, hospitalId, hostName, newImages, modality, patientNameEN, patientLastNameEN, oldImages){
  return new Promise(async function(resolve, reject) {

    const rootAppDir = path.normalize(__dirname + '/../../..');
    const usrUploadDir = uti.fmtStr('%s%s', rootAppDir, process.env.USRUPLOAD_DIR);
    const usrArchiveDir = uti.fmtStr('%s%s', rootAppDir, process.env.USRARCHIVE_DIR);

    let archiveFileName = '';
    let archiveFilePath = '';

    uti.doLoadOrthancTarget(hospitalId, hostName).then(async (orthanc) => {

      let cloud = JSON.parse(orthanc.Orthanc_Cloud)
      //log.info('cloud => ' + JSON.stringify(cloud));
      let orthancUrl = uti.fmtStr('http://%s:%s', cloud.ip, cloud.httpport);
			let rqParams = {
				method: 'GET',
				auth:  {user: cloud.user, pass: cloud.pass},
				uri: orthancUrl + '/studies/' + studyID
			}
			let proxyRes = await uti.proxyRequest(rqParams);
			let orthancRes = JSON.parse(proxyRes.res.body);
			log.info('orthancRes JSON => ' + JSON.stringify(orthancRes));

  		let mainDicomTags = Object.keys(orthancRes.MainDicomTags);
  		let patientMainTags = Object.keys(orthancRes.PatientMainDicomTags);

      let studyDate = orthancRes.MainDicomTags.StudyDate;
      let studyTime = orthancRes.MainDicomTags.StudyTime;
      let flgTemps = studyTime.split('.');
      studyTime = flgTemps[0];
      let currentTime = new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
      currentTime = currentTime.split(':').join('');
      archiveFileName = uti.fmtStr('%s_%s-%s-%s-%s.zip', patientNameEN, patientLastNameEN, studyDate, studyTime, currentTime);
      archiveFilePath = usrArchiveDir + '/' + archiveFileName;

      let isExist = fs.existsSync(archiveFilePath);
      if (isExist) {
        let clearZipCommand = uti.fmtStr('rm %s', archiveFilePath);
        await uti.runcommand(clearZipCommand);
      }

      let convertItems = [];
      const promiseList = new Promise(async function(resolve2, reject2) {
        if (newImages.length > 0) {
          await newImages.forEach(async(image, i) => {
            if (!image.instanceId) {
              let imagePaths = image.link.split('/');
              let imageFileName = imagePaths[imagePaths.length-1];
              let imageCode = imageFileName.split('.')[0];
              let bmpFileName = uti.fmtStr('%s.%s', imageCode, 'bmp');
              let dcmFileName = uti.fmtStr('%s.%s', imageCode, 'dcm');
              let command = uti.fmtStr('convert -verbose -density 150 -trim %s/%s', usrUploadDir, imageFileName);
              command += ' -define bmp:format=BMP3 -quality 100 -flatten -sharpen 0x1.0 ';
              command += uti.fmtStr(' %s/%s', usrUploadDir, bmpFileName);

              command += uti.fmtStr(' && img2dcm -i BMP %s/%s %s/%s', usrUploadDir, bmpFileName, usrUploadDir, dcmFileName);

              await mainDicomTags.forEach((tag, i) => {
                let dcmKeyValue = Object.values(orthancRes.MainDicomTags)[i];
                dcmKeyValue = dcmKeyValue.replace(/["']/g, "");
          			command += uti.fmtStr(' -k "%s=%s"', tag, dcmKeyValue);
          		});
          		await patientMainTags.forEach((tag, i) => {
          			if (tag !== 'OtherPatientIDs')	{
          				command += uti.fmtStr(' -k "%s=%s"', tag, Object.values(orthancRes.PatientMainDicomTags)[i]);
          			}
          		});

          		command += uti.fmtStr(' -k "Modality=%s" -v', modality);

              /*
          		command += ' && storescu';
          		command += uti.fmtStr(' %s %s', cloud.ip, cloud.dicomport);
          		command += uti.fmtStr(' %s/%s', usrUploadDir, dcmFileName);
          		command +=  ' -v';
              */

          		let stdout = await uti.runcommand(command);
              command = uti.fmtStr('curl -X POST --user %s:%s %s/instances --data-binary @%s/%s', cloud.user, cloud.pass, orthancUrl, usrUploadDir, dcmFileName);
              stdout = await uti.runcommand(command);
              let newDicomProp = JSON.parse(stdout);
              log.info('newDicomProp=>' + JSON.stringify(newDicomProp));

              let hrRevise = {link: image.link, instanceId: newDicomProp.ID};
              convertItems.push(hrRevise);

              uti.removeArchiveScheduleTask(usrUploadDir + '/' + bmpFileName);
              uti.removeArchiveScheduleTask(usrUploadDir + '/' + dcmFileName);
            } else {
              convertItems.push(image);
            }
          });

          log.info('newImages=>' + JSON.stringify(convertItems));
          log.info('oldImages=>' + JSON.stringify(oldImages));
          if (oldImages) {
            let resultImages = [];
            await oldImages.forEach(async (dcm, i) => {

              let oldFoundItems = await convertItems.filter((item, index)=>{
                if (item.link === dcm.link) {
                  return item;
                }
              });

              log.info('oldFoundItems=>' + JSON.stringify(oldFoundItems));

              if (oldFoundItems.length == 0) {
                resultImages.push(dcm);
              }
            });
            log.info('resultImages=>' + JSON.stringify(resultImages));
            if (resultImages.length > 0) {
              await resultImages.forEach(async (item, i) => {
                command = uti.fmtStr('curl -X DELETE --user %s:%s -H "user:%s" %s/instances/%s', cloud.user, cloud.pass, cloud.user, orthancUrl, item.instanceId);
                await uti.runcommand(command);
              });
            }
          }

          setTimeout(()=> {
            resolve2(convertItems);
          }, 4800);
        } else {
          resolve2(convertItems);
        }
      });

      Promise.all([promiseList]).then(async(ob)=> {
        let command = 'curl --user ' + cloud.user + ':' + cloud.pass + ' -H "user: ' + cloud.user + '" ' + orthancUrl + '/studies/' + studyID + '/archive > ' + archiveFilePath;
        //log.info('Create Dicom achive advance with command >>', command);
        await db.cases.update({Case_DicomZipFilename: archiveFileName}, {where: {Case_OrthancStudyID: studyID}});
        let output = await uti.runcommand(command);
        let rmDateTime = uti.removeArchiveScheduleTask(archiveFilePath);

        resolve({zip: archiveFilePath, rm: rmDateTime, newHRprop: ob[0]});
      });
    });
  });
}

const doCreateTriggerChatBotMessage = function(caseId, triggerAt){
  return new Promise(async function(resolve, reject) {
    let caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN', 'Patient_NameTH', 'Patient_LastNameTH']}, {model: db.hospitals, attributes: ['Hos_Name']}];
    let targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    let targetCase = targetCases[0];
    let hospitalName = targetCase.hospital.Hos_Name;
    let patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Please Check TimeZone on Linux Server
    let triggerDateText = uti.doFormateDateTimeChatbot(triggerAt);

    let actionReturnTextFmt = 'รับเคส\nชื่อ %s แล้ว\nกำหนดเวลาส่งผล %s';
    let actionReturnText = uti.fmtStr(actionReturnTextFmt, patientNameEN, triggerDateText);

    resolve(actionReturnText);
  });
}

const doLoadResultFormat = function(hospitalId){
  return new Promise(async function(resolve, reject) {
    const reportFormats = await db.hospitalreports.findAll({ attributes: ['Content'], where: {hospitalId: hospitalId}});
    let reportElements = reportFormats[0].Content;
    //log.info('reportElements=> ' + JSON.stringify(reportElements));
    let resultElement = await reportElements.find((elem)=>{
      if ((elem.elementType === "text") && (elem.type === "dynamic")){
        let field = elem.title.substring(1);
        if (field === 'result'){
          return elem;
        }
      }
    });
    resolve(resultElement);
  });
}

const doLoadRadioPreviewPDFOption = function(hospitalId){
  return new Promise(async function(resolve, reject) {
    const previewOptions = await db.hospitalreports.findAll({ attributes: ['RadioPreviewPDF'], where: {hospitalId: hospitalId}});
    resolve(previewOptions[0].RadioPreviewPDF);
  });
}

const doConsultExpireAction = function(whomtask, websocket, consultId, socket, newcaseStatusId, radioProfile, userProfile, lineConsultDetaileMsg, hospitalName){
  return new Promise(async (resolve, reject) => {

    const expiredStatus = await doCallCaseStatusByName('Expired');

    log.info('consultId onExpire =>' + consultId)
    const targetConsults = await db.radconsults.findAll({ attributes: excludeColumn, where: {id: consultId}});
    const action = 'quick';

    // Update Case Status
    await targetConsults[0].setCasestatus(expiredStatus[0]);
    //KeepLog
    /*
    let fromStusId = targetCases[0].casestatusId;
    let systemId = 0;
    let newKeepLog = { caseId : caseId,	userId : systemId, from : fromStusId, to : newcaseStatusId, remark : 'Expire by Case Task on System Cron Job.'};
    doCaseChangeStatusKeepLog(newKeepLog);
    */
    await whomtask.removeTaskByConsultId(consultId);
    log.info('consultId ' + consultId + ' was expired by schedule.');

    let refreshExpConsult = {type: 'refresh', statusId: expiredStatus[0].id, caseId: consultId, thing: 'consult'};
    await websocket.sendMessage(refreshExpConsult, radioProfile.username);

    // Notify Case Owner Feedback
    let msg = 'Your new Consult on ' + hospitalName + ' - expired';
    let notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, consultId: consultId, casestatusId: newcaseStatusId};
    await websocket.sendMessage(notify, radioProfile.username);
    // Notify Case Radio
    msg = 'Your a new Consult was expired by schedule';
    notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: caseId, casestatusId: newcaseStatusId};
    await websocket.sendMessage(refreshExpConsult, userProfile.username);
    await websocket.sendMessage(notify, userProfile.username);

    // Chatbot message to Radio
    if ((radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
      let lineConsultMsg = lineConsultDetaileMsg + 'หมดเวลาตอบรับ';
      let menuQuickReply = lineApi.createBotMenu(lineConsultMsg, action, lineApi.radioMainMenu);
      await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
    }

    // Chatbot message to Owner Case
    if ((userProfile.lineUserId) && (userProfile.lineUserId !== '')) {
      let lineConsultMsg = lineConsultDetaileMsg + 'หมดเวลาตอบรับจากรังสีแพทย์';
      let lineMsg = lineApi.createBotMenu(lineConsultMsg, action, lineApi.techMainMenu);
      await lineApi.pushConnect(userProfile.lineUserId, lineMsg);
    }

    resolve(targetCases);
  });
}

const doSendEmailToAdmin = function(subject, msgHtml){
  return new Promise(async function(resolve, reject) {
    const adminAddress = process.env.EMAIL_ADMIN_ADDRESS;
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'oudsoft@gmail.com',
        pass: 'bcsvjwvdnddmeedl'
      }
    });
    var mailOptions = {
      from: 'oudsoft@gmail.com',
      to: adminAddress,
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

const doCallLineUserInfo = function(lineUserId){
  return new Promise(async function(resolve, reject) {
    let userInfo = await lineApi.getUserProfile(lineUserId);
    resolve(userInfo);
  });
}

const doFindTechHospitalUsername = function(hospitalId){
  return new Promise(async function(resolve, reject) {
    const techusers = await db.users.findAll({ attributes: ['username'], where: {usertypeId: 2, hospitalId: hospitalId}});
    resolve(techusers);
  });
}

const doTestPushConnect = function(lineUserId, msg){
  return new Promise(async function(resolve, reject) {
    let action = 'quick';
    let lineMsg = lineApi.createBotMenu(msg, action, lineApi.techMainMenu);
    let pushRes = await lineApi.pushConnect(lineUserId, lineMsg);
    resolve(pushRes);
  });
}

const removeReportTempFile = function(fileCode) {
	const publicDir = path.normalize(__dirname + '/../../../public');
	const USRPDF_PATH = process.env.USRPDF_PATH;
	const cron = require('node-cron');
  const removeAfter = 1440; /*minutes */
  const startDate = new Date();
  let endDate = new Date(startDate.getTime() + (removeAfter * 60 * 1000));
  let endMM = endDate.getMonth() + 1;
  let endDD = endDate.getDate();
  let endHH = endDate.getHours();
  let endMN = endDate.getMinutes();
  let endSS = endDate.getSeconds();
  let scheduleRemove = endSS + ' ' + endMN + ' ' + endHH + ' ' + endDD + ' ' + endMM + ' *';
	let task = cron.schedule(scheduleRemove, function(){
    var rmCommand = uti.fmtStr('rm %s/%s.bmp', publicDir + USRPDF_PATH, fileCode);
    rmCommand += uti.fmtStr(' && rm %s/%s.html', publicDir + USRPDF_PATH, fileCode);
    rmCommand += uti.fmtStr(' && rm %s/%s.pdf', publicDir + USRPDF_PATH, fileCode);
    rmCommand += uti.fmtStr(' && rm %s/%s.dcm', publicDir + USRPDF_PATH, fileCode);
    uti.runcommand(rmCommand).then((stdout) => {
      log.info('result => ' + stdout);
    }).catch((err) => {
      log.error('err: 500 >>', err);
    });
  });
}

const sendNotifyChatBotToAdmin = function(reportMsg) {
  return new Promise(async function(resolve, reject) {
    let msgToAdmin = { type: "text",	text: reportMsg };
    let pushBotRes = await lineApi.pushConnect(process.env.LINE_ADMIN_USERID, msgToAdmin);
    resolve(pushBotRes);
  })
}

module.exports = (dbconn, monitor) => {
	db = dbconn;
	log = monitor;
  uti = require('../../lib/mod/util.js')(db, log);
  lineApi = require('../../lib/mod/lineapi.js')(db, log);
  return {
    casestatusFlowTable,
    casestatusRightAccessTable,
    casestatusCanUpdate,
    newResponseStatus,
    editResponseStatus,

    defaultRadioProfile,
    defaultRadioProfileV2,

    msgNewCaseRadioDetailFormat,
    msgEditCaseRadioDetailFormat,
    msgAccCaseRadioDetailPattern,
    msgAccCaseHospitalDetailPattern,
    msgRejCaseHospitalDetailPattern,
    msgSucCaseHospitalDetailPattern,
    msgUpdateCaseResultDetailPattern,

    doCanNextStatus,
    doCanAccessStatus,
    doSearchRadioForHospital,
    doGenNewCaseOptions,
    doCallCaseStatusByName,
    doGetCaseDescription,
    doLoadUserProfile,
    doLoadRadioProfile,
    doLoadCaseReport,
    doCaseExpireAction,
    doCreateTaskAction,
    doCreateTaskVoip,
    doRequestPhoneCalling,
    doCreateTaskWarning,
    doSaveScanpartAux,
    doCaseChangeStatusKeepLog,
    doCollectRadioCurrentState,
    doSummaryBillReport,

    doSelectCaseById,
    doFilterPatient,
    doGenTemplateOptions,
    doActiveAutoApply,
    doGenSmartTemplateOptions,
    nextCaseStausOnResponseChange,
    doConvertPatientHistoryImage2Dicom,
    doCreateTriggerChatBotMessage,
    doLoadResultFormat,
    doLoadRadioPreviewPDFOption,

    doConsultExpireAction,
    doSendEmailToAdmin,
    doCallLineUserInfo,
    doFindTechHospitalUsername,
    doTestPushConnect,
    removeReportTempFile,
    sendNotifyChatBotToAdmin
  }
}
