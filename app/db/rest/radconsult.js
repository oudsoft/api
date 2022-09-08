/*radconsult.js*/
const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(bodyParser.json({ limit: "50MB", type:'application/json', extended: true}));
app.use(bodyParser.urlencoded({limit: '50MB', type:'application/x-www-form-urlencoded', extended: true}));

var db, log, websocket, auth, uti, common, whomtask, lineApi;

const excludeColumn = { exclude: ['updatedAt'] };

const doCreateTaskAction = function(consultId, userProfile, radioProfile, triggerParam, baseConsultStatusId, lineConsultDetaileMsg, consultMsgData){
  return new Promise(async function(resolve, reject) {
    const action = 'quick';
    log.info('The Task of consultId ' + consultId + ' will be clear and will be replace with new task.');
    await whomtask.removeTaskByConsultId(consultId);

    let newTask = await whomtask.doCreateNewTaskConsult(consultId, userProfile.username, triggerParam, radioProfile.username, userProfile.hospitalName, baseConsultStatusId, async (consultId, socket, endDateTime)=>{
      let nowconsultStatus = await db.radconsults.findAll({ attributes: ['casestatusId'], where: {id: consultId}});
      if (nowconsultStatus[0].casestatusId === baseConsultStatusId) {
        await common.doConsultExpireAction(whomtask, websocket, consultId, websocket, baseConsultStatusId, radioProfile, userProfile, lineConsultDetaileMsg, userProfile.hospitalName);
      } else {
        await whomtask.removeTaskByConsultId(consultId);
      }
    });
    let endTime = newTask.triggerAt;
    /*
    let fmtEndDate = uti.doFormateDateTime(endTime);
    let endDateText = uti.fmtStr('%s-%s-%s %s:%s น. ', fmtEndDate.YY, fmtEndDate.MM, fmtEndDate.DD, fmtEndDate.HH, fmtEndDate.MN);
    let fmtEndDate = uti.doFormateDateTimeChatbot(triggerAt);
    */
    let fmtCrateDate = uti.doFormateDateTimeChatbot(consultMsgData.createAt);
    let fmtEndDate = uti.doFormateDateTimeChatbot(endTime);
    // Chatbot message to Radio
    if ((radioProfile.linenotify == 1) && (radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
      let fmtNowDate = uti.doFormateDateTime();
      if (baseConsultStatusId == 1 ) {
        let dataOnConsultBot = {
          headerTitle: 'แจ้ง Consult ใหม่',
          caseDatetime: fmtEndDate,
          hospitalName: consultMsgData.hospitalName,
          urgentName: 'กำหนดตอบรับ',
          expireDatetime: fmtEndDate,
          patientName: consultMsgData.patientName
        };
        let acceptActionMenu =  [{id: 'x601', name: 'รับ', data: consultId}, {id: 'x602', name: 'ไม่รับ', data: consultId}];
        let bubbleMenu = lineApi.doCreateCaseAccBubbleReply(dataOnConsultBot, acceptActionMenu);
        await lineApi.pushConnect(radioProfile.lineUserId, bubbleMenu);
      }
    }
    resolve(endTime);
  });
}

const onCloseConsultStatus = function(consultId){
  return new Promise(async function(resolve, reject) {
    const consultInclude = [{model: db.hospitals, attributes: ['Hos_Name']}];
    const targetConsults = await db.radconsults.findAll({include: consultInclude, where: {id: consultId}});
    const newConsult = targetConsults[0];
    const userId = newConsult.userId;
    const hospitalId = newConsult.hospitalId;
    const radioId = newConsult.RadiologistId;
    const hospitalName = newConsult.hospital.Hos_Name;
    const patientName = newConsult.PatientName;
    const patientHN = newConsult.PatientHN;
    const consultMsgData = {hospitalName, patientName, patientHN};

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    // Notify to Case Owner Feedback
    let refreshNewConsult = {type: 'refresh', statusId: newConsult.casestatusId, caseId: newConsult.id, thing: 'consult'};
    let userNotify = {type: 'notify', message: 'You Consult was close by your Account.'};
    await websocket.sendMessage(refreshNewConsult, userProfile.username);
    await websocket.sendMessage(userNotify, userProfile.username);

    // Notify to Case Radiologist
    let radioNotify = {type: 'notify', message: 'the consult ' + patientHN + ' from ' + hospitalName + ' was closed.'};
    await websocket.sendMessage(refreshNewConsult, radioProfile.username);
    await websocket.sendMessage(radioNotify, radioProfile.username);
    resolve()
  });
}

const onRejectConsultStatus = function(consultId){
  return new Promise(async function(resolve, reject) {
    const consultInclude = [{model: db.hospitals, attributes: ['Hos_Name']}];
    const targetConsults = await db.radconsults.findAll({include: consultInclude, where: {id: consultId}});
    const newConsult = targetConsults[0];
    const userId = newConsult.userId;
    const hospitalId = newConsult.hospitalId;
    const radioId = newConsult.RadiologistId;
    const hospitalName = newConsult.hospital.Hos_Name;
    const patientName = newConsult.PatientName;
    const patientHN = newConsult.PatientHN;
    const consultMsgData = {hospitalName, patientName, patientHN};

        //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    // Notify to Case Owner Feedback
    let refreshNewConsult = {type: 'refresh', statusId: newConsult.casestatusId, caseId: newConsult.id, thing: 'consult'};
    let userNotify = {type: 'notify', message: 'You new Consult was reject by your Radiologist.'};
    await websocket.sendMessage(refreshNewConsult, userProfile.username);
    await websocket.sendMessage(userNotify, userProfile.username);

    // Notify to Case Radiologist
    let radioNotify = {type: 'notify', message: 'Reject new consult success.'};
    await websocket.sendMessage(refreshNewConsult, radioProfile.username);
    await websocket.sendMessage(radioNotify, radioProfile.username);

    if ((radioProfile.linenotify == 1) && (radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
      const msgNewConsultRadioDetailFormat = 'Consult่\nจากโรงพยาบาล %s\nผู้ป่วยชื่อ %s\nHN %s';
      let lineMsg = uti.fmtStr(msgNewConsultRadioDetailFormat, consultMsgData.hospitalName, consultMsgData.patientName, consultMsgData.patientHN);
      let lineConsultMsg = lineMsg + '\nได้ถูกปฎิเสธแล้ว\n\nหากคุณต้องการใช้บริการอื่นๆ เชิญเลือกจากเมนูด้านล่างครับ'
      let menuQuickReply = lineApi.createBotMenu(lineConsultMsg, 'quick', lineApi.radioMainMenu);
      await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
    }
    if ((userProfile.lineUserId) && (userProfile.lineUserId !== '')) {
      const msgNewConsultRadioDetailFormat = 'Consult่ ใหม่\nผู้ป่วยชื่อ %s\nHN %s';
      let lineMsg = uti.fmtStr(msgNewConsultRadioDetailFormat, consultMsgData.patientName, consultMsgData.patientHN);
      let lineConsultMsg = lineMsg + '\nได้ถูกรังสีแพทย์ปฏิเสธแล้ว\n\nหากคุณต้องการใช้บริการอื่นๆ เชิญเลือกจากเมนูด้านล่างครับ'
      menuQuickReply = lineApi.createBotMenu(lineConsultMsg, 'quick', lineApi.techMainMenu);
      await lineApi.pushConnect(userProfile.lineUserId, menuQuickReply);
    }
    resolve()
  });
}

const onAcceptConsultStatus = function(consultId){
  return new Promise(async function(resolve, reject) {
    const consultInclude = [{model: db.hospitals, attributes: ['Hos_Name']}];
    const targetConsults = await db.radconsults.findAll({include: consultInclude, where: {id: consultId}});
    const newConsult = targetConsults[0];
    const userId = newConsult.userId;
    const hospitalId = newConsult.hospitalId;
    const radioId = newConsult.RadiologistId;
    const hospitalName = newConsult.hospital.Hos_Name;
    const patientName = newConsult.PatientName;
    const patientHN = newConsult.PatientHN;
    const consultMsgData = {hospitalName, patientName, patientHN};

        //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    // Notify to Case Owner Feedback
    let refreshNewConsult = {type: 'refresh', statusId: newConsult.casestatusId, caseId: newConsult.id, thing: 'consult'};
    let userNotify = {type: 'notify', message: 'You new Consult was accept by your Radiologist.'};
    await websocket.sendMessage(refreshNewConsult, userProfile.username);
    await websocket.sendMessage(userNotify, userProfile.username);

    // Notify to Case Radiologist
    let radioNotify = {type: 'notify', message: 'Accept new consult success.'};
    await websocket.sendMessage(refreshNewConsult, radioProfile.username);
    await websocket.sendMessage(radioNotify, radioProfile.username);

    if ((radioProfile.linenotify == 1) && (radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
      const msgNewConsultRadioDetailFormat = 'Consult่\nจากโรงพยาบาล %s\nผู้ป่วยชื่อ %s\nHN %s';
      let lineMsg = uti.fmtStr(msgNewConsultRadioDetailFormat, consultMsgData.hospitalName, consultMsgData.patientName, consultMsgData.patientHN);
      let lineConsultMsg = lineMsg + '\nได้ถูกตอบรับแล้ว\n\nหากคุณต้องการใช้บริการอื่นๆ เชิญเลือกจากเมนูด้านล่างครับ'
      let menuQuickReply = lineApi.createBotMenu(lineConsultMsg, 'quick', lineApi.radioMainMenu);
      await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
    }
    if ((userProfile.lineUserId) && (userProfile.lineUserId !== '')) {
      const msgNewConsultRadioDetailFormat = 'Consult่ ใหม่\nผู้ป่วยชื่อ %s\nHN %s';
      let lineMsg = uti.fmtStr(msgNewConsultRadioDetailFormat, consultMsgData.patientName, consultMsgData.patientHN);
      let lineConsultMsg = lineMsg + '\nได้ถูกรังสีแพทย์ตอบรับแล้ว\n\nหากคุณต้องการใช้บริการอื่นๆ เชิญเลือกจากเมนูด้านล่างครับ'
      menuQuickReply = lineApi.createBotMenu(lineConsultMsg, 'quick', lineApi.techMainMenu);
      await lineApi.pushConnect(userProfile.lineUserId, menuQuickReply);
    }
    resolve()
  });
}

const onNewConsultEvent = function(consultId){
  return new Promise(async function(resolve, reject) {
    const consultInclude = [{model: db.hospitals, attributes: ['Hos_Name']}];
    const targetConsults = await db.radconsults.findAll({include: consultInclude, where: {id: consultId}});
    const newConsult = targetConsults[0];
    const userId = newConsult.userId;
    const hospitalId = newConsult.hospitalId;
    const radioId = newConsult.RadiologistId;
    const hospitalName = newConsult.hospital.Hos_Name;
    const patientName = newConsult.PatientName;
    const patientHN = newConsult.PatientHN;
    const createAt = newConsult.createdAt;
    const consultMsgData = {hospitalName, patientName, patientHN, createAt};

    const msgNewConsultRadioDetailFormat = 'Consult่\nจากโรงพยาบาล %s\nผู้ป่วยชื่อ %s\nHN %s';

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    // Notify to Case Owner Feedback
    let refreshNewConsult = {type: 'refresh', statusId: newConsult.casestatusId, caseId: newConsult.id, thing: 'consult'};
    //let userNotify = {type: 'notify', message: 'You Create new Consult success.'};
    await websocket.sendMessage(refreshNewConsult, userProfile.username);
    //await websocket.sendMessage(userNotify, userProfile.username);

    let lineConsultDetaileMsg = uti.fmtStr(msgNewConsultRadioDetailFormat, hospitalName, patientName, patientHN);

    // Notify to Case Radiologist
    let radioNotify = {type: 'notify', message: lineConsultDetaileMsg};
    await websocket.sendMessage(refreshNewConsult, radioProfile.username);
    await websocket.sendMessage(radioNotify, radioProfile.username);

    //Load Urgent Profile
    let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_AcceptStep'], where: {id: newConsult.UGType}});

    let triggerParam = JSON.parse(urgents[0].UGType_AcceptStep);
    let endTime = await doCreateTaskAction(consultId, userProfile, radioProfile, triggerParam, newConsult.casestatusId, lineConsultDetaileMsg, consultMsgData);
    log.info('endTime=>' + endTime);
    resolve(endTime);
  });
}

const isAlive = function(createAt, triggerAt){
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

app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let hospitalId = req.body.hospitalId;
          let casestatusId = 1;
          let userId = req.body.userId;
          let newConsult = req.body.data;
          let adConsult = await db.radconsults.create(newConsult);
          await db.radconsults.update({hospitalId: hospitalId, casestatusId: casestatusId, userId: userId}, {where: {id: adConsult.id}});
          let radioProfile = await common.doLoadRadioProfile(newConsult.RadiologistId);
          let newConsultSetup = {
            topicId: adConsult.id,
      			patientHN: adConsult.PatientHN,
            patientName: adConsult.PatientName,
      			topicStatusId: casestatusId,
      			audienceId: radioProfile.username,
      			audienceName: radioProfile.User_NameTH + ' ' + radioProfile.User_LastNameTH,
            audienceUserId: newConsult.RadiologistId
          };
          let theTask = await onNewConsultEvent(adConsult.id);
          res.json({status: {code: 200}, Setup: newConsultSetup});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
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

app.post('/load/list/by/status/radio', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const casestatusIds = req.body.casestatusIds;
          const radioId = req.body.userId;
          const youConsults = await db.radconsults.findAll({attributes: ['id'], where: {RadiologistId: radioId, casestatusId: { [db.Op.in]: casestatusIds }}});
          res.json({status: {code: 200}, Records: youConsults});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
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

app.post('/load/list/by/status/owner', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const casestatusIds = req.body.casestatusIds;
          const userId = req.body.userId;
          const youConsults = await db.radconsults.findAll({attributes: ['id'], where: {/*userId: userId,*/ casestatusId: { [db.Op.in]: casestatusIds }}});
          res.json({status: {code: 200}, Records: youConsults});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
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

app.post('/filter/radio', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const statusId = req.body.statusId;
          const radioId = req.body.userId;
          const consultInclude = [{model: db.hospitals, attributes: ['Hos_Name']}];
          const youConsults = await db.radconsults.findAll({ include: consultInclude, where: {RadiologistId: radioId, casestatusId: { [db.Op.in]: statusId }}, order: [['id', 'DESC']]});
          res.json({status: {code: 200}, Records: youConsults});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
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

app.post('/filter/user', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const statusId = req.body.statusId;
          const userId = req.body.userId;
          const youConsults = await db.radconsults.findAll({ where: {userId: userId, casestatusId: { [db.Op.in]: statusId }}, order: [['id', 'DESC']]});
          const consultsFormat = [];
          const promiseList = new Promise(async function(resolve, reject) {
            for (let i=0; i<youConsults.length; i++) {
              let radioId = youConsults[i].RadiologistId;
              let yourRadio = await common.doLoadRadioProfile(radioId);
              consultsFormat.push({consult: youConsults[i], radio: yourRadio});
            }
            setTimeout(()=> {
              resolve(consultsFormat);
            },500);
          });
          Promise.all([promiseList]).then((ob)=> {
            res.json({status: {code: 200}, Records: ob[0]});
          }).catch((err)=>{
            log.error(error);
            res.json({status: {code: 500}, error: err});
          });
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
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

app.post('/tasks/select/(:consultId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let consultId = req.params.consultId;
          let consultTask = await whomtask.selectTaskByConsultId(consultId);
          res.json({status: {code: 200}, Tasks: [consultTask]});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
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

app.post('/status/(:consultId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let consultId = req.params.consultId;
          let casestatusId = req.body.casestatusId
          let consultTask = await whomtask.selectTaskByConsultId(consultId);
          /*
          if (consultTask) {
          */
            const targetConsults = await db.radconsults.findAll({ attributes: ['casestatusId'], where: {id: consultId }});
            if (targetConsults[0].casestatusId == 1){
              await db.radconsults.update({casestatusId: casestatusId}, {where: {id: consultId}});
              await whomtask.removeTaskByConsultId(consultId);
              if (casestatusId==2) {
                await onAcceptConsultStatus(consultId);
              } else if (casestatusId==3) {
                await onRejectConsultStatus(consultId);
              } else if (casestatusId==6) {
                await onCloseConsultStatus(consultId);
              }
              res.json({status: {code: 200}, result: 'success'});
            } else if (targetConsults[0].casestatusId == 2){
              if (casestatusId==6) {
                await whomtask.removeTaskByConsultId(consultId);
                await db.radconsults.update({casestatusId: casestatusId}, {where: {id: consultId}});
                await onCloseConsultStatus(consultId);
                res.json({status: {code: 200}, result: 'success'});
              } else {
                res.json({status: {code: 200}, result: 'fail', cause: 'from 2 to ' + casestatusId + ' not allow.'});
              }
            } else {
              await whomtask.removeTaskByConsultId(consultId);
              res.json({status: {code: 200}, result: 'fail', cause: 'consult not ready state'});
            }
            /*
          } else {
            res.json({status: {code: 200}, result: 'fail', cause: 'not found task'});
          }
            */
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
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

//Search closed consult API
app.post('/search/key', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let hospitalId = req.body.hospitalId;
        let userId = req.body.userId;
        let usertypeId = req.body.usertypeId;

        let casewhereClous = undefined;
        if (usertypeId == 2) {
          casewhereClous = {hospitalId: { [db.Op.eq]: hospitalId}, userId: { [db.Op.eq]: userId}};
        } else if (usertypeId == 4) {
          casewhereClous = { RadiologistId: { [db.Op.eq]: userId}};
        }
        let patientwhereClous = {hospitalId: { [db.Op.eq]: hospitalId}};
        let key = req.body.key;

        if ((key.fromDateKeyValue) && (key.toDateKeyValue)) {
          let fromDateWithZ = new Date(key.fromDateKeyValue);
          let toDateWithZ = new Date(key.toDateKeyValue);
          casewhereClous.createdAt = { [db.Op.between]: [new Date(fromDateWithZ), new Date(toDateWithZ)] }
        } else {
          if (key.fromDateKeyValue) {
            let fromDateWithZ = new Date(key.fromDateKeyValue);
            casewhereClous.createdAt = { [db.Op.gte]: new Date(fromDateWithZ)};
          }
          if (key.toDateKeyValue) {
            let toDateWithZ = new Date(key.toDateKeyValue);
            casewhereClous.createdAt = { [db.Op.gte]: new Date(toDateWithZ)};
          }
        }
        if (key.caseStatusKeyValue > 0) {
          casewhereClous.casestatusId = { [db.Op.eq]: key.caseStatusKeyValue};
        }

        if ((key.patientNameENKeyValue !== '') && (key.patientNameENKeyValue !== '*')) {
          casewhereClous.PatientName = { [db.Op.iLike]: '%' + key.patientNameENKeyValue + '%' };
        }
        if ((key.patientHNKeyValue !== '') && (key.patientHNKeyValue !== '*')) {
          casewhereClous.PatientHN = { [db.Op.iLike]: '%' + key.patientHNKeyValue + '%' };
        }

        const consultInclude = [{model: db.hospitals, attributes: ['id', 'Hos_Name']}];
        const orderby = [['id', 'DESC']];
        const consults = await db.radconsults.findAll({include: consultInclude, where: [casewhereClous], order: orderby});

        res.json({status: {code: 200}, Records: consults, key: key});

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

module.exports = ( wsssocket, dbconn, monitor, task ) => {
  db = dbconn;
  log = monitor;
  websocket = wsssocket;
  whomtask = task;
  auth = require('./auth.js')(db, log);
  uti = require('../../lib/mod/util.js')(db, log);
  common = require('./commonlib.js')(db, log);
  lineApi = require('../../lib/mod/lineapi.js')(db, log);
  return app;
}
