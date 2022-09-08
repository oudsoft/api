const urlQueryToObject = function(url) {
  let result = url.split(/[?&]/).slice(1).map(function(paramPair) {
    return paramPair.split(/=(.+)?/).slice(0, 2);
  }).reduce(function (obj, pairArray) {
    obj[pairArray[0]] = pairArray[1];
    return obj;
  }, {});
  return result;
}

const inputStyleClass = {"font-family": "THSarabunNew", "font-size": "24px"};

var wsm;

const initPage = function() {
  $('body').append($('<div id="overlay"><div class="loader"></div></div>'));
  $('body').loading({overlay: $("#overlay"), stoppable: true});
  let queryObj = urlQueryToObject(window.location.href);
  let yourToken = localStorage.getItem('token');
  if (yourToken) {
    //chat room
    $.ajaxSetup({
      beforeSend: function(xhr) {
        xhr.setRequestHeader('Authorization', yourToken);
      }
    });

    if (queryObj.caseId) {
      doOpenChatRoom(queryObj.caseId);
    } else {
      doPromptCaseId();
    }
  } else {
    //login
    //window.location.replace('/index.html?action=callchat&caseId='+queryObj.caseId);
    $('head').append('<script src="../setting/plugin/jquery-radutil-plugin.js"></script>');
    let radLoginBox = $('<div></div>');
    $(radLoginBox).append($('<p>ป้อน Username และ Pฟssword ของคุณเพื่อเข้าสู่ระบบ แล้วคลิกปุ่ม <b>ตกลง</b></p>'));
    $(radLoginBox).append($('<p>หากยังไม่ได้ลงทะเบียนเข้าใช้งาน คลิกปุ่ม <b>ลงทะเบียน</b></p>'));
    let usernameInput = $('<input type="text"/>');
    $(usernameInput).css({'margin-left': '10px'});
    let passwordInput = $('<input type="password"/>');
    $(passwordInput).css({'margin-left': '10px'});
    let usernameLine = $('<div style="position: realtive; width: 100%; padding: 10px;"><span style="display: inline-block">Username:</span></div>');
    let passwordLine = $('<div style="position: realtive; width: 100%; padding: 10px;"><span style="display: inline-block">Password:</span></div>');
    $(usernameLine).append($(usernameInput));
    $(passwordLine).append($(passwordInput));
    let loginMsgbox = $('<div style="position: realtive; width: 100%; color: red;"></div>');
    $(radLoginBox).append($(usernameLine));
    $(radLoginBox).append($(passwordLine));
    $(radLoginBox).append($(loginMsgbox));
    const radloginoption = {
			title: 'โปรดเข้าสู่ระบบเพื่อเริ่มติดต่อรังสีแพทย์',
			msg: $(radLoginBox),
			width: '520px',
			onOk: function(evt){
        let username = $(usernameInput).val();
        let password = $(passwordInput).val();
        if (username != '') {
          $(usernameInput).css({'border': ''});
          if (password != ''){
            $(passwordInput).css({'border': ''});
            $.post('/api/login', {username: username, password: password}).then(function(loginRes){
              if (loginRes.success == false) {
                $(usernameInput).css({'border': '1px solid red'});
                $(passwordInput).css({'border': '1px solid red'});
                $(loginMsgbox).html('<b>Username หรือ Password</b> ไม่ถูกต้อง');
              } else {
                $(usernameInput).css({'border': ''});
                $(passwordInput).css({'border': ''});
                userLoginBox.closeAlert();
                localStorage.setItem('token', loginRes.token);
                localStorage.setItem('userdata', JSON.stringify(loginRes.data));

                $.ajaxSetup({
                  beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', loginRes.token);
                  }
                });

                if (queryObj.caseId) {
                  doOpenChatRoom(queryObj.caseId);
                } else {
                  doPromptCaseId();
                }

              }
            });
          } else {
            $(passwordInput).css({'border': '1px solid red'});
            $(loginMsgbox).html('<b>Password</b> ต้องไม่ว่าง');
          }
        } else {
          $(usernameInput).css({'border': '1px solid red'});
          $(loginMsgbox).html('<b>Username</b> ต้องไม่ว่าง');
        }
      },
      onCancel: function(evt){
        userLoginBox.closeAlert();
        doShowRegisterGuideBox();
      }
    };
    let userLoginBox = $('body').radalert(radloginoption);
    $(userLoginBox.cancelCmd).val('ลงทะเบียน')
  }
}

$(document).ready(function() {
	initPage();
});

const doOpenChatRoom = function(caseId){
  $('body').loading('start');
  let userdata = JSON.parse(localStorage.getItem('userdata'));
  //console.log(userdata);
  let username = userdata.username;
  let usertypeId = userdata.usertypeId;
  let hospitalId = userdata.hospitalId;

  wsm = doConnectWebsocketMaster(username, usertypeId, hospitalId, 'none');
  //console.log(wsm);

  doCreateChatBox(caseId).then(function(simpleChatBox){
    $('#app').append($(simpleChatBox));

    let gotomainpageCmd = doCreatePageCmd();
    $('#app').append($(gotomainpageCmd));
    $('body').loading('stop');
  });
}

const doConnectWebsocketMaster = function(username, usertypeId, hospitalId, connecttype){
  const hostname = window.location.hostname;
  const port = window.location.port;
  const paths = window.location.pathname.split('/');
  const rootname = paths[1];

  //const wsUrl = 'wss://' + hostname + ':' + port + '/' + rootname + '/' + username + '/' + hospitalId + '?type=' + type;
  const wsUrl = 'wss://' + hostname + '/' + username + '/' + hospitalId;
  console.log(wsUrl);
  wsm = new WebSocket(wsUrl);
  wsm.onopen = function () {
    //console.log('Master Websocket is connected to the signaling server')
  };

  console.log(usertypeId);

  wsm.onmessage = onMessageEvt;

  wsm.onclose = function(event) {
    //console.log("Master WebSocket is closed now. with  event: ", event);
  };

  wsm.onerror = function (err) {
     console.log("Master WS Got error", err);
  };

  return wsm;
}

const onMessageEvt = function(msgEvt){
  let data = JSON.parse(msgEvt.data);
  console.log(data);
  if (data.type !== 'test') {
    let masterNotify = localStorage.getItem('masternotify');
    let MasterNotify = JSON.parse(masterNotify);
    if (MasterNotify) {
      MasterNotify.push({notify: data, datetime: new Date(), status: 'new'});
    } else {
      MasterNotify = [];
      MasterNotify.push({notify: data, datetime: new Date(), status: 'new'});
    }
    localStorage.setItem('masternotify', JSON.stringify(MasterNotify));
  }
  if (data.type == 'test') {
    $.notify(data.message, "success");
  } else if (data.type == 'notify') {
    $.notify(data.message, "info");
  } else if (data.type == 'callzoom') {
    let eventName = 'callzoominterrupt';
    let callData = {openurl: data.openurl, password: data.password, topic: data.topic, sender: data.sender};
    let event = new CustomEvent(eventName, {"detail": {eventname: eventName, data: callData}});
    document.dispatchEvent(event);
  } else if (data.type == 'callzoomback') {
    let eventName = 'stopzoominterrupt';
    let evtData = {result: data.result};
    let event = new CustomEvent(eventName, {"detail": {eventname: eventName, data: evtData}});
    document.dispatchEvent(event);
  } else if (data.type == 'message') {
    $.notify(data.from + ':: ส่งข้อความมาว่า:: ' + data.msg, "info");
    doSaveMessageToLocal(data.msg ,data.from, data.context.topicId, 'new');
    let eventData = {msg: data.msg, from: data.from, context: data.context};
    $('#SimpleChatBox').trigger('messagedrive', [eventData]);
  }
};

const doSaveMessageToLocal = function(msg ,from, topicId, status){
  let localMessage = JSON.parse(localStorage.getItem('localmessage'));
  let localMessageJson = localMessage;
  if (localMessageJson) {
    localMessageJson.push({msg: msg, from: from, topicId: topicId, datetime: new Date(), status: status});
  } else {
    localMessageJson = [];
    localMessageJson.push({msg: msg, from: from, topicId: topicId, datetime: new Date(), status: status});
  }
  localStorage.setItem('localmessage', JSON.stringify(localMessageJson));
}

const doCreateChatBox = function(caseId){
  let dfd = $.Deferred();
  let userdata = JSON.parse(localStorage.getItem('userdata'));
  $.post('/api/cases/select/'+ caseId, {}).then(function(caseRes){
    if (caseRes.Records.length > 0){
      caseItem = caseRes.Records[0];
      let patentFullName, patientHN, patientSA, caseBodypart;
      patentFullName = caseItem.case.patient.Patient_NameEN + ' ' + caseItem.case.patient.Patient_LastNameEN;
      patientHN = caseItem.case.patient.Patient_HN;
      patientSA = caseItem.case.patient.Patient_Age + '/' + caseItem.case.patient.Patient_Sex;
      caseBodypart = caseItem.case.Case_BodyPart;

      let simpleChatBoxOption = {
        topicId: caseId,
        topicName: patientHN + ' ' + patentFullName + ' ' + patientSA + ' ' + caseBodypart,
        topicStatusId: caseItem.case.casestatusId,
        myId: userdata.username,
        myName: userdata.userinfo.User_NameTH + ' ' + userdata.userinfo.User_LastNameTH,
        myDisplayName: 'ฉัน',
        audienceId: caseItem.Radiologist.username,
        audienceName: caseItem.Radiologist.User_NameTH + ' ' + caseItem.Radiologist.User_LastNameTH,
        wantBackup: true,
        externalClassStyle: {},
        sendMessageCallback: doSendMessageCallback,
        resetUnReadMessageCallback: doResetUnReadMessageCallback
      };
      let callRadioView = $('<div style="width: 99%; padding: 2px;"></div>');
      let caseView = $('<div style="padding: 5px; border: 1px solid black; background-color: #ccc; margin-top: 4px;"></div>');
      let caseTitleBox = doCreateCaseTitle();
      $(caseTitleBox).appendTo($(caseView));
      $(caseTitleBox).find('#PatientHN').text(patientHN);
  		$(caseTitleBox).find('#PatentFullName').text(patentFullName);
  		$(caseTitleBox).find('#PatientSA').text(patientSA);
  		$(caseTitleBox).find('#CaseBodypart').text(caseBodypart);

      doCreateResulteSection(caseId).then(function(caseResultInfoBox){
    		$(caseResultInfoBox).appendTo($(caseView));

        $(callRadioView).append($(caseView));

        let simpleChatBox = $('<div id="SimpleChatBox"></div>');
        let simpleChatBoxHandle = $(simpleChatBox).chatbox(simpleChatBoxOption);
        $(simpleChatBox).css({width: '100%'})
        simpleChatBoxHandle.restoreLocal().then(function(){
          $(callRadioView).append($(simpleChatBox));
          simpleChatBoxHandle.scrollDown();
          dfd.resolve($(callRadioView));
        });
      });
    } else {
      dfd.resolve();
    }
  });
  return dfd.promise();
}

const doSendMessageCallback = function(msg, sendto, from, context){
  let dfd = $.Deferred();
  const userdata = JSON.parse(localStorage.getItem('userdata'));
  let msgSend = {type: 'message', msg: msg, sendto: sendto, from: from, context: context};
  wsm.send(JSON.stringify(msgSend));
  if (context.topicStatusId != 14) {
    let newStatus = 14;
    let newDescription = 'Case have Issue Message to Radio.';

		let hospitalId = userdata.hospitalId;
		let userId = userdata.userId;
		let rqParams = { hospitalId: hospitalId, userId: userId, caseId: context.topicId, casestatusId: newStatus, caseDescription: newDescription};

    $.post('/api/cases/status/' + context.topicId, rqParams).then(function(updateStatusRes){
      console.log(updateStatusRes);
      if (updateStatusRes.status.code == 200){
        let selector = '#'+sendto + ' .chatbox';
        let targetChatBox = $(selector);
        let eventData = {topicStatusId: 14};
        $(targetChatBox).trigger('updatetopicstatus', [eventData]);
      } else {
        $.notify('Now. can not update case status.', 'warn');
      }
      dfd.resolve();
    })
  } else {
    dfd.resolve();
  }
  return dfd.promise();
}

const doResetUnReadMessageCallback = function(audienceId, value){
  let selector = '#'+audienceId + ' .reddot';
  let lastValue = $(selector).text();
  let newValue = Number(lastValue) + value;
  if (newValue > 0) {
    $(selector).text(newValue);
    $(selector).show()
  } else {
    $(selector).hide()
  }
}

const pageLineStyle = {'border': '2px solid blue', 'background-color': '#02069B', 'margin-top': '4px', 'padding': '2px'};

const doCreateCaseTitle = function(){
  let caseTitle = $('<div id="CaseTitle"></div>');
  let summaryLine = $('<div></div>');
  $(summaryLine).appendTo($(caseTitle));
  $(summaryLine).append($('<span><b>HN:</b> </span>'));
  $(summaryLine).append($('<span id="PatientHN" style="margin-left: 4px; color: white;"></span>'));
  $(summaryLine).append($('<span style="margin-left: 4px;"><b>Name:</b> </span>'));
  $(summaryLine).append($('<span id="PatentFullName" style="margin-left: 4px; color: white;"></span>'));
  $(summaryLine).append($('<span style="margin-left: 4px;"><b>Age/sex:</b> </span>'));
  $(summaryLine).append($('<span id="PatientSA" style="margin-left: 4px; color: white;"></span>'));
  $(summaryLine).append($('<span style="margin-left: 4px;"><b>Body Part:</b> </span>'));
  $(summaryLine).append($('<span id="CaseBodypart" style="margin-left: 4px; color: white;"></span>'));
  $(summaryLine).css(pageLineStyle);
  return $(caseTitle);
}

const doCreateResulteSection = function(caseId) {
  let dfd = $.Deferred();
  let resultBox = $('<div></div>');
  let resultTitle = $('<div><span><b>ผลอ่าน</b></span></div>');
  $(resultTitle).appendTo($(resultBox));
  doCreateCaseResult(caseId).then(function(resultContentBox){
    let resultView = $('<div style="width: 99%; padding: 4px; border: 2px solid grey; background-color: white; min-height: 100px"></div>')
    $(resultView).append($(resultContentBox));
    $(resultView).appendTo($(resultBox));

    let hideShowToggleCmd = $('<span style="float: right; cursor: pointer;">ซ่อนผลอ่าน</span>');
    $(hideShowToggleCmd).on('click', function(evt){
      let state = $(resultView).css('display');
      if (state === 'block') {
        $(resultView).slideUp();
        $(hideShowToggleCmd).text('แสดงผลอ่าน');
      } else {
        $(resultView).slideDown();
        $(hideShowToggleCmd).text('ซ่อนผลอ่าน');
      }
    });
    $(hideShowToggleCmd).appendTo($(resultTitle));
    dfd.resolve($(resultBox));
  });
  return dfd.promise();
}

const doCreateCaseResult = function(caseId){
  let dfd = $.Deferred();
  $.post('/api/cases/result/'+ caseId, {}).then(function(resultRes){
    if ((resultRes) && (resultRes.Records.length > 0)) {
      let resultReport = resultRes.Records[0];
      //doCreateDownloadPDF(resultReport.PDF_Filename).then(function(pdfStream){
        let resultBox = $('<div style="width: 97%; padding: 10px; border: 1px solid black; background-color: #ccc; margin-top: 4px;"></div>');
        let embetObject = $('<object data="' + resultReport.PDF_Filename + '" type="application/pdf" width="100%" height="480"></object>');
        $(embetObject).appendTo($(resultBox));
        dfd.resolve($(resultBox));
      //});
    } else {
      let resultBox = $('<div style="width: 97%; padding: 10px; border: 1px solid black; background-color: #ccc; margin-top: 4px;"></div>');
      let errorNotFoundPDF = $('<div style="color: red;"><h2>Not Found PDF report file.</h2><p>caseId=' + caseId + '</p></div>');
      $(resultBox).append($(errorNotFoundPDF));
      dfd.resolve($(resultBox));
    }
  });
  return dfd.promise();
}

const doCreatePageCmd = function(){
  let cmdBox = $('<div style="position: relative; width: 100%; margin-top: 50px; text-align: center;"></div>');
  let gomainCmd = $('<span style="cursor: pointer; background-color: #02069B; color: white; min-width: 80px; min-height: 50px; border: 2px solid grey;">หน้าหลัก</span>');
  $(gomainCmd).on('click', function(evt){
    window.location.replace('/refer/index.html');
  });

  let logoutCmd = $('<span style="cursor: pointer; background-color: #02069B; color: white; min-width: 80px; min-height: 50px; border: 2px solid grey;">ออกจากระบบ</span>');
  $(logoutCmd).on('click', function(evt){
    localStorage.removeItem('token');
  	localStorage.removeItem('userdata');
    wsm.close();
    window.location.replace('/index.html');
  });

  return $(cmdBox).append($(gomainCmd)).append($('<span>  </span>')).append($(logoutCmd));
}

const doShowCaseSecurity = function(){
  const secureMsg = $('<div></div>');
  $(secureMsg).append($('<p>ระบบฯ ไม่สามารถนำข้อมูลเคสของอีกโรงพยาบาลหนึ่งมาเปิดเผยได้</p>'));
  const radalertoption = {
    title: 'มีปัญหาเรื่องความลับของข้อมูล',
    msg: $(secureMsg),
    width: '560px',
    onOk: function(evt) {
      $(secureMsg).empty().append($('<p>โปรดป้อนรหัสเคสที่เป็นของโรงพยาบาลคุณ</p>'));
      setTimeout(function(){
        radAlertBox.closeAlert();
      }, 5000);
    },
  }

  let radAlertBox = $('body').radalert(radalertoption);
  $(radAlertBox.cancelCmd).hide();
}

const doCreateDownloadPDF = function(pdfLink){
  let dfd = $.Deferred();
  $.ajax({
    url: pdfLink,
    success: function(response){
			let stremLink = URL.createObjectURL(new Blob([response.data], {type: 'application/pdf'}));
      dfd.resolve(stremLink);
		}
	});
  return dfd.promise();
}

const doPromptCaseId = function() {
  const promptMsg = $('<div></div>');
  $(promptMsg).append($('<p>รหัสเคสจะปรากฎอยู่ด้านล่างของรายงานผลอ่าน</p>'));
  $(promptMsg).append($('<p>นำค่ารหัสเคสมาป้อนลงในช่องรหัสเคสด้านล่าง แล้วคลิกปุ่ม <b>ตกลง</b></p>'));
  let promptInputBox = $('<div style="position: relative; width: 100%; text-align: left; padding: 4px;"></div>');
  $(promptInputBox).append($('<div style="display: inline-block;">รหัสเคส:</div>'));
  let caseIdInput = $('<input id="CaseId" type="number"/>');
  let caseIdInputBox = $('<div style="display: inline-block; margin-left: 5px;"></div>');
  $(caseIdInputBox).append($(caseIdInput));
  $(promptInputBox).append($(caseIdInputBox));
  $(promptMsg).append($(promptInputBox));
  const radpromptoption = {
    title: 'โปรดระบุรหัสเคส',
    msg: $(promptMsg),
    width: '560px',
    onOk: function(evt) {
      let yourCaseId = $(caseIdInput).val();
      $.post('/api/cases/select/'+ yourCaseId, {}).then(function(caseRes){
      //console.log(caseRes);
        if (caseRes.Records.length > 0){
          let caseHospitalId = caseRes.Records[0].case.hospitalId;
          let userdata = JSON.parse(localStorage.getItem('userdata'));
          let hospitalId = userdata.hospitalId;
          if (caseHospitalId == hospitalId) {
            radPromptBox.closeAlert();
            doOpenChatRoom(yourCaseId);
          } else {
            doShowCaseSecurity();
          }
        } else {
          $.notify('ไม่พบข้อมูลเคสจากระบบฯ', "error");
        }
      });
    },
    onCancel: function(evt){
      $(promptMsg).empty();
      $(promptMsg).append($('<p>เราเสียดายเป็นอย่างยิ่งที่ไม่มีโอกาสได้รับใช้คุณ</p>'));
      setTimeout(function(){
        radPromptBox.closeAlert();
      }, 4000);
    }
  }

  let radPromptBox = $('body').radalert(radpromptoption);

  $(caseIdInput).on('keypress',function(e) {
    if(e.which == 13) {
      radPromptBox.settings.onOk();
    };
  });
}

const doShowRegisterGuideBox = function(){
  const registerGuideBox = $('<div></div>');
  $(registerGuideBox).append($('<p>การลงทะเบียนผู้ใช้งาน จำเป็นต้องมี <b>อีเมล์</b> หนึ่งบัญชี</p>'));
  $(registerGuideBox).append($('<p>และระบบไม่รองรับการลงทะเบียนบน Microsoft Internet Exploere</p>'));
  $(registerGuideBox).append($('<p>หากพร้อมแล้วคลิกปุ่ม <b>ตกลง</b> เพื่อเปิดการลงทะเบียนบน Google Chrome</p>'));
  let chromeBrowser = $('<div style="padding: 5px; text-align: center;"><img src="/images/chrome-icon.png" width="100px" height="auto"/></div>');
  $(registerGuideBox).append($(chromeBrowser));
  const radregisteroption = {
    title: 'ตำชี้แจงเพื่อดำเนินการลงทะเบียน',
    msg: $(registerGuideBox),
    width: '460px',
    onOk: function(evt) {
      let chromeLink = "ChromeHTML:// radconnext.info/index.html?action=register";
      window.location.replace(chromeLink);
      registerGuide.closeAlert();
    }
  }
  let registerGuide = $('body').radalert(radregisteroption);
  $(registerGuide.cancelCmd).hide();
}
