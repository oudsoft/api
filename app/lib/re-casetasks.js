/*re-casetasks.js*/

module.exports = ( taskCase, task, voipTask, dbconn, monitor, webSocketServer ) => {
  let db = dbconn;
  let log = monitor;
  let tasks = taskCase;
  let whomtask = task;
  let voips = voipTask;
  let webSocket = webSocketServer;
  let uti = require('./mod/util.js')(db, log);
  let common = require('../db/rest/commonlib.js')(db, log);

  const fs = require('fs');
  const path = require('path');

  const caseStatusIds = [1, 2, 8, 9]; //<- alive status

  const ddMilliSec = 24 * 60 * 60 * 1000;
  const hhMilliSec = 60 * 60 * 1000;
  const mnMilliSec = 60 * 1000;

  let doLoadAliveCase = function(casestatusIds){
    return new Promise(async function(resolve, reject) {
      const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN', 'Patient_NameTH', 'Patient_LastNameTH']}, {model: db.hospitals, attributes: ['Hos_Name', 'Hos_Code']}];
      let aliveCases = await db.cases.findAll({include: caseInclude, attributes: ['id', 'urgenttypeId', 'userId', 'casestatusId', 'Case_RadiologistId', 'createdAt', 'Case_StudyDescription', 'Case_ProtocolName', 'Case_BodyPart', 'Case_Modality'], where: {casestatusId: { [db.Op.in]: casestatusIds}}});
      resolve(aliveCases);
    });
  }

  let doLoadUrgent = function(urgenttypeId){
    return new Promise(async function(resolve, reject) {
      let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_AcceptStep', 'UGType_WorkingStep'], where: {id: urgenttypeId}});
      resolve(urgents);
    });
  }

  let isAlive = function(createAt, triggerAt){
    const startDate = new Date();
    const startTime = startDate.getTime();
    const createDate = new Date(createAt);
    const createTime = createDate.getTime();
    const day = Number(triggerAt.dd) * ddMilliSec;
    const hour = Number(triggerAt.hh) * hhMilliSec;
    const minute = Number(triggerAt.mn) * mnMilliSec;
    const endDate = new Date(createTime + day + hour + minute);
    const endTime = endDate.getTime();

    if (endTime > startTime){
      return true
    } else {
      return false;
    }
  }

  let doCalTriggerParam = function(createAt, triggerAt){
    const startDate = new Date();
    const startTime = startDate.getTime();
    const createDate = new Date(createAt);
    const createTime = createDate.getTime();

    const day = Number(triggerAt.dd) * ddMilliSec;
    const hour = Number(triggerAt.hh) * hhMilliSec;
    const minute = Number(triggerAt.mn) * mnMilliSec;
    const endDate = new Date(createTime + day + hour + minute);
    const endTime = endDate.getTime();

    let reParamTime = endTime - startTime;

    //log.info(reParamTime/ddMilliSec);
    let dd = Math.trunc(reParamTime/ddMilliSec);
    reParamTime = reParamTime - (dd * ddMilliSec);
    //log.info(reParamTime/hhMilliSec);
    let hh = Math.trunc(reParamTime/hhMilliSec);
    reParamTime = reParamTime - (hh * hhMilliSec);
    //log.info(reParamTime/mnMilliSec);
    let mn = Math.trunc(reParamTime/mnMilliSec);
    return {dd, hh, mn};
  }

  let doCalTriggerMinut = function(totalMinut, radioProfile){
    let triggerMinut = undefined;
    if (webSocket.getScreenState(radioProfile.username) == 0){
      //Active State
      if (totalMinut <= 60){
        triggerMinut = radioProfile.radioPhoneCallOptions.activeState.optionCaseControl.case1H;
      } else if ((totalMinut > 60) && (totalMinut <= 240)){
        triggerMinut = radioProfile.radioPhoneCallOptions.activeState.optionCaseControl.case4H;
      }
    } else if (webSocket.getScreenState(radioProfile.username) == 1){
      //lock State
      if (totalMinut <= 60){
        triggerMinut = radioProfile.radioPhoneCallOptions.lockState.optionCaseControl.case1H;
      } else if ((totalMinut > 60) && (totalMinut <= 240)){
        triggerMinut = radioProfile.radioPhoneCallOptions.lockState.optionCaseControl.case4H;
      }
    } else {
      //offline State
      if (totalMinut <= 60){
        triggerMinut = radioProfile.radioPhoneCallOptions.offlineState.optionCaseControl.case1H;
      } else if ((totalMinut > 60) && (totalMinut <= 240)){
        triggerMinut = radioProfile.radioPhoneCallOptions.offlineState.optionCaseControl.case4H;
      }
    }
    return triggerMinut;
  }

  let reRunGenerateCaseTask = function(){
    return new Promise(async function(resolve, reject) {
      let alives = [];
      let aliveCases = await doLoadAliveCase(caseStatusIds);
      log.info('aliveCases=>' + JSON.stringify(aliveCases));
      const promiseList = new Promise(async function(resolve2, reject2) {
        await aliveCases.forEach(async (aliveCase, i) => {
          let caseCreateAt = aliveCase.createdAt;
          let caseUrgentTypeId = aliveCase.urgenttypeId;
          let caseStatusId = aliveCase.caseStatusId;
          let caseUserId = aliveCase.userId;
          let caseRadioId = aliveCase.Case_RadiologistId;
          let caseUrgents = await doLoadUrgent(caseUrgentTypeId);
          let triggerAccAt = JSON.parse(caseUrgents[0].UGType_AcceptStep);
          let triggerWrkAt = JSON.parse(caseUrgents[0].UGType_WorkingStep);

          let accAlive = isAlive(aliveCase.createdAt, triggerAccAt);
          let wrkAlive = isAlive(aliveCase.createdAt, triggerWrkAt);

          if (accAlive) {
            let caseId = aliveCase.id;
            let userProfile = await common.doLoadUserProfile(caseUserId);
            let radioProfile = await common.doLoadRadioProfile(caseRadioId);

            let hospitalName = aliveCase.hospital.Hos_Name;
            let patientNameEN = aliveCase.patient.Patient_NameEN + ' ' + aliveCase.patient.Patient_LastNameEN;
            let patientNameTH = aliveCase.patient.Patient_NameTH + ' ' + aliveCase.patient.Patient_LastNameTH;
            let caseCreateAt = aliveCase.createdAt;
            let studyDescription = '';
            if ((aliveCase.Case_StudyDescription) && (aliveCase.Case_StudyDescription !== '')) {
              studyDescription = aliveCase.Case_StudyDescription;
            } else if ((aliveCase.Case_ProtocolName) && (aliveCase.Case_ProtocolName !== '')) {
              studyDescription = aliveCase.Case_ProtocolName;
            } else {
              studyDescription = 'N/A';
            }

            let caseMsgData = {hospitalName, patientNameEN, patientNameTH, caseCreateAt, studyDescription};

            let lineCaseDetaileMsg = uti.fmtStr(common.msgEditCaseRadioDetailFormat, userProfile.hospitalName, patientNameEN, aliveCase.Case_StudyDescription, aliveCase.Case_ProtocolName, aliveCase.Case_BodyPart, aliveCase.Case_Modality);

            let newAccUrgentParam = doCalTriggerParam(aliveCase.createdAt, triggerAccAt);

            let theTask = await common.doCreateTaskAction(tasks, caseId, userProfile, radioProfile, newAccUrgentParam, caseStatusId, lineCaseDetaileMsg, caseMsgData);

            if (radioProfile.radioAutoCall == 1) {
              let totalMinut = (Number(newAccUrgentParam.dd) * 24 * 60) + (Number(newAccUrgentParam.hh) * 60) + Number(newAccUrgentParam.mn);
              log.info('totalMinut=>' + totalMinut);
              let triggerMinut = doCalTriggerMinut(totalMinut, radioProfile);
              log.info('triggerMinut=>' + triggerMinut);
              if ((triggerMinut) && (triggerMinut > 0)) {
                let hospitalCode = aliveCase.hospital.Hos_Code;
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
                  voiceUrgent = uti.doCalUrgentVoiceCall(triggerAt);
                } else {
                  voipTriggerParam = {dd: 0, hh: 0, mn: 2};
                  voiceUrgent = uti.doCalUrgentVoiceCall(1);
                }
                let caseVoipData = {caseId: caseId, transactionId: voiceTransactionId, hospitalCode: hospitalCode, urgentType: voiceUrgent};
                let theVoipTask = await common.doCreateTaskVoip(voips, caseId, userProfile, radioProfile, voipTriggerParam, caseStatusId, caseVoipData);
              }
            }
            alives.push(caseId);
          } else if (wrkAlive) {
            let caseId = aliveCase.id;
            let userProfile = await common.doLoadUserProfile(caseUserId);
            let radioProfile = await common.doLoadRadioProfile(caseRadioId);

            let hospitalName = aliveCase.hospital.Hos_Name;
            let patientNameEN = aliveCase.patient.Patient_NameEN + ' ' + aliveCase.patient.Patient_LastNameEN;
            let patientNameTH = aliveCase.patient.Patient_NameTH + ' ' + aliveCase.patient.Patient_LastNameTH;
            let caseCreateAt = aliveCase.createdAt;
            let studyDescription = '';
            if ((aliveCase.Case_StudyDescription) && (aliveCase.Case_StudyDescription !== '')) {
              studyDescription = aliveCase.Case_StudyDescription;
            } else if ((aliveCase.Case_ProtocolName) && (aliveCase.Case_ProtocolName !== '')) {
              studyDescription = aliveCase.Case_ProtocolName;
            } else {
              studyDescription = 'N/A';
            }

            let caseMsgData = {hospitalName, patientNameEN, patientNameTH, caseCreateAt, studyDescription};

            let lineCaseDetaileMsg = uti.fmtStr(common.msgEditCaseRadioDetailFormat, userProfile.hospitalName, patientNameEN, aliveCase.Case_StudyDescription, aliveCase.Case_ProtocolName, aliveCase.Case_BodyPart, aliveCase.Case_Modality);

            let newWrkUrgentParam = doCalTriggerParam(aliveCase.createdAt, triggerWrkAt);

            let theTask = await common.doCreateTaskAction(tasks, caseId, userProfile, radioProfile, newWrkUrgentParam, caseStatusId, lineCaseDetaileMsg, caseMsgData);

            alives.push(caseId);
          }
        });
        setTimeout(()=>{
          resolve2(alives);
        }, 2800);
      });
      Promise.all([promiseList]).then((ob)=> {
        resolve({status: {code: 200}, alives: ob[0]});
      });
    });
  }

  let doReConsultTask = function(){
    return new Promise(async function(resolve, reject) {
      const consultInclude = [{model: db.hospitals, attributes: ['Hos_Name']}];
      const aliveConsults = await db.radconsults.findAll({include: consultInclude, where: {casestatusId: 1}});

      let alives = [];
      if (aliveConsults.length > 0){
        const promiseList = new Promise(async function(resolve2, reject2) {
          await aliveConsults.forEach(async (aliveConsult, i) => {
            let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_AcceptStep'], where: {id: aliveConsult.UGType}});
            let triggerParam = JSON.parse(urgents[0].UGType_AcceptStep);
            let onAlive = isAlive(aliveConsult.createdAt, triggerParam);
            if (onAlive){
              let radioProfile = await common.doLoadRadioProfile(aliveConsult.RadiologistId);
              let userProfile = await common.doLoadUserProfile(aliveConsult.userId);
              let hospitalName = newConsult.hospital.Hos_Name;
              let patientName = newConsult.PatientName;
              let patientHN = newConsult.PatientHN;
              let consultMsgData = {hospitalName, patientName, patientHN, createAt: aliveConsult.createdAt};
              let msgNewConsultRadioDetailFormat = 'Consult่\nจากโรงพยาบาล %s\nผู้ป่วยชื่อ %s\nHN %s';
              let lineConsultDetaileMsg = uti.fmtStr(msgNewConsultRadioDetailFormat, hospitalName, patientName, patientHN);

              let newTriggerParam = doCalTriggerParam(aliveConsult.createdAt, triggerParam);

              let newTask = await whomtask.doCreateNewTaskConsult(aliveConsult.id, userProfile.username, newTriggerParam, radioProfile.username, userProfile.hospitalName, aliveConsult.casestatusId, async (consultId, socket, endDateTime)=>{
                let nowconsultStatus = await db.radconsults.findAll({ attributes: ['casestatusId'], where: {id: consultId}});
                if (nowconsultStatus[0].casestatusId === baseConsultStatusId) {
                  await common.doConsultExpireAction(whomtask, webSocket, consultId, websocket, aliveConsult.casestatusId, radioProfile, userProfile, lineConsultDetaileMsg, userProfile.hospitalName);
                } else {
                  await whomtask.removeTaskByConsultId(consultId);
                }
              });

              alives.push(aliveConsult.id);
            }
          });
          setTimeout(()=>{
            resolve2(alives);
          }, 2800);
        });
        Promise.all([promiseList]).then((ob)=> {
          resolve({status: {code: 200}, alives: ob[0]});
        });
      } else {
        resolve({status: {code: 200}, alives: []});
      }
    });
  }

  let doTestPhoneCall = function(){
    return new Promise(async function(resolve, reject) {
      let caseId = 844;
      let radioId = 11;
      let radioProfile = await common.doLoadRadioProfile(radioId);
      let triggerParam = {dd: '00', hh: '02', mn: '30'};
      let hospitalCode = 'lpt';
      let callRes = await common.doRequestPhoneCalling(caseId, radioProfile, triggerParam, hospitalCode);
      log.info('callPhoneResult=> ' + JSON.stringify(callRes));
      resolve(callRes);
    });
  }

  let doLoadExceedCase = function(){
    return new Promise(async function(resolve, reject) {
      let last10Day = new Date(Date.now() - (10 * 24 * 60 * 60 * 1000));
      let last1Day = new Date(Date.now() - (24 * 60 * 60 * 1000));
      let casewhereClous = {createdAt: {[db.Op.between]: [last10Day, last1Day]}};
      let orderby = [['id', 'DESC']];
      let lastCases = await db.cases.findAll({attributes: ['id', 'casestatusId', 'Case_DicomZipFilename'], where: [casewhereClous], order: orderby});
      //log.info('lastCases=> ' + JSON.stringify(lastCases));
      await lastCases.forEach(async(item, i) => {
        await doDeleteExceedZipFile(item.Case_DicomZipFilename);
      });
      resolve(lastCases);
    });
  }

  let doDeleteExceedZipFile = function(zipFileName){
    return new Promise(async function(resolve, reject) {
      let publicDir = path.normalize(__dirname + '/../..');
      let usrArchiveDir = publicDir + process.env.USRARCHIVE_DIR;

      let existPath = usrArchiveDir + '/' + zipFileName;
      let isExist = fs.existsSync(existPath);
      if (isExist) {
        let command = uti.fmtStr('rm %s', existPath);
        await uti.runcommand(command);
      }
      resolve();
    });
  }

  let doRun = function(){
    return new Promise(async function(resolve, reject) {
      let taskCaseResult = await reRunGenerateCaseTask();
      let taskConsultResult = await doReConsultTask();
      let lastExceedCaseResult = await doLoadExceedCase();
      resolve({taskCaseResult, taskConsultResult/*, lastExceedCaseResult*/});
    });
  }

  return {
    doRun
  }
}
