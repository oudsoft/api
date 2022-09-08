const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, tasks, warnings, voips, Case, log, auth, socket, lineApi, uti, common, statusControl;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const hospitalId = req.query.hospitalId;
          const limit = req.query.jtPageSize;
          const startAt = req.query.jtStartIndex;
          //const count = await Case.count();
          const cases = await Case.findAll({offset: startAt, limit: limit, attributes: excludeColumn, where: {hospitalId: hospitalId}});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({Result: "OK", Records: cases, TotalRecordCount: cases.length});
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

//Filter By Hospital API
app.post('/filter/hospital', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        //log.info('ur[0]=> ' + JSON.stringify(ur[0]));
        try {
          const hospitalId = req.body.hospitalId;
          const userId = req.body.userId;
          const statusId = req.body.statusId;
          const filterDate = req.body.filterDate;
          let whereClous;
          if (filterDate) {
            let startDate = new Date(filterDate.from);
            if (ur[0].usertypeId !== 5) {
              whereClous = {hospitalId: hospitalId, casestatusId: { [db.Op.in]: statusId }, createdAt: { [db.Op.gte]: startDate}};
              if (userId) {
                whereClous.userId = userId
              }
            } else {
              whereClous = {hospitalId: hospitalId, casestatusId: { [db.Op.in]: statusId }, createdAt: { [db.Op.gte]: startDate}};
              if (userId) {
                whereClous.Case_RefferalId = userId
              }
            }
          } else {
            if (ur[0].usertypeId !== 5) {
              whereClous = {hospitalId: hospitalId, casestatusId: { [db.Op.in]: statusId }};
              if (userId) {
                whereClous.userId = userId
              }
            } else {
              whereClous = {hospitalId: hospitalId, casestatusId: { [db.Op.in]: statusId }};
              if (userId) {
                whereClous.Case_RefferalId = userId
              }
            }
          }
          const caseInclude = [{model: db.patients, attributes: excludeColumn}, {model: db.casestatuses, attributes: ['id', 'CS_Name_EN']}, {model: db.urgenttypes, attributes: ['id', 'UGType', 'UGType_Name']}, {model: db.cliamerights, attributes: ['id', 'CR_Name']}];
          const orderby = [['id', 'DESC']];
          const cases = await Case.findAll({include: caseInclude, where: whereClous, order: orderby});
          const casesFormat = [];
          const promiseList = new Promise(async function(resolve, reject) {
            for (let i=0; i<cases.length; i++) {
              let item = cases[i];
              const radUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RadiologistId}});
              const rades = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: radUser[0].userinfoId}});
              const Radiologist = {id: item.Case_RadiologistId, User_NameTH: rades[0].User_NameTH, User_LastNameTH: rades[0].User_LastNameTH};
              const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
              const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
              const Refferal = {id: item.Case_RefferalId, User_NameTH: refes[0].User_NameTH, User_LastNameTH: refes[0].User_LastNameTH};
              casesFormat.push({case: item, Radiologist: Radiologist, Refferal: Refferal});
            }
            setTimeout(()=> {
              resolve(casesFormat);
            },500);
          });
          Promise.all([promiseList]).then((ob)=> {
            res.json({status: {code: 200}, Records: ob[0]});
          }).catch((err)=>{
            log.error(error);
            res.json({status: {code: 500}, error: err});
          });
        } catch(error) {
          log.error('Error=>' + JSON.stringify(err));
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

//Filter By radio API
app.post('/filter/radio', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const statusId = req.body.statusId;
          const radioId = req.body.userId;
          const caseInclude = [{model: db.hospitals, attributes: ['id', 'Hos_Name']}, {model: db.patients, attributes: excludeColumn}, {model: db.casestatuses, attributes: ['id', 'CS_Name_EN']}, {model: db.urgenttypes, attributes: ['id', 'UGType', 'UGType_Name']}, {model: db.cliamerights, attributes: ['id', 'CR_Name']}];
          const whereClous = {Case_RadiologistId: radioId, casestatusId: { [db.Op.in]: statusId } };
          const orderby = [['id', 'DESC']];
          const radioCases = await Case.findAll({include: caseInclude, where: whereClous, order: orderby});
          /*
          const promiseListRef = new Promise(async function(resolveRef, rejectRef) {
            const finalCases = [];
            await radioCases.forEach(async (item, i) => {
              const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
              const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
              const ownerUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.userId}});
              const owners = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: ownerUser[0].userinfoId}});
              finalCases.push({case: item, reff: refes[0], owner: owners[0]});
            });
            setTimeout(()=> {
              resolveRef(finalCases);
            },1500);
          });
          Promise.all([promiseListRef]).then((ob)=> {
            res.json({status: {code: 200}, Records: ob[0]});
          });
          */
          res.json({status: {code: 200}, Records: radioCases});
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

//Filter By patient API
app.post('/filter/patient', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const statusId = req.body.statusId;
          const patientId = req.body.patientId;
          const hospitalId = req.body.hospitalId;
          const currentCaseId = req.body.currentCaseId;
          const limit = req.body.limit;

          const filterParams = {statusId, patientId, hospitalId, currentCaseId, limit}
          let patientFilter = await common.doFilterPatient(filterParams);
          res.json({status: {code: 200}, Records: patientFilter.Records});
          /*
          const caseInclude = [{model: db.caseresponses, attributes: ['id', 'Response_HTML', 'Response_Text']}];
          const whereClous = {patientId: patientId, hospitalId: hospitalId, casestatusId: { [db.Op.in]: statusId}, id: { [db.Op.ne]: currentCaseId} };
          const orderby = [['id', 'DESC']];
          let query = undefined;
          if ((limit) && (limit > 0)) {
            query = {limit: limit, attributes: ['id', 'createdAt', 'Case_BodyPart', 'Case_OrthancStudyID', 'Case_StudyInstanceUID', 'Case_PatientHRLink', 'hospitalId'], include: caseInclude, where: whereClous, order: orderby};
          } else {
            query = {attributes: ['id', 'createdAt', 'Case_BodyPart', 'Case_OrthancStudyID', 'Case_StudyInstanceUID', 'Case_PatientHRLink', 'hospitalId'], include: caseInclude, where: whereClous, order: orderby};
          }
          const patientCases = await Case.findAll(query);
          res.json({status: {code: 200}, Records: patientCases});
          */
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
app.post('/select/(:caseId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let caseId = req.params.caseId;
          let selectedCase = await common.doSelectCaseById(caseId);
          res.json({status: {code: 200}, Records: selectedCase.Records});
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

//change status
app.post('/status/(:caseId)', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const caseId = req.params.caseId;
        const reqCaseStatusId = req.body.casestatusId;
        const remark = req.body.caseDescription;
        //attributes = 'casestatusId'
        const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}, {model: db.hospitals, attributes: ['Hos_Name']}];
        const targetCases = await Case.findAll({ attributes: ['id', 'casestatusId', 'userId', 'Case_StudyDescription', 'Case_Modality'], include: caseInclude, where: {id: caseId}});

        const currentStatus = targetCases[0].casestatusId;
        //const userId = targetCases[0].userId;
        const userId = ur[0].id;

        let changeResult = await statusControl.doChangeCaseStatus(currentStatus, reqCaseStatusId, caseId, userId, remark)


        if (changeResult.change.status == true) {
          if((currentStatus==1) && (reqCaseStatusId==2)) {
            //send triggerDatetime message to chat bot
            let radioProfile = await common.doLoadRadioProfile(userId);
            if ((radioProfile.linenotify == 1) && (radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
              let action = 'quick';
              let actionReturnText = await common.doCreateTriggerChatBotMessage(caseId, changeResult.triggerDate);
              let menuQuickReply = lineApi.createBotMenu(actionReturnText, action, lineApi.radioMainMenu);
              await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
            }
          } else if((currentStatus==1) && (reqCaseStatusId==3)) {
            let radioProfile = await common.doLoadRadioProfile(userId);
            if ((radioProfile.linenotify == 1) && (radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
              let action = 'quick';
              let patientNameEN = targetCases[0].patient.Patient_NameEN + ' ' + targetCases[0].patient.Patient_LastNameEN;
              /*
              let studyDesc = targetCases[0].Case_StudyDescription;
              let modality = targetCases[0].Case_Modality;
              let actionReturnTextFmt = 'ปฏิเสธเคส\nชื่อ %s\nStudy Desc. %s\nModality %s แล้ว\n แล้ว';
              let actionReturnText = uti.fmtStr(actionReturnTextFmt, patientNameEN, studyDesc, modality);
              */
              let actionReturnTextFmt = 'ปฏิเสธเคส\nชื่อ %s แล้ว\n แล้ว';
              let actionReturnText = uti.fmtStr(actionReturnTextFmt, patientNameEN);

              let menuQuickReply = lineApi.createBotMenu(actionReturnText, action, lineApi.radioMainMenu);
              await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
            }
          }
          res.json({status: {code: 200}, actions: changeResult.change.actiohs});
        } else {
          res.json({status: {code: 203}, actions: []});
        }
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

//short-cut change status
app.post('/status/shortcut/(:caseId)', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const caseId = req.params.caseId;
        const reqCaseStatusId = req.body.casestatusId;
        const remark = req.body.caseDescription;
        const caseStatusChange = { casestatusId: reqCaseStatusId, Case_DESC: remark};
        await Case.update(caseStatusChange, { where: { id: caseId } });
        res.json({status: {code: 200}});
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

//get current casestatus
app.get('/status/(:caseId)', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const caseId = req.params.caseId;
        const targetCases = await Case.findAll({ attributes: ['id', 'casestatusId'], where: {id: caseId}});
        const currentStatus = targetCases[0].casestatusId;
        let canUpdate = ((uti.contains.call(common.casestatusCanUpdate, currentStatus)));
        res.json({status: {code: 200}, current: currentStatus, canupdate: canUpdate});
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

//Search By radio API
app.post('/search/radio', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const raduserId = req.body.userId;
          const statusId = req.body.condition.statusId;
          const hospitalId = req.body.condition.hospitalId;
          const key = req.body.condition.key;
          const value = req.body.condition.value;
          const caseInclude = [{model: db.hospitals, attributes: ['Hos_Name']}, {model: db.patients, attributes: excludeColumn}, {model: db.casestatuses, attributes: ['id', 'CS_Name_EN']}, {model: db.urgenttypes, attributes: ['id', 'UGType', 'UGType_Name']}, {model: db.cliamerights, attributes: ['id', 'CR_Name']}];
          const whereClous = {hospitalId: hospitalId, Case_RadiologistId: raduserId, casestatusId: { [db.Op.in]: statusId }};
          const cases = await Case.findAll({include: caseInclude, where: whereClous});
          let caseResults = [];
          const promiseList = new Promise(async function(resolve, reject) {
            cases.forEach(async (item, i) => {
              if (key === 'PatientName') {
                if (value.indexOf('*') == 0) {
                  let searchVal = value.substring(1);
                  if (item.patient.Patient_NameEN.indexOf(searchVal) >= 0) {
                    const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
                    const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
                    const ownerUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.userId}});
                    const owners = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: ownerUser[0].userinfoId}});
                    caseResults.push({case: item, reff: refes[0], owner: owners[0]});
                  }
                } else if (value.indexOf('*') == (value.length-1)) {
                  let searchVal = value.substring(0, (value.length-1));
                  if (item.patient.Patient_NameEN.indexOf(searchVal) >= 0) {
                    const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
                    const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
                    const ownerUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.userId}});
                    const owners = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: ownerUser[0].userinfoId}});
                    caseResults.push({case: item, reff: refes[0], owner: owners[0]});
                  }
                } else {
                  if (item.patient.Patient_NameEN === value) {
                    const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
                    const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
                    const ownerUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.userId}});
                    const owners = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: ownerUser[0].userinfoId}});
                    caseResults.push({case: item, reff: refes[0], owner: owners[0]});
                  }
                }
              } else if (key === 'PatientHN') {
                if (item.patient.Patient_HN === value) {
                  const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
                  const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
                  const ownerUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.userId}});
                  const owners = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: ownerUser[0].userinfoId}});
                  caseResults.push({case: item, reff: refes[0], owner: owners[0]});
                }
              }
            });
            setTimeout(()=> {
              resolve(caseResults);
            },500);
          });
          Promise.all([promiseList]).then((ob)=> {
            res.json({status: {code: 200}, Records: ob[0]});
          }).catch((err)=>{
            reject(err);
          });
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

//add insert API
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        common.doCallCaseStatusByName('New').then(async (newcaseStatus) => {
          const newcaseStatusId = newcaseStatus[0].id;
          const newCase = req.body.data;
          const userId = req.body.userId;
          const hospitalId = req.body.hospitalId;
          const patientId = req.body.patientId;
          const urgenttypeId = req.body.urgenttypeId;
          const cliamerightId = req.body.cliamerightId;
          const setupCaseTo = { hospitalId: hospitalId, patientId: patientId, userId: userId, cliamerightId: cliamerightId, urgenttypeId: urgenttypeId};

          //Insert New Case
          const adCase = await Case.create(newCase);
          //log.info('newCase=>' + JSON.stringify(adCase));
          await Case.update(setupCaseTo, { where: { id: adCase.id } });
          await adCase.setCasestatus(newcaseStatus[0]);

          let newKeepLog = { caseId : adCase.id,	userId : userId, from : 1, to : 1, remark : 'Create New Case Success'};
          await common.doCaseChangeStatusKeepLog(newKeepLog);

          const optionScanPartSave = req.body.option.scanpart.save;
          if (optionScanPartSave == 1){
            let scanpartAuxData = {StudyDesc: newCase.Case_StudyDescription, ProtocolName: newCase.Case_ProtocolName, Scanparts: newCase.Case_ScanPart};
            let scanpartAux = await common.doSaveScanpartAux(scanpartAuxData, userId);
          }
          res.json({Result: "OK", status: {code: 200}, Record: adCase});
          /*
          let actionAfterChange = await statusControl.onNewCaseEvent(adCase.id);
          res.json({Result: "OK", status: {code: 200}, Record: adCase, actions: actionAfterChange});
          let patients = await db.patients.findAll({attributes: ['Patient_NameEN', 'Patient_LastNameEN'], where: {id: patientId}});
          let patientNameEN = patients[0].Patient_NameEN;
          let patientLastNameEN = patients[0].Patient_LastNameEN;
          let out = await common.doConvertPatientHistoryImage2Dicom(adCase.Case_OrthancStudyID, hospitalId, req.hostname, adCase.Case_PatientHRLink, adCase.Case_Modality, patientNameEN, patientLastNameEN);
          log.info('out=> ' + JSON.stringify(out));
          let reviseHR = {Case_PatientHRLink: out.newHRprop};
          await Case.update(reviseHR, { where: { id: adCase.id } });
          let notifyMsg = 'Your request new case can success create advance dicom zip file.'
          let ownerNotify = {type: 'notify', message: notifyMsg};
          await socket.sendMessage(ownerNotify, ur[0].username);
          */
          let orthancs = await db.orthancs.findAll({ attributes: excludeColumn, where: {hospitalId: hospitalId}});
          let yourOrthancId = orthancs[0].id;

          let studyTags = req.body.studyTags;
          //log.info('studyTags=> ' + JSON.stringify(studyTags));
          let dicomlogRes = await db.dicomtransferlogs.findAll({attributes: excludeColumn, where: {ResourceID: studyTags.ID}});
          //log.info('dicomlogRes=> ' + JSON.stringify(dicomlogRes));
          if (dicomlogRes.length == 0) {
            let newDicomLog = {DicomTags: studyTags, StudyTags: studyTags, ResourceID: studyTags.ID, ResourceType: 'study', orthancId: yourOrthancId};
            let adDicomTransferLog = await db.dicomtransferlogs.create(newDicomLog);
          } else {
            let logId = dicomlogRes[0].id;
            let updateDicomLog = {StudyTags: studyTags, ResourceID: studyTags.ID, ResourceType: 'study', orthancId: yourOrthancId};
            let upDicomTransferLog = await db.dicomtransferlogs.update(updateDicomLog, { where: { id: logId } });
          }
        });
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

//update API
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const targetCaseId = req.body.id;
        const updateData = req.body.data;
        const urgenttypeId = req.body.urgenttypeId;
        const caseInclude = [{model: db.hospitals, attributes: ['Hos_Name']}, {model: db.patients, attributes: ['Patient_HN', 'Patient_NameEN', 'Patient_LastNameEN']}];
        const targetCases = await Case.findAll({include: caseInclude, where: {id: targetCaseId}});
        const targetCase = targetCases[0];
        let nowCaseStatus = targetCase.casestatusId;
        let oldHR = targetCase.Case_PatientHRLink;
        let newHR = updateData.Case_PatientHRLink;
        let canUpdate = ((uti.contains.call(common.casestatusCanUpdate, nowCaseStatus)));
        if (canUpdate) {
          let nowRadioId = targetCase.Case_RadiologistId;
          let newTaskOption = undefined;
          if (nowCaseStatus == 1) {
            if (nowRadioId == updateData.Case_RadiologistId) {
              // normal update
              newTaskOption = false;
              await Case.update(updateData, { where: { id: targetCaseId } });
              //await statusControl.onHospitalUpdateCaseEvent(targetCaseId, newTaskOption);
              res.json({Result: "OK", status: {code: 200}});
            } else {
              // un-normal update
              newTaskOption = true;
              updateData.urgenttypeId = urgenttypeId;
              let refreshCancel = {type: 'refresh', statusId: 7, caseId: targetCase.id, thing: 'case'};
              let notifyMsgFmt = 'โรงพยาบาล: %s ขอแจ้งยกเลิกเคส ชื่อ: %s HN: %s';
              let notifyMsg = uti.fmtStr(notifyMsgFmt, targetCase.hospital.Hos_Name, (targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN), targetCase.patient.Patient_HN);
              let radioProfile = await common.doLoadRadioProfile(nowRadioId);
              let radioNotify = {type: 'notify', message: notifyMsg};
              await socket.sendMessage(refreshCancel, radioProfile.username);
              await socket.sendMessage(radioNotify, radioProfile.username);
              if ((radioProfile.linenotify == 1) && (radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
                let lineNotifyMsg = notifyMsg;
                let menuQuickReply = lineApi.createBotMenu(lineNotifyMsg, 'quick', lineApi.radioMainMenu);
                await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
              }
              await Case.update(updateData, { where: { id: targetCaseId } });
              //await statusControl.onHospitalUpdateCaseEvent(targetCaseId, newTaskOption);
              res.json({Result: "OK", status: {code: 200}});
            }
          } else if (nowCaseStatus == 2) {
            if (nowRadioId == updateData.Case_RadiologistId) {
              // normal update
              newTaskOption = false;
              await Case.update(updateData, { where: { id: targetCaseId } });
              //await statusControl.onHospitalUpdateCaseEvent(targetCaseId, newTaskOption);
              res.json({Result: "OK", status: {code: 200}});
            } else {
              // un-normal update
              newTaskOption = true;
              updateData.urgenttypeId = urgenttypeId;
              let refreshCancel = {type: 'refresh', statusId: 7, caseId: targetCase.id, thing: 'case'};
              let notifyMsgFmt = 'โรงพยาบาล: %s ขอแจ้งยกเลิกเคส ชื่อ: %s HN: %s';
              let notifyMsg = uti.fmtStr(notifyMsgFmt, targetCase.hospital.Hos_Name, (targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN), targetCase.patient.Patient_HN);
              let radioProfile = await common.doLoadRadioProfile(nowRadioId);
              let radioNotify = {type: 'notify', message: notifyMsg};
              await socket.sendMessage(refreshCancel, radioProfile.username);
              await socket.sendMessage(radioNotify, radioProfile.username);
              if ((radioProfile.linenotify == 1) && (radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
                let lineNotifyMsg = notifyMsg;
                let menuQuickReply = lineApi.createBotMenu(lineNotifyMsg, 'quick', lineApi.radioMainMenu);
                await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
              }
              updateData.casestatusId = 1;
              await Case.update(updateData, { where: { id: targetCaseId } });

              //await statusControl.onHospitalUpdateCaseEvent(targetCaseId, newTaskOption);
              res.json({Result: "OK", status: {code: 200}});
            }
          } else if ((nowCaseStatus == 4) || (nowCaseStatus == 7)) {
            // reset caase
            newTaskOption = true;
            updateData.urgenttypeId = urgenttypeId;
            updateData.casestatusId = 1;
            await Case.update(updateData, { where: { id: targetCaseId } });

            await db.caseresponses.destroy({ where: { caseId: targetCaseId } }); //<-- กรณีหมอคนก่อนแ่านผลค้างจนหมดเวลา เคสอยู่ในสถานะ draft

            //await statusControl.onHospitalUpdateCaseEvent(targetCaseId, newTaskOption);
            res.json({Result: "OK", status: {code: 200}});
          } else {
            // normal update
            newTaskOption = false;
            await Case.update(updateData, { where: { id: targetCaseId } });
            //await statusControl.onHospitalUpdateCaseEvent(targetCaseId, newTaskOption);
            res.json({Result: "OK", status: {code: 200}});
          }

          /*
          let patients = await db.patients.findAll({attributes: ['Patient_NameEN', 'Patient_LastNameEN'], where: {id: targetCase.patientId}});
          let patientNameEN = patients[0].Patient_NameEN;
          let patientLastNameEN = patients[0].Patient_LastNameEN;
          let out = await common.doConvertPatientHistoryImage2Dicom(targetCase.Case_OrthancStudyID, targetCase.hospitalId, req.hostname, newHR, targetCase.Case_Modality, patientNameEN, patientLastNameEN, oldHR);
          log.info('out=> ' + JSON.stringify(out));
          let reviseHR = {Case_PatientHRLink: out.newHRprop};
          await Case.update(reviseHR, { where: { id: targetCase.id } });
          let notifyMsg = 'Your request update case can replace advance dicom zip file success.'
          let ownerNotify = {type: 'notify', message: notifyMsg};
          await socket.sendMessage(ownerNotify, ur[0].username);
          */
        } else {
          res.json({status: {code: 202}, info: 'The current case status out of bound to update.'});
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

//delete API
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        /* casestatusId = 7 จึงจะลบได้ */
        /* เมือ่ลบแล้วให้ค้นหา task และลบ task ด้วย */
        /* ถ้า urgent เป็นแบบ custom ให้ลบ urgent ด้วย */
        let targetCaseId = req.body.id;
        log.info('delete id=>' + targetCaseId);
        const deleteCases = await Case.findAll({attributes: ['casestatusId', 'Case_DicomZipFilename'], include: {model: db.urgenttypes, attributes: ['id', 'UGType']}, where: {id: targetCaseId}});
        log.info('deleteCases=>' + JSON.stringify(deleteCases));
        if (deleteCases.length > 0){
          if ((deleteCases[0].casestatusId == 7)) {
            await db.radkeeplogs.destroy({ where: { id:  targetCaseId} });
            await Case.destroy({ where: { id:  targetCaseId} });
            if (deleteCases[0].urgenttype.UGType === 'custom') {
              db.urgenttypes.destroy({ where: { id:  deleteCases[0].urgenttype.id} });
            }
            tasks.removeTaskByCaseId(targetCaseId);
            let refreshDeleteCase = {type: 'refresh', statusId: deleteCases[0].casestatusId, caseId: targetCaseId};
            await socket.sendMessage(refreshDeleteCase , ur[0].username);

            let publicDir = path.normalize(__dirname + '/../../..');
            let usrArchiveDir = publicDir + process.env.USRARCHIVE_DIR;

            let existPath = usrArchiveDir + '/' + deleteCases[0].Case_DicomZipFilename;
            let isExist = fs.existsSync(existPath);
            if (isExist) {
              let command = uti.fmtStr('rm %s', existPath);
              await uti.runcommand(command);
            }
            res.json({Result: "OK", status: {code: 200}});
          } else {
            res.json({Result: "Not OK", status: {code: 201}, notice: 'The case is not on status condition for delete.'});
          }
        } else {
          res.json({Result: "Not Found Case", status: {code: 201}, notice: 'The case is not found on DB.'});
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

app.get('/options/(:hospitalId)', (req, res) => {
  const hospitalId = req.params.hospitalId;
  common.doGenNewCaseOptions(hospitalId).then((result) => {
    res.json(result);
  })
});

app.get('/description/(:caseId)', (req, res) => {
  const caseId = req.params.caseId;
  common.doGetCaseDescription(caseId).then((result) => {
    res.json(result);
  });
});

app.post('/radio/socket/(:radioId)', async (req, res) => {
  const radioId = req.params.radioId;
  const radUser = await db.users.findAll({ attributes: ['username'], where: {id: radioId}});
  const radioUsername = radUser[0].username;
  const radioSockets = await socket.filterUserSocket(radioUsername);
  res.json(radioSockets);
});

//Call Bill Content API
app.post('/bill/hospital/content', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let hospitalId = req.body.hospitalId;
        let userId = req.body.userId;
        let key = req.body.key;
        /* format of key
        {fromDateKeyValue: 2021-04-01 00:00:00, toDateKeyValue: 2021-04-30 23:59:59}
        */
        let summaryCases = await common.doSummaryBillReport(hospitalId, key);
        res.json({status: {code: 200}, Contents: summaryCases, key: key});
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

//Search closed case API
app.post('/search/key', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let hospitalId = req.body.hospitalId;
        let userId = req.body.userId;
        let usertypeId = req.body.usertypeId;

        let casewhereClous = undefined;
        let patientwhereClous = undefined;
        if ((usertypeId == 2) || (usertypeId == 5)) {
          casewhereClous = {hospitalId: { [db.Op.eq]: hospitalId}/*, userId: { [db.Op.eq]: userId}*/ };
          patientwhereClous = {hospitalId: { [db.Op.eq]: hospitalId}};
        } else if (usertypeId == 4) {
          casewhereClous = { Case_RadiologistId: { [db.Op.eq]: userId}};
          patientwhereClous = {};
        }

        let key = req.body.key;
        if (((key.fromDateKeyValue) && (key.fromDateKeyValue !== '')) && ((key.toDateKeyValue) && (key.toDateKeyValue !== ''))) {
          let fromDateWithZ = new Date(key.fromDateKeyValue);
          let toDateWithZ = new Date(key.toDateKeyValue);
          toDateWithZ.setDate(toDateWithZ.getDate() + 1);
          casewhereClous.createdAt = { [db.Op.between]: [new Date(fromDateWithZ), new Date(toDateWithZ)]};
        } else {
          if ((key.fromDateKeyValue) && (key.fromDateKeyValue !== '')) {
            let fromDateWithZ = new Date(key.fromDateKeyValue);
            casewhereClous.createdAt = { [db.Op.gte]: new Date(fromDateWithZ)};
          }
          if ((key.toDateKeyValue) && (key.toDateKeyValue !== '')) {
            let toDateWithZ = new Date(key.toDateKeyValue);
            toDateWithZ.setDate(toDateWithZ.getDate() + 1);
            casewhereClous.createdAt = { [db.Op.gte]: new Date(toDateWithZ)};
          }
        }
        if ((key.bodypartKeyValue !== '') && (key.bodypartKeyValue !== '*')) {
          casewhereClous.Case_BodyPart = { [db.Op.iLike]: '%' + uti.trimAsteriskKey(key.bodypartKeyValue) + '%' };
          //casewhereClous.Case_StudyDescription = { [db.Op.iLike]: '%' + key.bodypartKeyValue + '%' };
          //casewhereClous.Case_ProtocolName = { [db.Op.iLike]: '%' + key.bodypartKeyValue + '%' };
        }
        if (key.caseStatusKeyValue > 0) {
          casewhereClous.casestatusId = { [db.Op.eq]: key.caseStatusKeyValue};
        }
        log.info('key.patientNameENKeyValue=>' + key.patientNameENKeyValue)
        if ((key.patientNameENKeyValue !== '') && (key.patientNameENKeyValue !== '*')) {
          patientwhereClous.Patient_NameEN = { [db.Op.iLike]: '%' + uti.trimAsteriskKey(key.patientNameENKeyValue) + '%' };
        }
        if ((key.patientHNKeyValue !== '') && (key.patientHNKeyValue !== '*')) {
          patientwhereClous.Patient_HN = { [db.Op.iLike]: '%' + uti.trimAsteriskKey(key.patientHNKeyValue) + '%' };
        }

        let patients = undefined;
        if ((patientwhereClous.hasOwnProperty('Patient_NameEN')) || (patientwhereClous.hasOwnProperty('Patient_HN'))) {
          patients = await db.patients.findAll({attributes: ['id'], where: patientwhereClous });
          log.info('patients.length=>' + patients.length)
          if ((patients) && (patients.length > 0)) {
            let patientIds = [];
            await patients.forEach((item, i) => {
              patientIds.push(item.id);
            });
            casewhereClous.patientId = {[db.Op.in]: patientIds};
          } else {
            casewhereClous.patientId = {[db.Op.in]: [-1]};
          }
        }

        const caseInclude = [{model: db.hospitals, attributes: ['id', 'Hos_Name']}, {model: db.patients, attributes: excludeColumn}, {model: db.casestatuses, attributes: ['id', 'CS_Name_EN']}, {model: db.urgenttypes, attributes: ['id', 'UGType', 'UGType_Name']}];
        const orderby = [['id', 'DESC']];
        const cases = await Case.findAll({include: caseInclude, where: [casewhereClous], order: orderby});

        const casesFormat = [];
        const promiseList = new Promise(async function(resolve, reject) {
          for (let i=0; i<cases.length; i++) {
            let item = cases[i];
            const radUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RadiologistId}});
            const rades = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: radUser[0].userinfoId}});
            const Radiologist = {id: item.Case_RadiologistId, User_NameTH: rades[0].User_NameTH, User_LastNameTH: rades[0].User_LastNameTH};
            /*
            const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
            const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
            const Refferal = {id: item.Case_RefferalId, User_NameTH: refes[0].User_NameTH, User_LastNameTH: refes[0].User_LastNameTH};
            */
            let next = await common.doCanNextStatus(item.casestatusId);
            casesFormat.push({case: item, Radiologist: Radiologist, /* Refferal: Refferal*/ next: next});
          }
          setTimeout(()=> {
            resolve(casesFormat);
          },500);
        });
        Promise.all([promiseList]).then((ob)=> {
          res.json({status: {code: 200}, Records: ob[0], key: key});
        }).catch((err)=>{
          log.error('Sear Key Error=>' + JSON.stringify(err));
          res.json({status: {code: 500}, error: JSON.stringify(err)});
          reject(err);
        });
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

//Radio Load case by status API
app.post('/load/list/by/status/radio', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const casestatusIds = req.body.casestatusIds;
        const radioId = req.body.userId;
        let allStatus = [];
        let promiseList = new Promise(async function(resolve, reject) {
          for (let i=0; i < casestatusIds.length; i++){
            let statusIdItem = casestatusIds[i];
            let youCcases = await Case.findAll({attributes: ['id', 'Case_OrthancStudyID'], where: {Case_RadiologistId: radioId, casestatusId: { [db.Op.in]: statusIdItem }}});
            allStatus.push({Records: youCcases});
          }
          setTimeout(()=> {
            resolve(allStatus);
          },500);
        });
        Promise.all([promiseList]).then((ob)=> {
          res.json({status: {code: 200}, Records: ob[0]});
        }).catch((err)=>{
          log.error('Load Status Owner Error=>' + JSON.stringify(err));
          res.json({status: {code: 500}, error: JSON.stringify(err)});
          reject(err);
        });
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

//Owner Load case by status API
app.post('/load/list/by/status/owner', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const casestatusIds = req.body.casestatusIds;
        const userId = req.body.userId;
        const hospitalId = req.body.hospitalId;
        //casestatusIds=>[["1"],["2","8","9"],["5","10","11","12","13","14"],["3","4","7"]]
        let allStatus = [];
        let promiseList = new Promise(async function(resolve, reject) {
          for (let i=0; i < casestatusIds.length; i++){
            let statusIdItem = casestatusIds[i];
            let youCcases = await Case.findAll({attributes: ['id'], where: {/*userId: userId,*/ hospitalId: hospitalId, casestatusId: { [db.Op.in]: statusIdItem }}});
            allStatus.push({Records: youCcases});
          }
          setTimeout(()=> {
            resolve(allStatus);
          },500);
        });
        Promise.all([promiseList]).then((ob)=> {
          res.json({status: {code: 200}, Records: ob[0]});
        }).catch((err)=>{
          log.error('Load Status Owner Error=>' + JSON.stringify(err));
          res.json({status: {code: 500}, error: JSON.stringify(err)});
          reject(err);
        });
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

//API for Reffer Calling Case Info
app.get('/status/by/dicom/(:dicomId)', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const dicomId = req.params.dicomId;
        const caseInclude = [{model: db.casestatuses, attributes: ['CS_Name_EN']}];
        const youCcases = await Case.findAll({attributes:['id', 'casestatusId', 'urgenttypeId', 'createdAt', 'Case_StudyInstanceUID'], include: caseInclude,  where: {Case_OrthancStudyID: dicomId}, order: [['id', 'DESC']], limit: 1});
        if (youCcases.length > 0){
          let dicomCase = {id: youCcases[0].id, casestatusId: youCcases[0].casestatusId, urgenttypeId: youCcases[0].urgenttypeId, createdAt: youCcases[0].createdAt, casestatus: youCcases[0].casestatus};
          let hadOnProcess = uti.contains.call([1, 2, 8, 9], dicomCase.casestatusId);
          if (hadOnProcess) {
            const yourUrgents = await db.urgenttypes.findAll({attributes:['UGType_AcceptStep', 'UGType_WorkingStep'], where: {id: youCcases[0].urgenttypeId}});
            dicomCase.urgent = yourUrgents[0];
          }
          res.json({status: {code: 200}, Records: [dicomCase]});
        } else {
          res.json({status: {code: 200}, Records: []});
        }
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

//API for Reffer Calling Case' Result
app.post('/result/(:caseId)', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const caseId = req.params.caseId;
        const youReports = await db.casereports.findAll({attributes:['id', 'Report_Type', 'PDF_Filename'],  where: {caseId: caseId}, order: [['id', 'DESC']]});
        res.json({status: {code: 200}, Records: youReports});
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

//get cando list API
app.get('/cando/list', async (req, res) => {
  res.json({status: {code: 200}, list: common.casestatusFlowTable});
});

//check cando API
app.get('/cando/(:from)', async (req, res) => {
  let from = req.params.from;
  let next = await common.doCanNextStatus(from);
  res.json({status: {code: 200}, next: next});
});

//call Line User Info from LINE API
app.get('/line/userinfo/(:luneUserId)', async (req, res) => {
  let lineUserId = req.params.luneUserId;
  let info = await common.doCallLineUserInfo(lineUserId);
  res.json({status: {code: 200}, info: info});
});

app.get('/list/(:hospitalId)', async (req, res) => {
  const hospitalId = req.params.hospitalId;
  const qlimit = req.query.limit;
  //log.info('qlimit=>' + qlimit);
  let limit = 20;
  if ((qlimit) && (qlimit > 0)){
    limit = qlimit;
  }
  const startAt = 0;
  const orderby = [['id', 'DESC']];
  const caseInclude = [{model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN', 'Patient_HN']}];
  const cases = await Case.findAll({include: caseInclude, offset: startAt, limit: limit, where: {hospitalId: hospitalId}, order: orderby});
  res.json({Result: "OK", Records: cases, TotalRecordCount: cases.length});
});

app.post('/rezip', async (req, res) => {
  let hospitalId = req.body.hospitalId;
  let studyID = req.body.studyID;
  let dicomZipFilename = req.body.dicomZipFilename;
  let userId = req.body.userId;
  let ownerUsers = await db.users.findAll({ attributes: ['username'], where: {id: userId}});
  let ownerUsername = ownerUsers[0].username;
  log.info('ownerUsername=>' + ownerUsername);
  let ownerSockets = await socket.filterUserSocket(ownerUsername);
  if ((ownerSockets) && (ownerSockets.length > 0)) {
    let dataMessage = {type: 'rezip', studyID: studyID, dicomZipFilename: dicomZipFilename};
    await ownerSockets[0].send(JSON.stringify(dataMessage));
    res.json({Result: "OK"});
  } else {
    res.json({Result: "NOT OK"});
  }
});

app.get('/reset/refer/(:caseId)/(:referId)', async (req, res) => {
  const caseId = req.params.caseId;
  const referId = req.params.referId;
  await Case.update({Case_RefferalId: referId}, { where: { id: caseId } });
  res.json({status: {code: 200}, result: 'Success.'});
});

app.post('/reset/dicom/zipfilename', async (req, res) => {
  const studyID = req.body.StudyID;
  const archiveFileName = req.body.ArchiveFileName;
  const zipPath = '/img/usr/zip';
  const zipDir = path.normalize(__dirname + '../../../public' + zipPath);
  let archiveFilePath = zipDir + '/' + archiveFileName
  await db.cases.update({Case_DicomZipFilename: archiveFileName}, {where: {Case_OrthancStudyID: studyID}});
  let rmDateTime = uti.removeArchiveScheduleTask(archiveFilePath);
  res.json({status: {code: 200}, result: {zip: archiveFilePath, rm: rmDateTime}});
});

app.post('/newcase/trigger', async (req, res) => {
  let studyID = req.body.studyID;
  let casesRes = await db.cases.findAll({attributes: ['id'], where: {Case_OrthancStudyID: studyID}, order: [['id', 'DESC']], limit: 1});
  if (casesRes.length > 0) {
    let caseId = casesRes[0].id;
    let actionAfterChange = await statusControl.onNewCaseEvent(caseId);
    res.json({status: {code: 200}, result: actionAfterChange});
  } else {
    res.json({status: {code: 200}, result: 'Not Found Case'});
  }
});

app.post('/updatecase/trigger', async (req, res) => {
  let caseId = req.body.caseId;
  let newTaskOption = req.body.newTaskOption;
  let actionAfterChange = await statusControl.onHospitalUpdateCaseEvent(caseId, newTaskOption);
  res.json({status: {code: 200}, result: actionAfterChange});
});

module.exports = ( dbconn, caseTask, warningTask, voipTask, monitor, websocket ) => {
  db = dbconn;
  tasks = caseTask;
  warnings = warningTask;
  voips = voipTask;
  log = monitor;
  socket = websocket;
  auth = require('./auth.js')(db, log);
  lineApi = require('../../lib/mod/lineapi.js')(db, log);
  uti = require('../../lib/mod/util.js')(db, log);
  common = require('./commonlib.js')(db, log);
  statusControl = require('./statuslib.js')(db, log, tasks, warnings, voips, socket);
  Case = db.cases;
  return app;
}
