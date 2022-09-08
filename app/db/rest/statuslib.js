/* statuslib.js */
const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');

var log, db, tasks, warnings, voips, uti, socket, lineApi, common;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const doGetControlStatusAt = function(onStatus){
  return new Promise(async function(resolve, reject) {
    const nextCanProps = await common.doCanNextStatus(onStatus);
    resolve(nextCanProps);
  });
}

const doFilerStatusChange = function(from){
  return new Promise(async function(resolve, reject) {
    const nextCanProps = await common.doCanNextStatus(from);
    if (nextCanProps) {
      resolve(nextCanProps.next);
    } else {
      resolve([]);
    }
  });
}

const doGetAccessBy = function(from, next){
  return new Promise(async function(resolve, reject) {
    const accessProps = await common.doCanAccessStatus(from, next);
    if (accessProps) {
      resolve(accessProps.changeBy);
    } else {
      resolve();
    }
  });
}

const doCanChange = function(from, next, now){
  return new Promise(async function(resolve, reject) {
    if (from == next) {
      if (from == now){
        resolve(true);
      } else {
        resolve(false);
      }
    } else {
      if (from == now){
        let cando = await doFilerStatusChange(from);
        if (cando.length > 0) {
          if (cando.indexOf(Number(next)) > -1) {
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      } else {
        resolve(false);
      }
    }
  });
}

const doChangeCaseStatus = function(from, next, caseId, userId, remark){
  return new Promise(async function(resolve, reject) {
    const targetCases = await db.cases.findAll({ attributes: ['Case_RadiologistId', 'Case_RefferalId', 'userId', 'casestatusId'], where: {id: caseId}});
    const nowCaseStatus = targetCases[0].casestatusId;
    //log.info('from=>' + from);
    //log.info('next=>' + next);
    //log.info('now=>' + nowCaseStatus);
    let isCando = await doCanChange(from, next, nowCaseStatus);
    //log.info('isCando=>' + isCando);
    if (isCando) {
      let accessBy = await doGetAccessBy(from, next);
      //log.info('accessBy=>' + accessBy);
      if (accessBy) {
        if (accessBy == 0) {
          //system access or admin access
          const caseStatusChange = { casestatusId: next, Case_DESC: remark};
          await db.cases.update(caseStatusChange, { where: { id: caseId } });
          let newKeepLog = { caseId : caseId,	userId : userId, from : from, to : next, remark : remark};
          await common.doCaseChangeStatusKeepLog(newKeepLog);
          let actions = await doActionAfterChange(from, next, caseId);
          resolve({change: {status: true}, actions: actions});
        } else if (accessBy == 2) {
          //technicial access
          if (targetCases[0].userId == userId) {
            const caseStatusChange = { casestatusId: next, Case_DESC: remark};
            await db.cases.update(caseStatusChange, { where: { id: caseId } });
            let newKeepLog = { caseId : caseId,	userId : userId, from : from, to : next, remark : remark};
            await common.doCaseChangeStatusKeepLog(newKeepLog);
            let actions = await doActionAfterChange(from, next, caseId);
            resolve({change: {status: true}, actions: actions});
          } else {
            resolve({change: {status: false}});
          }
        } else if (accessBy == 4) {
          //radio access
          log.info('targetCases[0].Case_RadiologistId=>' + targetCases[0].Case_RadiologistId);
          log.info('userId=>' + userId);
          //if (targetCases[0].Case_RadiologistId == userId) {
            const caseStatusChange = { casestatusId: next, Case_DESC: remark};
            await db.cases.update(caseStatusChange, { where: { id: caseId } });
            let newKeepLog = { caseId : caseId,	userId : userId, from : from, to : next, remark : remark};
            await common.doCaseChangeStatusKeepLog(newKeepLog);
            let controlAction = await doActionAfterChange(from, next, caseId);
            let actions = controlAction.actions;
            if ((from == 1) && (next == 2)) {
              let triggerDate = controlAction.triggerDate;
              resolve({change: {status: true}, actions: actions, triggerDate: triggerDate});
            } else {
              resolve({change: {status: true}, actions: actions});
            }
          //} else {
            //resolve({change: {status: false}});
          //}
        } else if (accessBy == 5) {
          //refer access
          if (targetCases[0].Case_RefferalId == userId) {
            const caseStatusChange = { casestatusId: next, Case_DESC: remark};
            await db.cases.update(caseStatusChange, { where: { id: caseId } });
            let newKeepLog = { caseId : caseId,	userId : userId, from : from, to : next, remark : remark};
            await common.doCaseChangeStatusKeepLog(newKeepLog);
            let actions = await doActionAfterChange(from, next, caseId);
            resolve({change: {status: true}, actions: actions});
          } else {
            resolve({change: {status: false}});
          }
        }
      } else {
        resolve({change: {status: false}});
      }
    } else {
      resolve({change: {status: false}});
    }
  });
}

const doActionAfterChange = function(fromStatus, onStatus, caseId) {
  return new Promise(async function(resolve, reject) {
    let actions = undefined;
    switch (Number(onStatus)) {
      case 1:
        actions = await onNewCaseEvent(caseId);
      break;
      case 2:
        actions = await onAcceptCaseEvent(caseId);
      break;
      case 3:
        actions = await onRejectCaseEvent(caseId);
      break;
      case 4:
        actions = await onExpiredCaseEvent(caseId);
      break;
      case 5:
        actions = await onSuccessCaseEvent(caseId);
      break;
      case 6:
        actions = await onCloseCaseEvent(caseId);
      break;
      case 7:
        actions = await onCancelCaseEvent(caseId);
      break;
      case 8:
        actions = await onOpenCaseEvent(caseId);
      break;
      case 9:
        actions = await onDraftResultCaseEvent(caseId);
      break;
      case 10:
        actions = await onViewResultCaseEvent(caseId);
      break;
      case 11:
        actions = await onPrintResultCaseEvent(caseId);
      break;
      case 12:
        actions = await onEditResultCaseEvent(caseId);
      break;
      case 13:
        actions = await onPreliminaryResultCaseEvent(caseId);
      break;
      case 14:
        actions = await onIssueMessageResultCaseEvent(caseId);
      break;
    }
    resolve(actions);
  });
}

const doCalTriggerMinut = function(totalMinut, radioProfile){
  return new Promise(async function(resolve, reject) {
    let triggerMinut = undefined;
    let radioSocket = await socket.findUserSocket(radioProfile.username);
    if ((radioSocket) && (radioSocket.screenstate == 0)) {
      //Active State
      if (totalMinut <= 60){
        triggerMinut = radioProfile.radioPhoneCallOptions.activeState.optionCaseControl.case1H;
      } else if ((totalMinut > 60) && (totalMinut <= 240)){
        triggerMinut = radioProfile.radioPhoneCallOptions.activeState.optionCaseControl.case4H;
      } else if ((totalMinut > 240) && (totalMinut <= 1440)){
        triggerMinut = radioProfile.radioPhoneCallOptions.activeState.optionCaseControl.case24HL;
      } else if (totalMinut > 1440){
        triggerMinut = radioProfile.radioPhoneCallOptions.activeState.optionCaseControl.case24HU;
      }
    } else if ((radioSocket) && (radioSocket.screenstate == 1)) {
      //lock State
      if (totalMinut <= 60){
        triggerMinut = radioProfile.radioPhoneCallOptions.lockState.optionCaseControl.case1H;
      } else if ((totalMinut > 60) && (totalMinut <= 240)){
        triggerMinut = radioProfile.radioPhoneCallOptions.lockState.optionCaseControl.case4H;
      } else if ((totalMinut > 240) && (totalMinut <= 1440)){
        triggerMinut = radioProfile.radioPhoneCallOptions.activeState.optionCaseControl.case24HL;
      } else if (totalMinut > 1440){
        triggerMinut = radioProfile.radioPhoneCallOptions.activeState.optionCaseControl.case24HU;
      }
    } else {
      //offline State
      if (totalMinut <= 60){
        triggerMinut = radioProfile.radioPhoneCallOptions.offlineState.optionCaseControl.case1H;
      } else if ((totalMinut > 60) && (totalMinut <= 240)){
        triggerMinut = radioProfile.radioPhoneCallOptions.offlineState.optionCaseControl.case4H;
      } else if ((totalMinut > 240) && (totalMinut <= 1440)){
        triggerMinut = radioProfile.radioPhoneCallOptions.activeState.optionCaseControl.case24HL;
      } else if (totalMinut > 1440){
        triggerMinut = radioProfile.radioPhoneCallOptions.activeState.optionCaseControl.case24HU;
      }
    }
    resolve(triggerMinut);
  });
}

const doAutoPhoneCallRadio = function(totalMinut, triggerMinut, workingMinut, caseId, hospitalCode, userProfile, radioProfile, casestatusId){
  return new Promise(async function(resolve, reject) {
    if ((radioProfile.radioPhoneNo) && (radioProfile.radioPhoneNo !== '') && (radioProfile.radioPhoneNo !== '0999999999')) {
      let voiceTransactionId = uti.doCreateVoiceTranctionId();
      let voipTriggerParam = undefined;
      let voiceUrgent = undefined;
      let triggerAt = totalMinut - triggerMinut;
      if (triggerAt > 0){
        let delta = triggerAt;
        let dd = Math.floor(delta / 1440);
        delta -= dd * 1440;
        let hh = Math.floor(delta / 60) % 24;
        delta -= hh * 60;
        let mn = delta;
        voipTriggerParam = {dd: dd, hh: hh, mn: mn};
        log.info('PhoneCallRadio totalMinut=>' + totalMinut);
        voiceUrgent = uti.doCalUrgentVoiceCall(workingMinut);
        log.info('PhoneCallRadio voiceUrgent=>' + voiceUrgent);
        let caseVoipData = {caseId: caseId, transactionId: voiceTransactionId, hospitalCode: hospitalCode, urgentType: voiceUrgent};
        let theVoipTask = await common.doCreateTaskVoip(voips, caseId, userProfile, radioProfile, voipTriggerParam, casestatusId, caseVoipData);
        resolve(theVoipTask);
      } else {
        let nowcaseStatus = await db.cases.findAll({ attributes: ['casestatusId'], where: {id: caseId}});
        log.info('VoIp Task nowcaseStatus => ' + JSON.stringify(nowcaseStatus));
        if (nowcaseStatus[0].casestatusId === casestatusId) {
        //if ([2, 8].includes(nowcaseStatus[0].casestatusId)) {
          voipTriggerParam = {dd: 0, hh: 0, mn: -1};
          voiceUrgent = uti.doCalUrgentVoiceCall(workingMinut);
          let callPhoneRes = await common.doRequestPhoneCalling(caseId, radioProfile, voipTriggerParam, hospitalCode, voiceUrgent);
          log.info('callPhoneRes => ' + JSON.stringify(callPhoneRes));
          resolve(callPhoneRes);
        } else {
          resolve();
        }
      }
    } else {
      resolve();
    }
  });
}

const onNewCaseEvent = function(caseId, options){
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN', 'Patient_NameTH', 'Patient_LastNameTH']}, {model: db.hospitals, attributes: ['Hos_Name', 'Hos_Code']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const newCase = targetCases[0];
    const userId = newCase.userId;
    const hospitalId = newCase.hospitalId;
    const radioId = newCase.Case_RadiologistId;
    const hospitalName = newCase.hospital.Hos_Name;
    const hospitalCode = newCase.hospital.Hos_Code;
    const patientNameEN = newCase.patient.Patient_NameEN + ' ' + newCase.patient.Patient_LastNameEN;
    const patientNameTH = newCase.patient.Patient_NameTH + ' ' + newCase.patient.Patient_LastNameTH;

    const caseCreateAt = newCase.createdAt;
    //let d = new Date(newCase.createdAt);
    //const caseCreateAt = d.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
    log.info('caseCreateAt=>' + caseCreateAt);
    let studyDescription = '';
    if ((newCase.Case_StudyDescription) && (newCase.Case_StudyDescription !== '')) {
      studyDescription = newCase.Case_StudyDescription;
    } else if ((newCase.Case_ProtocolName) && (newCase.Case_ProtocolName !== '')) {
      studyDescription = newCase.Case_ProtocolName;
    } else {
      studyDescription = 'N/A';
    }

    const caseMsgData = {hospitalName, hospitalCode, patientNameEN, patientNameTH, caseCreateAt, studyDescription};

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    // Notify to Case Owner Feedback
    let refreshNewCase = {type: 'refresh', statusId: newCase.casestatusId, caseId: newCase.id, thing: 'case'};
    //let userNotify = {type: 'notify', message: 'You Create new Case success.'};
    await socket.sendMessage(refreshNewCase, userProfile.username);
    //await socket.sendMessage(userNotify, userProfile.username);

    let lineCaseDetaileMsg = '';
    if ((options) && (options.edit == true)){
      lineCaseDetaileMsg = uti.fmtStr(common.msgEditCaseRadioDetailFormat, userProfile.hospitalName, patientNameEN, newCase.Case_StudyDescription, newCase.Case_ProtocolName, newCase.Case_BodyPart, newCase.Case_Modality);
    } else {
      lineCaseDetaileMsg = uti.fmtStr(common.msgNewCaseRadioDetailFormat, userProfile.hospitalName, patientNameEN, newCase.Case_StudyDescription, newCase.Case_ProtocolName, newCase.Case_BodyPart, newCase.Case_Modality);
    }
    // Notify to Case Radiologist
    let radioNotify = {type: 'notify', message: lineCaseDetaileMsg};
    await socket.sendMessage(refreshNewCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    //Load Urgent Profile
    let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_AcceptStep', 'UGType_WorkingStep'], where: {id: newCase.urgenttypeId}});
    log.info('radioProfile=>' + JSON.stringify(radioProfile));
    if ((radioProfile.autoacc == 0) || (!radioProfile.autoacc)) {
      log.info('== When autoacc of Radio Profile is undefined or OFF ==');
      let triggerParam = JSON.parse(urgents[0].UGType_AcceptStep);
      let theTask = await common.doCreateTaskAction(tasks, caseId, userProfile, radioProfile, triggerParam, newCase.casestatusId, lineCaseDetaileMsg, caseMsgData);
      if (radioProfile.radioAutoCall == 1) {
        let totalMinut = (Number(triggerParam.dd) * 24 * 60) + (Number(triggerParam.hh) * 60) + Number(triggerParam.mn);
        log.info('totalMinut=>' + totalMinut);
        let triggerMinut = await doCalTriggerMinut(totalMinut, radioProfile);
        log.info('triggerMinut=>' + triggerMinut);
        let workingParam = JSON.parse(urgents[0].UGType_WorkingStep);
        let workingMinut = (Number(workingParam.dd) * 24 * 60) + (Number(workingParam.hh) * 60) + Number(workingParam.mn);
        log.info('workingMinut=>' + workingMinut);
        if ((triggerMinut) && (triggerMinut > 0)) {
          let theVoipTask = await doAutoPhoneCallRadio(totalMinut, triggerMinut, workingMinut, caseId, hospitalCode, userProfile, radioProfile, newCase.casestatusId);
        }
      }
    } else if (radioProfile.autoacc == 1) {
      log.info('== When autoacc of Radio Profile is ON ==');
      let radioSocket = await socket.findUserSocket(radioProfile.username);
      if (radioSocket){
        log.info('radioSocketState=>' + radioSocket.screenstate);
        if (radioSocket.screenstate == 0) {
          let acceptedCaseStatus = await common.doCallCaseStatusByName('Accepted');
          let acceptedCaseStatusId = acceptedCaseStatus[0].id;
          let currentStatusId = newCase.casestatusId;
          let remark = 'Change case status to accapted by auto Accept of Radio Profile';
          let radioId = newCase.Case_RadiologistId
          let changeResult = await doChangeCaseStatus(currentStatusId, acceptedCaseStatusId, caseId, radioId, remark)
          if ((radioProfile.linenotify == 1) && (radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
            let action = 'quick';
            let actionReturnText = await common.doCreateTriggerChatBotMessage(caseId, changeResult.triggerDate);
            let menuQuickReply = lineApi.createBotMenu(actionReturnText, action, lineApi.radioMainMenu);
            await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
          }
        } else {
          log.info('== But Radio Lock Screen ==');
          let triggerParam = JSON.parse(urgents[0].UGType_AcceptStep);
          let theTask = await common.doCreateTaskAction(tasks, caseId, userProfile, radioProfile, triggerParam, newCase.casestatusId, lineCaseDetaileMsg, caseMsgData);
          if (radioProfile.radioAutoCall == 1) {
            let totalMinut = (Number(triggerParam.dd) * 24 * 60) + (Number(triggerParam.hh) * 60) + Number(triggerParam.mn);
            log.info('totalMinut=>' + totalMinut);
            let triggerMinut = await doCalTriggerMinut(totalMinut, radioProfile);
            log.info('triggerMinut=>' + triggerMinut);
            let workingParam = JSON.parse(urgents[0].UGType_WorkingStep);
            let workingMinut = (Number(workingParam.dd) * 24 * 60) + (Number(workingParam.hh) * 60) + Number(workingParam.mn);
            log.info('workingMinut=>' + workingMinut);
            if ((triggerMinut) && (triggerMinut > 0)) {
              let theVoipTask = await doAutoPhoneCallRadio(totalMinut, triggerMinut, workingMinut, caseId, hospitalCode, userProfile, radioProfile, newCase.casestatusId);
            }
          }
        }
      } else {
        log.info('== When Radio Offline ==');
        let triggerParam = JSON.parse(urgents[0].UGType_AcceptStep);
        let theTask = await common.doCreateTaskAction(tasks, caseId, userProfile, radioProfile, triggerParam, newCase.casestatusId, lineCaseDetaileMsg, caseMsgData);
        if (radioProfile.radioAutoCall == 1) {
          let totalMinut = (Number(triggerParam.dd) * 24 * 60) + (Number(triggerParam.hh) * 60) + Number(triggerParam.mn);
          log.info('totalMinut=>' + totalMinut);
          let triggerMinut = await doCalTriggerMinut(totalMinut, radioProfile);
          log.info('triggerMinut=>' + triggerMinut);
          let workingParam = JSON.parse(urgents[0].UGType_WorkingStep);
          let workingMinut = (Number(workingParam.dd) * 24 * 60) + (Number(workingParam.hh) * 60) + Number(workingParam.mn);
          log.info('workingMinut=>' + workingMinut);
          if ((triggerMinut) && (triggerMinut > 0)) {
            let theVoipTask = await doAutoPhoneCallRadio(totalMinut, triggerMinut, workingMinut, caseId, hospitalCode, userProfile, radioProfile, newCase.casestatusId);
          }
        }
      }
    }
    let actions = await doGetControlStatusAt(newCase.casestatusId);
    let yourLocalSocket = await socket.findOrthancLocalSocket(hospitalId);
    if (!yourLocalSocket) {
      let techUsernames = await common.doFindTechHospitalUsername(hospitalId);
      await techUsernames.forEach(async (techName) => {
        let techSocket = await socket.findUserSocket(techName);
        if (techSocket){
          techSocket.send(JSON.stringify({type: 'clientreconnect'}));
        }
      });
    }

    resolve(actions);
  });
}

const onAcceptCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const tenMinutes = 10 * 60 * 1000;
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN', 'Patient_NameTH', 'Patient_LastNameTH']}, {model: db.hospitals, attributes: ['Hos_Name']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const hospitalName = targetCase.hospital.Hos_Name;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;
    const patientNameTH = targetCase.patient.Patient_NameTH + ' ' + targetCase.patient.Patient_LastNameTH;
    const studyDescription = targetCase.Case_StudyDescription;
    const caseMsgData = {hospitalName, patientNameEN, patientNameTH, studyDescription};
    await tasks.removeTaskByCaseId(targetCase.id);

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshAccCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id, thing: 'case'};
    let radioNotify = {type: 'notify', message: 'Accept Case - success.'};
    await socket.sendMessage(refreshAccCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    let lineCaseDetaileMsg = uti.fmtStr(common.msgAccCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);

    let hospitalNotify = {type: 'notify', message: lineCaseDetaileMsg};
    await socket.sendMessage(refreshAccCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    //Load Urgent Profile
    let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_WorkingStep'], where: {id: targetCase.urgenttypeId}});
    let triggerParam = JSON.parse(urgents[0].UGType_WorkingStep);

    let triggerDate = await common.doCreateTaskAction(tasks, caseId, userProfile, radioProfile, triggerParam, targetCase.casestatusId, lineCaseDetaileMsg, caseMsgData);
    log.info('triggerDate=>' + triggerDate);
    let triggerAt = new Date(triggerDate);
    let warningTime = triggerAt.getTime() - tenMinutes;
    log.info('warningTime=>' + new Date(warningTime));
    let theWarning = await common.doCreateTaskWarning(warnings, caseId, radioProfile, warningTime, targetCase.casestatusId, caseMsgData);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve({actions: actions, triggerDate: triggerDate});
  });
}

const onRejectCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN', 'Patient_NameTH', 'Patient_LastNameTH']}, {model: db.hospitals, attributes: ['Hos_Name']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const hospitalName = targetCase.hospital.Hos_Name;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;
    const patientNameTH = targetCase.patient.Patient_NameTH + ' ' + targetCase.patient.Patient_LastNameTH;

    await tasks.removeTaskByCaseId(targetCase.id);

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshRejCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id, thing: 'case'};
    let radioNotify = {type: 'notify', message: 'Reject Case - success.'};
    await socket.sendMessage(refreshRejCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    let lineCaseDetaileMsg = uti.fmtStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);

    let hospitalNotify = {type: 'notify', message: lineCaseDetaileMsg};
    await socket.sendMessage(refreshRejCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    /*
    if ((radioProfile.linenotify == 1) && (radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
      let lineCaseMsgFmt = 'เคส\nชื่อ %s\nรพ.%s\n\nได้ถูกปฏิเสธแล้ว\n\nหากคุณต้องการใช้บริการอื่นๆ เชิญเลือกจากเมนูด้านล่างครับ'
      let lineCaseMsg = uti.fmtStr(lineCaseMsgFmt, patientNameEN, hospitalName);
      let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, 'quick', lineApi.radioMainMenu);
      await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
    }
    */

    if ((userProfile.lineUserId) && (userProfile.lineUserId !== '')) {
      let lineCaseMsgFmt = 'เคส\nชื่อ %s\n\nได้ถูกรังสีแพทย์(%s %s)ปฏิเสธแล้ว\n\nหากคุณต้องการใช้บริการอื่นๆ เชิญเลือกจากเมนูด้านล่างครับ'
      let lineCaseMsg = uti.fmtStr(lineCaseMsgFmt, patientNameEN, radioProfile.User_NameTH, radioProfile.User_LastNameTH);
      let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, 'quick', lineApi.techMainMenu);
      await lineApi.pushConnect(userProfile.lineUserId, menuQuickReply);
    }

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onExpiredCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    await tasks.removeTaskByCaseId(caseId);
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    /*
    const closeAutoReadyStatus = [2, 8, 9];
    const nowStatusId = targetCase.casestatusId;
    let isCloseAutoReady = uti.contains.call(closeAutoReadyStatus, nowStatusId);
    if (isCloseAutoReady) {
      let radioId = targetCase.Case_RefferalId;
      let radioProfiles = await db.userprofiles.findAll({attributes: ['Profile'], where: {userId: radioId}});
      let radioProfile = radioProfiles[0];
      radioProfile.readyState = 0;
      radioProfile.readyBy = 'System';
      await db.userprofiles.update({Profile: radioProfile}, { where: { userId: radioId } });
    }
    */
    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
    /*
    on Expired จะเกิดขึ้น และควบคุมโดย task อยู่แล้ว
    */
  });
}

const onSuccessCaseEvent = function(caseId){
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    await tasks.removeTaskByCaseId(targetCase.id);
    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshSucCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id, thing: 'case'};
    let radioNotify = {type: 'notify', message: 'Send Case Result - success.'};
    await socket.sendMessage(refreshSucCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    let radioNameTH = radioProfile.User_NameTH;
    let radioLastNameTH = radioProfile.User_LastNameTH;
    let studyDesc = undefined;
    if (targetCase.Case_StudyDescription){
      studyDesc = targetCase.Case_StudyDescription;
    } else if (targetCase.Case_ProtocolName){
      studyDesc = targetCase.Case_ProtocolName;
    } else {
      studyDesc = '';
    }
    let lineCaseDetaileMsg = uti.fmtStr(common.msgSucCaseHospitalDetailPattern, radioNameTH, radioLastNameTH, patientNameEN, studyDesc);

    let hospitalNotify = {type: 'notify', message: lineCaseDetaileMsg};
    await socket.sendMessage(refreshSucCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    if ((userProfile.lineUserId) && (userProfile.lineUserId !== '')) {
      let lineMsg = lineApi.createBotMenu(lineCaseDetaileMsg, 'quick', lineApi.techMainMenu);
      await lineApi.pushConnect(userProfile.lineUserId, lineMsg);
    }

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onCloseCaseEvent = function(caseId){
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshCloseCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id, thing: 'case'};

    let hospitalNotify = {type: 'notify', message: 'Close Case - Success.'};
    await socket.sendMessage(refreshCloseCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onCancelCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshCancelCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id, thing: 'case'};
    log.info('refreshCancelCase=>' + JSON.stringify(refreshCancelCase));

    let hospitalNotify = {type: 'notify', message: 'Cancel Case - Success.'};
    await socket.sendMessage(refreshCancelCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onOpenCaseEvent = function(caseId){
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshOpenCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id, thing: 'case'};

    let radioNotify = {type: 'notify', message: 'Open Case - success.'};
    await socket.sendMessage(refreshOpenCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    /*
    let lineCaseDetaileMsg = uti.fmtStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);
    */

    let hospitalNotify = {type: 'notify', message: 'Your case was open by radiologist.'};
    await socket.sendMessage(refreshOpenCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onDraftResultCaseEvent = function(caseId){
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshDraftCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id, thing: 'case'};

    let radioNotify = {type: 'notify', message: 'Save Draft - success.'};
    await socket.sendMessage(refreshDraftCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    /*
    let lineCaseDetaileMsg = uti.fmtStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);
    */

    let hospitalNotify = {type: 'notify', message: 'Your case had start draft result by radiologist.'};
    await socket.sendMessage(refreshDraftCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    await tasks.removeTaskByCaseId(caseId);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onViewResultCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    /* Update Report Status */
    const reportLogs = await db.casereports.findAll({attributes: ['Log'], where: {caseId: targetCase.id}});
    let updateStatus = 'view';
    let appendLog = {status: updateStatus, by: radioId, at: new Date()};
    let newReportLog = reportLogs[0];
    if (reportLogs.length > 0){
      newReportLog = reportLogs[0].Log;
      newReportLog.push(appendLog);
    } else {
      newReportLog = [appendLog];
    }
    await db.casereports.update({Status: updateStatus, Log: reportLog}, { where: { caseId: targetCase.id } });

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshViewCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id, thing: 'case'};

    let radioNotify = {type: 'notify', message: 'Your Result Case was view by owner case.'};
    await socket.sendMessage(refreshViewCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    /*
    let lineCaseDetaileMsg = uti.fmtStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);
    */

    let hospitalNotify = {type: 'notify', message: 'Open Result - success.'};
    await socket.sendMessage(refreshViewCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onPrintResultCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    /* Update Report Status */
    const reportLogs = await db.casereports.findAll({attributes: ['Log'], where: {caseId: targetCase.id}});
    let updateStatus = 'print';
    let appendLog = {status: updateStatus, by: radioId, at: new Date()};
    let newReportLog = reportLogs[0];
    if (reportLogs.length > 0){
      newReportLog = reportLogs[0].Log;
      newReportLog.push(appendLog);
    } else {
      newReportLog = [appendLog];
    }
    await db.casereports.update({Status: updateStatus, Log: reportLog}, { where: { caseId: targetCase.id } });

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshViewCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id, thing: 'case'};

    let radioNotify = {type: 'notify', message: 'Your Result Case was view by owner case.'};
    await socket.sendMessage(refreshViewCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    /*
    let lineCaseDetaileMsg = uti.fmtStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);
    */

    let hospitalNotify = {type: 'notify', message: 'Open Result - success.'};
    await socket.sendMessage(refreshViewCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onEditResultCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    /* Update Report Status */
    const reportLogs = await db.casereports.findAll({attributes: ['Log'], where: {caseId: targetCase.id}});
    log.info('reportLogs=>' + JSON.stringify(reportLogs))
    let updateStatus = 'edit';
    let appendLog = {status: updateStatus, by: radioId, at: new Date()};
    let newReportLog = [];
    if (reportLogs.length > 0){
      if (reportLogs[0].Log) {
        newReportLog = reportLogs[0].Log;
        newReportLog.push(appendLog);
      } else {
        newReportLog = [appendLog];
      }
    } else {
      newReportLog = [appendLog];
    }
    await db.casereports.update({Status: updateStatus, Log: newReportLog}, { where: { caseId: targetCase.id } });

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshViewCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id, thing: 'case'};

    let radioNotify = {type: 'notify', message: 'Your Result Case was view by owner case.'};
    await socket.sendMessage(refreshViewCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    let hospitalNotify = {type: 'notify', message: 'Open Result - success.'};
    await socket.sendMessage(refreshViewCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    log.info('userProfile.=>' + JSON.stringify(userProfile));

    if ((userProfile.lineUserId) && (userProfile.lineUserId !== '')) {
      //'เคส่ของผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\n';
      let ownwerCaseMsgFmt = 'รังสีแพทย์(%s %s)แก้ไขผลอ่านของ ชื่อ %s\n%s\n%s\n';
      let lineCaseMsg = uti.fmtStr(ownwerCaseMsgFmt, radioProfile.User_NameTH, radioProfile.User_LastNameTH, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName);
      //lineCaseMsg = lineCaseMsg + 'ได้มีการแก้ไขผลอ่านจากรังสีแพทย์ โปรดตรวจสอบข้อมูลจากระบบ\n หากคุณต้องการใช้บริการอื่นเชิญเลือกจากเมนูครับ'
      let lineMsg = lineApi.createBotMenu(lineCaseMsg, 'quick', lineApi.techMainMenu);
      await lineApi.pushConnect(userProfile.lineUserId, lineMsg);
    }

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onPreliminaryResultCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    /* Update Report Status */
    const reportLogs = await db.casereports.findAll({attributes: ['Log'], where: {caseId: targetCase.id}});
    let updateStatus = 'preliminay';
    let appendLog = {status: updateStatus, by: radioId, at: new Date()};
    let newReportLog = reportLogs[0];
    if (reportLogs.length > 0){
      newReportLog = reportLogs[0].Log;
      newReportLog.push(appendLog);
    } else {
      newReportLog = [appendLog];
    }
    await db.casereports.update({Status: updateStatus, Log: newReportLog}, { where: { caseId: targetCase.id } });

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshViewCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id, thing: 'case'};

    let radioNotify = {type: 'notify', message: 'Your Result Case was view by owner case.'};
    await socket.sendMessage(refreshViewCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    /*
    let lineCaseDetaileMsg = uti.fmtStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);
    */

    let hospitalNotify = {type: 'notify', message: 'Open Result - success.'};
    await socket.sendMessage(refreshViewCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onIssueMessageResultCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshViewCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id, thing: 'case'};

    let radioNotify = {type: 'notify', message: 'Your Result Case was view by owner case.'};
    await socket.sendMessage(refreshViewCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    /*
    let lineCaseDetaileMsg = uti.fmtStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);
    */

    let hospitalNotify = {type: 'notify', message: 'View Result - success.'};
    await socket.sendMessage(refreshViewCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);

  });
}

const onHospitalUpdateCaseEvent = function(caseId, newTaskOption){
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN', 'Patient_NameTH', 'Patient_LastNameTH']}, {model: db.hospitals, attributes: ['Hos_Name', 'Hos_Code']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const casestatusId = targetCase.casestatusId;
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const hospitalName = targetCase.hospital.Hos_Name;
    const hospitalCode = targetCase.hospital.Hos_Code;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;
    const patientNameTH = targetCase.patient.Patient_NameTH + ' ' + targetCase.patient.Patient_LastNameTH;
    const studyDescription = targetCase.Case_StudyDescription;
    const protocolName = targetCase.Case_ProtocolName;
    const modality = targetCase.Case_Modality;
    const caseMsgData = {hospitalName, patientNameEN, patientNameTH, studyDescription, protocolName};

    //Load Radio radioProfile
    log.info('radioId=>' + radioId);
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    // Notify to Case Owner Feedback
    let userNotify = {type: 'notify', message: 'You update Case success.'};
    await socket.sendMessage(userNotify, userProfile.username);

    //'เคสใหม่\nจากโรงพยาบาล %s\nผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\n';
    let lineCaseDetaileMsg = uti.fmtStr(common.msgNewCaseRadioDetailFormat, userProfile.hospitalName, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);

    // Notify to Case Radiologist
    //let radioNotify = {type: 'notify', message: lineCaseDetaileMsg};
    //await socket.sendMessage(radioNotify, radioProfile.username);

    if (newTaskOption == true) {
      //Load Urgent Profile
      if (targetCase.casestatusId == 1){
        let editOption = {edit: true};
        let actions = await onNewCaseEvent(caseId, editOption);
        resolve(actions);
      } else {
        let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_AcceptStep', 'UGType_WorkingStep'], where: {id: targetCase.urgenttypeId}});
        if (radioProfile.autoacc == 0) {
          //Create Task Schedule
          let triggerParam = JSON.parse(urgents[0].UGType_AcceptStep);
          let theTask = await common.doCreateTaskAction(tasks, caseId, userProfile, radioProfile, triggerParam, targetCase.casestatusId, lineCaseDetaileMsg, caseMsgData);
        } else if (radioProfile.autoacc == 1) {
          let acceptedCaseStatus = await common.doCallCaseStatusByName('Accepted');
          let acceptedCaseStatusId = acceptedCaseStatus[0].id;
          await targetCase.setCasestatus(acceptedCaseStatus[0]);
          let triggerParam = JSON.parse(urgents[0].UGType_WorkingStep);
          let theTask = await common.doCreateTaskAction(tasks, caseId, userProfile, radioProfile, triggerParam, acceptedCaseStatusId, lineCaseDetaileMsg, caseMsgData);
        }
        if ((radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
          let radioCaseMsgFmt = 'มีการแก้ไขข้อมูลเคส\nโรงพยาบาล %s\nชื่อ %s\nStudyDescription %s\nModality %s';
          if (studyDescription == '') {
            if (protocolName != ''){
              studyDescription = protocolName;
            } else {
              studyDescription = '-';
            }
          }
          let lineCaseMsg = uti.fmtStr(radioCaseMsgFmt, hospitalName, patientNameEN, studyDescription, modality);
          let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, 'quick', lineApi.radioMainMenu);
          await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
        }
        let actions = await doGetControlStatusAt(targetCase.casestatusId);
        resolve(actions);
      }
    } else {
      let actions = await doGetControlStatusAt(targetCase.casestatusId);
      resolve(actions);
    }
  });
}

const doChangeConsultStatus = function(from, next, consultId, userId){
  return new Promise(async function(resolve, reject) {
    const targetConsults = await db.radconsults.findAll({ attributes: ['casestatusId'], where: {id: consultId}});
    const nowConsultStatus = targetConsults[0].casestatusId;
    let isCando = await doCanChange(from, next, nowConsultStatus);
    if (isCando) {
      const consultStatusChange = { casestatusId: next};
      await db.radconsults.update(consultStatusChange, { where: { id: consultId } });
      /*
      let newKeepLog = { caseId : caseId,	userId : userId, from : from, to : next, remark : remark};
      await common.doCaseChangeStatusKeepLog(newKeepLog);
      */
      let actions = await doActionAfterChange(from, next, consultId);
      resolve({change: {status: true}, actions: actions});
    } else {
      resolve({change: {status: false}});
    }
  });
}

const doControlAddNewResponse = function(reqData) {
  return new Promise(async function(resolve, reject) {
    const caseId = reqData.caseId;
    const userId = reqData.userId;
    const reportType = reqData.reporttype;
    const responseType = reqData.data.Response_Type;

    const cases = await db.cases.findAll({attributes: ['casestatusId'], where: {id: caseId}});
    const users = await db.users.findAll({attributes: ['id'], where: {id: userId}});
    const nowStatusId = cases[0].casestatusId;

    let responseId = reqData.responseId;

    log.info('nowStatus=>' + nowStatusId);
    let nextStatus = common.nextCaseStausOnResponseChange(nowStatusId, responseType, reportType);
    log.info('nextStatus=>' + JSON.stringify(nextStatus));
    if (nextStatus) {
      let remark = 'Radio Save new normal Response success.';
      let newResponseStatus = [8];
      let editResponseStatus = [5, 6, 9, 10, 11, 12, 13, 14];
      let isNewResponse = uti.contains.call(newResponseStatus, nowStatusId);
      log.info('isNewResponse=>' + isNewResponse);
      let isEditResponse = uti.contains.call(editResponseStatus, nowStatusId);
      log.info('isEditResponse=>' + isEditResponse);
      if (isNewResponse) {
        log.info('responseId on isNewResponse=>' + responseId);
        if (!responseId){
          //Normal Flow
          let newResponse = reqData.data;
          //log.info('newResponse=>' + JSON.stringify(newResponse));
          let adResponse = await db.caseresponses.create(newResponse);
          await db.caseresponses.update({caseId: caseId, userId: userId}, { where: { id: adResponse.id } });
          let changeResult = await doChangeCaseStatus(nowStatusId, nextStatus, caseId, userId, remark);
          if (changeResult.change.status) {
            //log.info('resportType=>' + resportType);
            if (reportType){
              let newCaseReport = {Remark: remark, Report_Type: reportType, PDF_Filename: reqData.PDF_Filename, Status: 'new'};
              let adReport = await db.casereports.create(newCaseReport);
              await db.casereports.update({caseId: caseId, userId: userId, caseresponseId: adResponse.id}, { where: { id: adReport.id } });
              resolve({ status: {code: 200}, result: {responseId: adResponse.id}});
            } else {
              //BUG on Save Response
              let newCaseReport = {Remark: remark, Report_Type: 'normal', PDF_Filename: reqData.PDF_Filename, Status: 'new-abnormal'};
              let adReport = await db.casereports.create(newCaseReport);
              await db.casereports.update({caseId: caseId, userId: userId, caseresponseId: adResponse.id}, { where: { id: adReport.id } });
              //let subject = 'WARNING\nAbnormal Flow save New Response Event. Without reportType parameter.';
              //let sendEmailRes = await doReportCaseChangeStatusBug(subject, caseId, userId, reportType, responseType, nowStatusId, responseId);
              resolve({ status: {code: 200}, result: {responseId: adResponse.id}, warning: 'Abnormal save new report'});
            }
          } else {
            //let subject = 'WARNING\nNormal Flow save Response Event with Exception Can not Change Status.';
            //let sendEmailRes = await doReportCaseChangeStatusBug(subject, caseId, userId, reportType, responseType, nowStatusId, responseId);
            resolve({ status: {code: 203}, result: {responseId: adResponse.id}});
          }
        } else {
          //Un-Normal Flow
          /*
            onOpenCaseStatus (8) But it has caseResposeId
          */

          let editResponse = reqData.data;
          //log.info('editResponse=>' + JSON.stringify(editResponse));
          log.info('reportType=>' + reportType);
          let editResponseRes = await db.caseresponses.update(editResponse, { where: { id: responseId } });
          remark = 'Radio Save update ' + reportType + ' Response success.';
          let changeResult = await doChangeCaseStatus(nowStatusId, nextStatus, caseId, userId, remark);
          let casereports = await db.casereports.findAll({attributes: ['id'], where: {caseresponseId: responseId}});
          if (casereports.length > 0) {
            if (reportType){
              await db.casereports.update({Report_Type: reportType, Status: 'update'}, {where: {caseresponseId: responseId}});
            } else {
              await db.casereports.update({Report_Type: 'normal', Status: 'update-abnormal'}, {where: {caseresponseId: responseId}});
            }
          } else {
            let newCaseReport = {Remark: remark, Report_Type: 'normal', PDF_Filename: reqData.PDF_Filename, Status: 'new-abnormal-last'};
            let adReport = await db.casereports.create(newCaseReport);
            await db.casereports.update({caseId: caseId, userId: userId, caseresponseId: responseId}, { where: { id: adReport.id } });
          }

          //let subject = 'WARNING\nUn-Normal Flow save Response Event.';
          //let sendEmailRes = await doReportCaseChangeStatusBug(subject, caseId, userId, reportType, responseType, nowStatusId, responseId);
          resolve({ status: {code: 200}, result: {responseId: responseId}});
        }
      } else if (isEditResponse){
        //Normal Flow
        if (!responseId){
          let yourOldResponses = await db.caseresponses.findAll({attributes: ['id'], where: {caseId: caseId}});
          if (yourOldResponses.length > 0){
            responseId = yourOldResponses[0].id;
          } else {
            //ต้องเปลี่ยนสถานะเป็น 8 แล้วส่งใหม่
            if ((caseId) && (userId)){
              let newResponse = reqData.data;
              let adResponse = await db.caseresponses.create(newResponse);
              await db.caseresponses.update({caseId: caseId, userId: userId}, { where: { id: adResponse.id } });
              responseId = adResponse.id;
            } else {
              let saveError = new Error({code: 500, cuase: 'Save Response without caseId or userId'});
              reject(saveError);
            }
          }
        }
        if (responseId){
          let updateResponse = reqData.data;
          let upResponse = await db.caseresponses.update(updateResponse, { where: { id: responseId } });
          let casereports = await db.casereports.findAll({attributes: ['id'], where: {caseresponseId: responseId}});
          log.info('casereports=>' + JSON.stringify(casereports));
          log.info('responseType=>' + responseType);
          if (responseType === 'normal'){
            let changeResult = await doChangeCaseStatus(nowStatusId, nextStatus, caseId, userId, remark);
            if (changeResult.change.status) {
              /*
              let newCaseReport = {Remark: remark, Report_Type: reportType, PDF_Filename: reqData.PDF_Filename, Status: 'new'};
              let adReport = await db.casereports.create(newCaseReport);
              await db.casereports.update({caseId: caseId, userId: userId, caseresponseId: responseId}, { where: { id: adReport.id } });
              */
              if (casereports.length == 0) {
                let newCaseReport = {Remark: remark, Report_Type: 'normal', PDF_Filename: reqData.PDF_Filename, Status: 'new-abnormal-last'};
                let adReport = await db.casereports.create(newCaseReport);
                await db.casereports.update({caseId: caseId, userId: userId, caseresponseId: responseId}, { where: { id: adReport.id } });
              }
              resolve({ status: {code: 200}, result: {responseId: responseId}});
            } else {
              //let subject = 'WARNING\nNormal Flow edit Response Event with Exception Can not Change Status.';
              //let sendEmailRes = await doReportCaseChangeStatusBug(subject, caseId, userId, reportType, responseType, nowStatusId, responseId);
              resolve({ status: {code: 203}, result: {responseId: responseId}});
            }
          } else if (responseType === 'draft'){
            if (casereports.length == 0) {
              let newCaseReport = {Remark: remark, Report_Type: 'normal', PDF_Filename: reqData.PDF_Filename, Status: 'new-abnormal-last'};
              let adReport = await db.casereports.create(newCaseReport);
              await db.casereports.update({caseId: caseId, userId: userId, caseresponseId: responseId}, { where: { id: adReport.id } });
            }
            resolve({ status: {code: 200}, result: {responseId: responseId}});
          }
        } else {
          //let subject = 'WARNING\nNormal Flow edit Response Event with Exception without responseid.';
          //let sendEmailRes = await doReportCaseChangeStatusBug(subject, caseId, userId, reportType, responseType, nowStatusId, responseId);
          resolve({ status: {code: 203}, result: {responseId: 'undefided'}});
        }
      } else {
        resolve({ status: {code: 200}, text: 'Your case is not on recieve response status. nowStatusId=' + nowStatusId});
      }
    } else {
      resolve({ status: {code: 400}, error: 'Your now casestatusId is undefinded.'});
    }
  });
}

const doReportCaseChangeStatusBug = function(subject, caseId, userId, reportType, responseType, nowStatusId, responseId){
  return new Promise(async function(resolve, reject) {
    let reportAt = uti.formatDateTimeStr(new Date());
    let msgHtml = uti.fmtStr('<h2>caseId %s</h2>', caseId);
    msgHtml += uti.fmtStr('<h2>userId  %s</h2>', userId);
    msgHtml += uti.fmtStr('<h2>reportType %s</h2>', reportType);
    msgHtml += uti.fmtStr('<h2>responseType %s</h2>', responseType);
    msgHtml += uti.fmtStr('<h2>nowStatusId %s</h2>', nowStatusId);
    msgHtml += uti.fmtStr('<h2>responseId %s</h2>', responseId);
    msgHtml += uti.fmtStr('<p>Event at %s</p>', reportAt);
    msgHtml += '<p>Please No-Reply This Email.</p>';
    let sendEmailRes = await common.doSendEmailToAdmin(subject, msgHtml);
    resolve(sendEmailRes);
  });
}

module.exports = (dbconn, monitor, casetask, warningtask, voiptask, websocket) => {
	db = dbconn;
	log = monitor;
  tasks = casetask;
  warnings = warningtask;
  voips = voiptask;
  socket = websocket;
  uti = require('../../lib/mod/util.js')(db, log);
  lineApi = require('../../lib/mod/lineapi.js')(db, log);
  common = require('./commonlib.js')(db, log, tasks);
  return {
    doFilerStatusChange,
    doCanChange,
    doChangeCaseStatus,
    doCalTriggerMinut,
    doAutoPhoneCallRadio,
    onNewCaseEvent,
    onAcceptCaseEvent,
    onRejectCaseEvent,
    onExpiredCaseEvent,
    onSuccessCaseEvent,
    onCloseCaseEvent,
    onCancelCaseEvent,
    onOpenCaseEvent,
    onDraftResultCaseEvent,
    onViewResultCaseEvent,
    onPrintResultCaseEvent,
    onEditResultCaseEvent,
    onPreliminaryResultCaseEvent,
    onIssueMessageResultCaseEvent,
    onHospitalUpdateCaseEvent,

    doChangeConsultStatus,
    doControlAddNewResponse,
    doReportCaseChangeStatusBug
  }
}
