const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const request = require('request-promise');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

let sessionHandleStorages = [];
/*
  Object in sessionHandleStorages
  {userId, content: {mode, }}
*/
/*
  x401 + x402 ต้องมี Action ไปที่ Case ด้วย เพื่อ trigger webapp ทาง web socket
*/

var db, Task, Warning, Voip, log, auth, lineApi, uti, socket, statusControl, common;

const doFindSessionHandle = (userId)=>{
  return new Promise(async function(resolve, reject) {
    let session = [];
    session = await sessionHandleStorages.find((handle, index) => {
      if (handle.userId === userId) {
        return handle;
      }
    })
    resolve(session);
  });
}

const removeSessionHandle = (userId)=>{
  return new Promise(async function(resolve, reject) {
    let filterSession = await sessionHandleStorages.filter((handle, index) => {
      if (handle.userId !== userId) {
        return handle;
      }
    });
    sessionHandleStorages = filterSession;
    resolve(sessionHandleStorages);
  });
}

const replyAction = (token, msg) => {
	return new Promise(async function(resolve, reject) {
    try {
      let replyStatus = await lineApi.replyConnect(token, msg);
      resolve(replyStatus);
    } catch(error) {
      log.error('Line replyAcction Error => ' + JSON.stringify(error));
      reject(error);
    }
	});
}

const pushAction = (userId, msg) => {
	return new Promise(async function(resolve, reject) {
    try {
      let replyStatus = await lineApi.pushConnect(userId, msg);
      resolve(replyStatus);
    } catch(error) {
      log.error('Line pushAcction Error => ' + JSON.stringify(error));
      reject(error);
    }
	});
}

const doCreateRadconToken = (userId) => {
  return new Promise(async function(resolve, reject) {
    const userLines = await db.lineusers.findAll({ attributes: ['id', 'userId'], where: {	UserId: userId}});
    const users = await db.users.findAll({ attributes: ['id', 'username'], where: {	id: userLines[0].userId}});
    let yourToken = auth.doEncodeToken(users[0].username);
    resolve({userId: users[0].id, token: yourToken});
  });
}

const postbackMessageHandle = (userId, replyToken, cmds, radUser)=>{
  return new Promise(async function(resolve, reject) {
    /* ob.action.data = "action=" + action + "&itemid=" + item.id + "&data=" + item.id, */
    /* var cmds = userEvent.postback.data.split("&"); */
    var action = (cmds[0].split("="))[1];
  	var cmdCode = (cmds[1].split("="))[1];
  	var data = (cmds[2].split("="))[1];
    switch (action) {
      case 'quick':
        var action;
        var guideMsg;
        var lineMessage;
        var yourToken;
        var rqParams;
        var rqBody;
        var caseRes;
        var caseInclude;
        var actionReturnTextFmt, targetCases, targetCase, hospitalName, patientNameEN;
        var actionReturnText, userHandle;
        var targetProfile, userProfile;
        switch (cmdCode) {
          case 'x001':
            var backToMainMunuMsg = 'เชิญเลือกคำสั่งจากเมนูด้านล่างครับ';
            action = 'quick';
            if (radUser.usertypeId==2){
              await replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.techMainMenu));
            } else if (radUser.usertypeId==4){
              await replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.radioMainMenu));
            } else if (radUser.usertypeId==6){
              await replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.mainMenu));
            } else {
              await replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.mainMenu));
            }
            resolve();
          break;
          case 'x002':
            guideMsg = 'โปรดป้อน username ที่ต้องการลงทะเบียนใช้งานคู่กับ LINE บัญชีนี้ครับ';
            await replyAction(replyToken, guideMsg);
            resolve();
          break;
          case 'x003':
            var backToMainMunuMsg = 'เชิญเลือกคำสั่งจากเมนูด้านล่างครับ';
            action = 'quick';
            if (radUser.usertypeId==2){
              await replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.techMainMenu));
            } else if (radUser.usertypeId==4){
              await replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.radioMainMenu));
            } else if (radUser.usertypeId==6){
              await replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.mainMenu));
            } else {
              await replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.mainMenu));
            }
            resolve();
          break;
          case 'x101':
            action = 'quick';
            let userRegs = await doCheckUserRegistered(userId);
            if (userRegs.length == 0){
              var regiterMunuMsg = 'กรุณาระบุประเภทผู้ใช้งาน';
              await replyAction(replyToken, lineApi.createBotMenu(regiterMunuMsg, action, lineApi.registerMenu));
            } else {
              var regiteredMunuMsg = 'คุณได้ลงทะเบียนใช้งานไปแล้ว\nใช้งานอื่นจากเมนูด้านล่างครับ';
              if (radUser.usertypeId==2){
                await replyAction(replyToken, lineApi.createBotMenu(regiteredMunuMsg, action, lineApi.techMainMenu));
              } else if (radUser.usertypeId==4){
                await replyAction(replyToken, lineApi.createBotMenu(regiteredMunuMsg, action, lineApi.radioMainMenu));
              } else if (radUser.usertypeId==6){
                await replyAction(replyToken, lineApi.createBotMenu(regiteredMunuMsg, action, lineApi.mainMenu));
              } else {
                await replyAction(replyToken, lineApi.createBotMenu(regiteredMunuMsg, action, lineApi.mainMenu));
              }
            }
            resolve();
          break;
          case 'x102':
            action = 'quick';
            targetProfile = await db.userprofiles.findAll({attributes: ['Profile'], where: { userId: radUser.id } });
            if (targetProfile.length > 0){
              userProfile = targetProfile[0];
              let readyState = userProfile.Profile.readyState;
              let toggleSettingMenu = [];
              if (readyState == 0) {
                toggleSettingMenu.push({id: 'x501', name: 'เปิดรับเคส'});
              } else {
                toggleSettingMenu.push({id: 'x502', name: 'ปิดรับเคส'});
              }
              await replyAction(replyToken, lineApi.createBotMenu('ตั้งค่ารับเคสใหม่โดยกดที่เมนูครับ', action, toggleSettingMenu));
            } else {
              await replyAction(replyToken, lineApi.createBotMenu('ระบบฯ ไม่พบข้อมูลการตั้งค่าของคุณ\nโปรดใช้งานอื่นจากเมนูด้านล่างก่อนครับ', action, lineApi.radioMainMenu));
            }
            resolve();
          break;
          case 'x103':
            var otherMunuMsg = 'เชิญเลือกใช้บริการอื่นๆ จากเมนูด้านล่างครับ';
            action = 'quick';
            await replyAction(replyToken, lineApi.createBotMenu(otherMunuMsg, action, lineApi.otherMenu));
            resolve();
          break;
          case 'x201':
            userHandle = {userId: userId, content: {mode: 'key', field: 'username', usertype: 4, type: 'reg'}};
            sessionHandleStorages.push(userHandle);
            guideMsg = 'โปรดป้อน username ของรังสีแพทย์ที่ต้องการลงทะเบียนครับ';
            lineMessage = { type: "text",	text: guideMsg };
            await replyAction(replyToken, lineMessage);
            resolve();
          break;
          case 'x202':
            userHandle = {userId: userId, content: {mode: 'key', field: 'username', usertype: 2, type: 'reg'}};
            sessionHandleStorages.push(userHandle);
            guideMsg = 'โปรดป้อน username ของเจ้าหน้าที่เทคนิคที่ต้องการลงทะเบียนครับ';
            lineMessage = { type: "text",	text: guideMsg };
            await replyAction(replyToken, lineMessage);
            resolve();
          break;
          case 'x203':
            userHandle = {userId: userId, content: {mode: 'key', field: 'username', usertype: 6, type: 'reg'}};
            sessionHandleStorages.push(userHandle);
            guideMsg = 'โปรดป้อน username ของผู้ดูแลระบบที่ต้องการลงทะเบียนครับ';
            lineMessage = { type: "text",	text: guideMsg };
            await replyAction(replyToken, lineMessage);
            resolve();
          break;
          case 'x301':
            /* วิธีใช้งาน */
            var hid = "h00";
    				var helper = require('./mod/userhelp.json');
            var userHelpText = 'คุณสามารถดูวิธีใช้งานได้ที่นี่\n\n'
    				userHelpText += helper[hid];
            userHelpText += '\n\nหากต้องการใช้บริการใดๆ ของผม โปรดเลือกจากเมนูครับ';
            action = 'quick';
            if (radUser.usertypeId==2){
              await replyAction(replyToken, lineApi.createBotMenu(userHelpText, action, lineApi.techMainMenu));
            } else if (radUser.usertypeId==4){
              await replyAction(replyToken, lineApi.createBotMenu(userHelpText, action, lineApi.radioMainMenu));
            } else if (radUser.usertypeId==6){
              await replyAction(replyToken, lineApi.createBotMenu(userHelpText, action, lineApi.mainMenu));
            } else {
              await replyAction(replyToken, lineApi.createBotMenu(userHelpText, action, lineApi.mainMenu));
            }
            resolve();
          break;
          case 'x302':
            /* แจ้งปัญหาการใช้าน*/
            var userHandle = {userId: userId, content: {mode: 'key', field: 'report', type: 'reg'}};
            sessionHandleStorages.push(userHandle);
            guideMsg = 'ป้อนปัญหาการใช้งานระบบฯ ส่งเข้ามาได้เลยครับ';
            lineMessage = { type: "text",	text: guideMsg };
            await replyAction(replyToken, lineMessage);
            resolve();
          break;
          case 'x401':
            /* radio accept new case*/
            let targetCases = await db.cases.findAll({ attributes: ['casestatusId'], where: {id: data}});
            let nowCaseStatus = targetCases[0].casestatusId;
            if (nowCaseStatus == 1) {
              let changeRes = await statusControl.doChangeCaseStatus(1, 2, data, radUser.id, 'Accept by Line Bot');
              if (changeRes.change.status == true) {
                action = 'quick';
                let actionReturnText = await common.doCreateTriggerChatBotMessage(data, changeRes.triggerDate);
                await replyAction(replyToken, lineApi.createBotMenu(actionReturnText, action, lineApi.radioMainMenu));
              } else {
                action = 'quick';
                actionReturnText = 'ไม่สามารถดำเนินการตอบรับเคสได้\n\nโปรดใช้งานอย่างอื่นจากเมนู';
                await replyAction(replyToken, lineApi.createBotMenu(actionReturnText, action, lineApi.radioMainMenu));
              }
            } else {
              action = 'quick';
              actionReturnText = 'เตสที่กำลังตอบรับไม่อยู่ในสถานะให้ตอบรับหรือปฏิเสธได้\n\nโปรดใช้งานอย่างอื่นจากเมนู';
              await replyAction(replyToken, lineApi.createBotMenu(actionReturnText, action, lineApi.radioMainMenu));
            }
            resolve(targetCases);
          break;
          case 'x402':
            /* radio not accept new cse*/
            targetCases = await db.cases.findAll({ attributes: ['casestatusId'], where: {id: data}});
            nowCaseStatus = targetCases[0].casestatusId;
            if (nowCaseStatus == 1) {
              let changeResNotAcc = await statusControl.doChangeCaseStatus(1, 3, data, radUser.id, 'Reject by Line Bot');
              if (changeResNotAcc.change.status == true) {
                caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN', 'Patient_NameTH', 'Patient_LastNameTH']}, {model: db.hospitals, attributes: ['Hos_Name']}];
                targetCases = await db.cases.findAll({include: caseInclude, where: {id: data}});
                targetCase = targetCases[0];
                hospitalName = targetCase.hospital.Hos_Name;
                patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;
                /*
                let studyDesc = targetCase.Case_StudyDescription;
                let modality = targetCase.Case_Modality;
                actionReturnTextFmt = 'ปฏิเสธเคส\nชื่อ %s\nStudy Desc. %s\nModality %s แล้ว\n แล้ว';
                actionReturnText = uti.fmtStr(actionReturnTextFmt, patientNameEN, studyDesc, modality);
                */
                actionReturnTextFmt = 'ปฏิเสธเคส\nชื่อ %s แล้ว';
                actionReturnText = uti.fmtStr(actionReturnTextFmt, patientNameEN);
                action = 'quick';
                await replyAction(replyToken, lineApi.createBotMenu(actionReturnText, action, lineApi.radioMainMenu));
              } else {
                action = 'quick';
                actionReturnText = 'ไม่สามารถดำเนินการปฏิเสธเคสได้\n\nโปรดใช้งานอย่างอื่นจากเมนู';
                await replyAction(replyToken, lineApi.createBotMenu(actionReturnText, action, lineApi.radioMainMenu));
              }
            } else {
              action = 'quick';
              actionReturnText = 'เตสที่กำลังตอบรับไม่อยู่ในสถานะให้ตอบรับหรือปฏิเสธได้\n\nโปรดใช้งานอย่างอื่นจากเมนู';
              await replyAction(replyToken, lineApi.createBotMenu(actionReturnText, action, lineApi.radioMainMenu));
            }
            resolve(targetCases);
          break;
          case 'x501':
            action = 'quick';
            targetProfile = await db.userprofiles.findAll({attributes: ['Profile'], where: { userId: radUser.id } });
            if (targetProfile.length > 0){
              userProfile = targetProfile[0];
              userProfile.Profile.readyState = 1;
              userProfile.Profile.readyBy = 'bot';
              await db.userprofiles.update({Profile: userProfile.Profile}, { where: { userId: radUser.id } });
              await replyAction(replyToken, lineApi.createBotMenu('ระบบฯ ดำเนินการตั้งค่ารับเคสใหม่ของคุณแล้ว\nใช้งานอื่นๆ จากเมนูด้านล่างครับ', action, lineApi.radioMainMenu));
              let updateProfileTrigger = {type: 'updateuserprofile', profile: userProfile};
              await socket.sendMessage(updateProfileTrigger, radUser.username);
            } else {
              await replyAction(replyToken, lineApi.createBotMenu('ระบบฯ ไม่พบข้อมูลการตั้งค่าของคุณ\nโปรดใช้งานอื่นจากเมนูด้านล่างก่อนครับ', action, lineApi.radioMainMenu));
            }
            resolve();
          break;
          case 'x502':
            action = 'quick';
            targetProfile = await db.userprofiles.findAll({attributes: ['Profile'], where: { userId: radUser.id } });
            if (targetProfile.length > 0){
              userProfile = targetProfile[0];
              userProfile.Profile.readyState = 0;
              userProfile.Profile.readyBy = 'bot';
              let result = await db.userprofiles.update({Profile: userProfile.Profile}, { where: { userId: radUser.id } });
              await replyAction(replyToken, lineApi.createBotMenu('ระบบฯ ดำเนินการตั้งค่ารับเคสใหม่ของคุณแล้ว\nใช้งานอื่นๆ จากเมนูด้านล่างครับ', action, lineApi.radioMainMenu));
              let updateProfileTrigger = {type: 'updateuserprofile', profile: userProfile};
              await socket.sendMessage(updateProfileTrigger, radUser.username);
            } else {
              await replyAction(replyToken, lineApi.createBotMenu('ระบบฯ ไม่พบข้อมูลการตั้งค่าของคุณ\nโปรดใช้งานอื่นจากเมนูด้านล่างก่อนครับ', action, lineApi.radioMainMenu));
            }
            resolve();
          break;
          case 'x601':
            /* radio accept new consult*/
            log.info('data=>' + data);
            consultInclude = [{model: db.hospitals, attributes: ['Hos_Name']}];
            targetConsults = await db.radconsults.findAll({include: caseInclude, where: {id: data}});
            log.info('targetConsults=>' + JSON.stringify(targetConsults));
            targetConsult = targetConsults[0];
            hospitalName = targetConsult.hospital.Hos_Name;
            patientName = targetConsult.PatientName;
            patientHN = targetConsult.PatientHN;
            actionReturnTextFmt = 'ดำเนินการตอบรับ Consult\nชื่อ %s\nรพ. %s\nไปเรียบร้อยแล้ว\n\nใช้บริการอื่นๆ จากเมนูครับ';
            actionReturnText = uti.fmtStr(actionReturnTextFmt, patientName, hospitalName);
            action = 'quick';
            await replyAction(replyToken, lineApi.createBotMenu(actionReturnText, action, lineApi.radioMainMenu));
            /*
            ต้องส่ง msg มาแจ้ง tech ด้วย
            */
            let changeConsultRes = await statusControl.doChangeConsultStatus(1, 2, data, radUser.id);
            resolve(changeConsultRes);
          break;
          case 'x602':
            /* radio reject new consult*/
            consultInclude = [{model: db.hospitals, attributes: ['Hos_Name']}];
            targetConsults = await db.radconsults.findAll({include: caseInclude, where: {id: data}});
            targetConsult = targetConsults[0];
            hospitalName = targetConsult.hospital.Hos_Name;
            patientName = targetConsult.PatientName;
            patientHN = targetConsult.PatientHN;
            actionReturnTextFmt = 'ดำเนินการปฏิเสธ Consult\nชื่อ %s\nรพ. %s\nไปเรียบร้อยแล้ว\n\nใช้บริการอื่นๆ จากเมนูครับ';
            actionReturnText = uti.fmtStr(actionReturnTextFmt, patientName, hospitalName);
            action = 'quick';
            await replyAction(replyToken, lineApi.createBotMenu(actionReturnText, action, lineApi.radioMainMenu));
            /*
            ต้องส่ง msg มาแจ้ง tech ด้วย
            */
            let changeRejectConsultRes = await statusControl.doChangeConsultStatus(1, 3, data, radUser.id);
            resolve(changeRejectConsultRes);
          break;
        }
      break;
    }
  });
}

const textMessageHandle = (userId, replyToken, userText, radUser)=>{
  return new Promise(async (resolve, reject)=>{
    let action;
    let replyMsg;
    let sessionHanle = await doFindSessionHandle(userId);
    if (sessionHanle) {
      let userMode = sessionHanle.content.mode;
      switch (userMode) {
        case 'key':
          let field = sessionHanle.content.field;
          let actionType = sessionHanle.content.type;
          if (actionType === 'reg'){
            if (field === 'username') {
              let usertype = sessionHanle.content.usertype;
              //search username from db
              const users = await db.users.findAll({ attributes: ['id', 'username', 'usertypeId'], where: {	username: userText, usertypeId: usertype}});
              if (users.length > 0){
                const userLines = await db.lineusers.findAll({ attributes: ['id', 'UserId', 'userId'], where: {	userId: users[0].id}});
                log.info('userLines=> ' + JSON.stringify(userLines));
                log.info('userId=> ' + userId);
                if (userLines.length == 0) {
                  let newLineUser = {UserId: userId};
                  let adLineUser = await db.lineusers.create(newLineUser);
                  await db.lineusers.update({userId: users[0].id}, { where: { id: adLineUser.id } });
                } else {
                  await db.lineusers.update({UserId: userId}, { where: { userId: users[0].id } });
                }
                action = 'quick';
                replyMsg = 'ระบบฯ ได้ทำการลงทะเบียน ' + userText + ' เพื่อใช้งานระบบฯ คู่กับ Line ของคุณเป็นที่เรียบร้อยแล้วครับ\nหากต้องการใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
                if (users[0].usertypeId==2){
                  await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.techMainMenu));
                } else if (users[0].usertypeId==4){
                  await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.radioMainMenu));
                } else if (users[0].usertypeId==6){
                  await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.mainMenu));
                } else {
                  await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.mainMenu));
                }
                await removeSessionHandle(userId);
              } else {
                action = 'quick';
                replyMsg = 'ระบบฯ ไม่พบ username=' + userText + '\nคุณต้องการลงทะเบียนใช้งานด้วย username อื่นหรือไม่ครับ'
                await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.confirmMenu));
                await removeSessionHandle(userId);
              }
            } else if (field === 'report') {
              let userdata = await lineApi.getUserProfile(userId);
              let userProfile = JSON.parse(userdata);
              let displayName = userProfile.displayName;
              let reportMsg = displayName + ' แจ้งปัญหาเข้ามาว่า ' + userText;
              log.info(reportMsg);
              //LINE_ADMIN_USERID=U2ffb97f320994da8fb3593cd506f9c43
              let msgToAdmin = { type: "text",	text: reportMsg };
              await pushAction(process.env.LINE_ADMIN_USERID, msgToAdmin);
              action = 'quick';
              replyMsg = 'ระบบฯ ได้ทำการบันทึกปัญหาการใช้งานของคุณและแจ้งไปยังผู้รับผิดชอบเป็นที่เรียบร้อยแล้วครับ\nหากต้องการใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
              if (radUser.usertypeId==2){
                await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.techMainMenu));
              } else if (radUser.usertypeId==4){
                await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.radioMainMenu));
              } else if (radUser.usertypeId==6){
                await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.mainMenu));
              } else {
                await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.mainMenu));
              }
              await removeSessionHandle(userId);
            }
          } else if (actionType === 'unreg'){
            if (field === 'username') {
              let usertype = sessionHanle.content.usertype;
              //search username from db
              action = 'quick';
              const users = await db.users.findAll({ attributes: ['id', 'username', 'usertypeId'], where: {	username: userText, usertypeId: usertype}});
              if (users.length > 0){
                //พบ username
                const userLines = await db.lineusers.findAll({ attributes: ['id', 'UserId', 'userId'], where: {	userId: users[0].id, UserId: userId}});
                if (userLines.length > 0) {
                  await db.lineusers.destroy({ where: { id:  userLines[0].id} });
                  replyMsg = 'ระบบฯ ได้ทำการยกเลิกการลงทะเบียน ' + userText + ' ออกจากระบบฯ เรียบร้อยแล้วครับ\nหากต้องการใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
                } else {
                  //ไม่พบการลงทพเบียน username ก้วย lineId นี้
                  replyMsg = 'ระบบฯ ไม่พบ username = ' + userText + ' ที่เคยลงทะเบียนคู่บัญชี LINE ของคุณ จากในระบบฯ ครับ\nหากต้องการใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
                }
                if (usertype==2){
                  await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.techMainMenu));
                } else if (usertype==4){
                  await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.radioMainMenu));
                }
              } else {
                //ไม่พบ username
                replyMsg = 'ระบบฯ ไม่พบ username = ' + userText + ' ตามที่คุณส่งเข้ามา จากในระบบฯ ครับ\nหากต้องการใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
                if (usertype==2){
                  await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.techMainMenu));
                } else if (usertype==4){
                  await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.radioMainMenu));
                }
              }
            }
            await removeSessionHandle(userId);
          }
        break;
      }
    } else {
      if (userText === 'reg2'){
        let userHandle = {userId: userId, content: {mode: 'key', field: 'username', usertype: 2, type: 'reg'}};
        sessionHandleStorages.push(userHandle);
        let guideMsg = 'โปรดป้อน username ช่างเทคนิคที่ต้องการลงทะเบียนครับ';
        let lineMessage = { type: "text",	text: guideMsg };
        await replyAction(replyToken, lineMessage);
      } else if (userText === 'reg4'){
        let userHandle = {userId: userId, content: {mode: 'key', field: 'username', usertype: 4, type: 'reg'}};
        sessionHandleStorages.push(userHandle);
        let guideMsg = 'โปรดป้อน username รังสีแพทย์ที่ต้องการลงทะเบียนครับ';
        let lineMessage = { type: "text",	text: guideMsg };
        await replyAction(replyToken, lineMessage);
      } else if (userText === 'unreg2'){
        let userHandle = {userId: userId, content: {mode: 'key', field: 'username', usertype: 2, type: 'unreg'}};
        sessionHandleStorages.push(userHandle);
        let guideMsg = 'โปรดป้อน username ช่างเทคนิคที่ต้องการยกเลิกลงทะเบียนครับ';
        let lineMessage = { type: "text",	text: guideMsg };
        await replyAction(replyToken, lineMessage);
      } else if (userText === 'unreg4'){
        let userHandle = {userId: userId, content: {mode: 'key', field: 'username', usertype: 4, type: 'unreg'}};
        sessionHandleStorages.push(userHandle);
        let guideMsg = 'โปรดป้อน username รังสีแพทย์ที่ต้องการยกเลิกลงทะเบียนครับ';
        let lineMessage = { type: "text",	text: guideMsg };
        await replyAction(replyToken, lineMessage);
      } else {
        let textCmds = userText.split(' ');
        if (textCmds.length == 2){
          if (textCmds[0] == 'rreg'){
            log.info('your username=> ' + textCmds[1]);
            const users = await db.users.findAll({ attributes: ['id', 'username', 'usertypeId'], where: {	username: textCmds[1], usertypeId: 4}});
            if (users.length > 0){
              const userLines = await db.lineusers.findAll({ attributes: ['id', 'UserId', 'userId'], where: {	userId: users[0].id}});
              log.info('userLines=> ' + JSON.stringify(userLines));
              log.info('userId=> ' + userId);
              if (userLines.length == 0) {
                let newLineUser = {UserId: userId};
                let adLineUser = await db.lineusers.create(newLineUser);
                await db.lineusers.update({userId: users[0].id}, { where: { id: adLineUser.id } });
              } else {
                await db.lineusers.update({UserId: userId}, { where: { userId: users[0].id } });
              }
              action = 'quick';
              replyMsg = 'ระบบฯ ได้ทำการลงทะเบียน ' + textCmds[1] + ' เพื่อใช้งานระบบฯ คู่กับ Line ของคุณเป็นที่เรียบร้อยแล้วครับ\nหากต้องการใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
              await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.radioMainMenu));
            } else {
              action = 'quick';
              replyMsg = 'ระบบฯ ไม่พบ ' + textCmds[1] + ' จากฐานข้อมูล\nโปรดใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
              await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.radioMainMenu));
            }
          } else if (textCmds[0] == 'treg'){
            log.info('your username=> ' + textCmds[1]);
            const users = await db.users.findAll({ attributes: ['id', 'username', 'usertypeId'], where: {	username: textCmds[1], usertypeId: 2}});
            if (users.length > 0){
              const userLines = await db.lineusers.findAll({ attributes: ['id', 'UserId', 'userId'], where: {	userId: users[0].id}});
              log.info('userLines=> ' + JSON.stringify(userLines));
              log.info('userId=> ' + userId);
              if (userLines.length == 0) {
                let newLineUser = {UserId: userId};
                let adLineUser = await db.lineusers.create(newLineUser);
                await db.lineusers.update({userId: users[0].id}, { where: { id: adLineUser.id } });
              } else {
                await db.lineusers.update({UserId: userId}, { where: { userId: users[0].id } });
              }
              action = 'quick';
              replyMsg = 'ระบบฯ ได้ทำการลงทะเบียน ' + textCmds[1] + ' เพื่อใช้งานระบบฯ คู่กับ Line ของคุณเป็นที่เรียบร้อยแล้วครับ\nหากต้องการใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
              await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.radioMainMenu));
            } else {
              action = 'quick';
              replyMsg = 'ระบบฯ ไม่พบ ' + textCmds[1] + ' จากฐานข้อมูล\nโปรดใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
              await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.radioMainMenu));
            }
          }

        } else {
          action = 'quick';
          replyMsg = 'ต้องขออภัยด้วยจริงๆ ครับ ผมไมอาจ่เข้าใจในสิ่งที่คุณส่งเข้ามา โปรดเลือกใช้บริการของผมจากเมนูครับ';
          if (radUser.usertypeId==2){
            await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.techMainMenu));
          } else if (radUser.usertypeId==4){
            await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.radioMainMenu));
          } else if (radUser.usertypeId==6){
            await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.mainMenu));
          } else {
            await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.mainMenu));
          }
        }
      }
    }
  });
}

const doCheckUserRegistered = function(lineId) {
  return new Promise(async (resolve, reject)=>{
    const userLines = await db.lineusers.findAll({ attributes: ['id', 'UserId'], where: {	UserId: lineId}});
    resolve(userLines);
  });
}

const doCallUserType = function(lineId){
  return new Promise(async (resolve, reject)=>{
    const userLines = await db.lineusers.findAll({ attributes: ['id', 'UserId', 'userId'], where: {	UserId: lineId}});
    if ((userLines) && (userLines.length > 0)) {
      let userId = userLines[0].userId;
      const users = await db.users.findAll({ attributes: ['id', 'username', 'usertypeId'], where: {	id: userId}});
      if ((users) && (users.length > 0)) {
        resolve(users[0]);
      } else {
        resolve();
      }
    } else {
      resolve();
    }
  });
}

app.get('/', function(req, res) {
	res.status(200).send("OK");
});

app.post('/', async function(req, res) {
  var replyMessage;
	var question;
  var userdata;
  var userProfile;
  var displayName;
  var username;
  var usertypeId;

  let userEvent = req.body.events[0];
  let replyToken = userEvent.replyToken;
	let userId = userEvent.source.userId;
	let destination = req.body.destination;
  let radUser = await doCallUserType(userId);
  if ((radUser) && (radUser.username)) {
    username = radUser.username;
  } else if ((radUser) && (radUser.usertypeId)) {
    usertypeId = radUser.usertypeId;
  } else {
    radUser = {username: '', usertypeId: 0};
  }

  switch (userEvent.type) {
    case 'message':
      let userMessageType = userEvent.message.type;
      switch (userMessageType) {
        case 'text':
          var userText = userEvent.message.text;
          await textMessageHandle(userId, replyToken, userText, radUser);
        break;
        case 'image':
          var imageId = userEvent.message.id;
          var unSupportMsg = 'ต้องขออภัยระบบยังไม่รองรับฟังก์ชั่นนี้ในขณะนี้\nโปรดใช้เมนูจากด้านล่างครับ';
          var action = 'quick';
          if (usertypeId==2){
            await replyAction(replyToken, lineApi.createBotMenu(unSupportMsg, action, lineApi.techMainMenu));
          } else if (usertypeId==4){
            await replyAction(replyToken, lineApi.createBotMenu(unSupportMsg, action, lineApi.radioMainMenu));
          } else if (usertypeId==6){
            await replyAction(replyToken, lineApi.createBotMenu(unSupportMsg, action, lineApi.mainMenu));
          } else {
            await replyAction(replyToken, lineApi.createBotMenu(unSupportMsg, action, lineApi.mainMenu));
          }
        break;
      }
    break;
    case 'postback':
      var cmds = userEvent.postback.data.split("&");
      await postbackMessageHandle(userId, replyToken, cmds, radUser);
    break;
    case 'follow':
      try {
        userdata = await lineApi.getUserProfile(userId);
        userProfile = JSON.parse(userdata);
        log.info('User Follow Profile => ' + JSON.stringify(userProfile));
        displayName = userProfile.displayName;
        var intro = "Welcome to RadconnextV2 " + displayName;
        var action = 'quick';
        await replyAction(replyToken, lineApi.createBotMenu(intro, action, lineApi.mainMenu));
      } catch (err) {
        log.info('User Follow Error => ' + JSON.stringify(err));
      }
    break;
    case 'unfollow':
      try {
        /*
        userdata = await lineApi.getUserProfile(userId);
        userProfile = JSON.parse(userdata);
        displayName = userProfile.displayName;
        var replyUnfollowMsg = "RadconnextV2 ขอบพระคุณ คุณ " + displayName;
        replyUnfollowMsg += "\nเป็นอย่างสูงที่ไดมีโอกาส้รับใช้คุณ\nคุณสามารถกลับมาใช้บริการได้ใหม่ทุกเมื่อเลยครับ";
        await pushAction(userId, replyUnfollowMsg);
        */
      } catch (err) {
        log.info('User Unfollow Error => ' + JSON.stringify(err));
      }
    break;
  }
});

module.exports = ( taskCase, warningTask, voipTask, dbconn, monitor, webSocket ) => {
  db = dbconn;
  log = monitor;
  socket = webSocket;
  Task = taskCase;
  Warning = warningTask;
  Voip = voipTask;
  auth = require('../db/rest/auth.js')(db, log);
  lineApi = require('./mod/lineapi.js')(db, log);
  uti = require('./mod/util.js')(db, log);
  statusControl = require('../db/rest/statuslib.js')(db, log, Task, Warning, Voip, socket);
  common = require('../db/rest/commonlib.js')(db, log);
  return app;
}
