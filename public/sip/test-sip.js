/*test-sip.js*/
// Create our JsSIP instance and run it:

JsSIP.debug.disable('JsSIP:*');

var session = undefined;
var rtcSession = undefined;

var username = '4000';
var usersecret = '03666bea7ac9';
var domainname = '202.28.68.6';
//var domainname = 'radconnext.me';
var userUri = username + '@' + domainname;
var socketUrl = 'wss://' + domainname + ':8089/ws';
//var socketUrl = 'wss://' + domainname + ':8089/ws';

var socket = new JsSIP.WebSocketInterface(socketUrl);
socket.onmessage = function(msgEvt){
  let data = JSON.parse(msgEvt.data);
  console.log(data);
}

var configuration = {
  sockets  : [ socket ],
  authorization_user: username,
  uri      : 'sip:' + userUri,
  password : usersecret,
  ws_servers        : socketUrl,
  realm             : domainname,
  display_name      : username,
  contact_uri       : 'sip:' + userUri
};

var ua = new JsSIP.UA(configuration);

ua.on('connected', function(e){
  console.log('Your are ready connected to your socket.', e);
});

ua.on('registered', function(e){
  console.log('Your are ready registered.', e);
});

ua.on('unregistered', function(e){
  console.log('Your are ready unregistered.', e);
});

ua.on('registrationFailed', function(e){
  console.log('Your are registrationFailed.', e);
});

ua.on('disconnected', function(e){
  console.log('Your are ready dis-connected.', e);
});

ua.start();

// Register callbacks to desired call events
var eventHandlers = {
  'progress': function(e) {
    console.log('call is in progress ...');
    document.getElementById('CallCmd').style.display = 'none';
    document.getElementById('HangupCmd').style.display = 'inline-block';
  },
  'failed': function(e) {
    console.log('call failed with cause: ', e/*.data.cause*/);
    document.getElementById('CallCmd').style.display = 'inline-block';
    document.getElementById('HangupCmd').style.display = 'none';
  },
  'ended': function(e) {
    console.log('call ended with cause: ', e/*.data.cause*/);
    var remoteAudio = document.getElementById('RemoteAudio');
    var stream = remoteAudio.srcObject;
    if (stream){
      var tracks = stream.getTracks();
      if (tracks){
        tracks.forEach(function(track) {
          track.stop();
        });
      }
    }
    var audioControl = document.getElementById('AudioControl');
    audioControl.style.display = 'none';
    document.getElementById('CallCmd').style.display = 'inline-block';
    document.getElementById('HangupCmd').style.display = 'none';
    document.getElementById('Msisdn').value = '';
  },
  'confirmed': function(e) {
    console.log('call confirmed ...', e);
  }
};

var servers = {
  iceServers: [{ "url": "stun:stun2.1.google.com:19302" }, {'url': 'stun:stun.services.mozilla.com'}]
};

var options = {
  pcConfig: servers,
  eventHandlers: eventHandlers,
  mediaConstraints : { 'audio': true, 'video': false },
  rtcOfferConstraints: {'offerToReceiveAudio': true, 'offerToReceiveVideo': false},
  sessionTimersExpires: 7200
};

//https://gist.github.com/echohes/a15fcef59e78271d7a3acb0df480b6b6
//https://github.com/versatica/JsSIP/issues/545
//https://gist.github.com/dtolb/79e813d45fac6488e4c67993b393ddda
//https://tipsfordev.com/bind-mediastream-to-video-element-with-jssip-bad-media-description

var callOptions = {mediaConstraints: options.mediaConstraints};

ua.on("newRTCSession", function(data){
  rtcSession = data.session;
  session = rtcSession;
  if (rtcSession.direction === "incoming") {
    // incoming call here
    console.log(rtcSession);
    $('#SipPhoneIncomeBox').css({'top': '10px'});
    let ringAudio = document.getElementById('RingAudio');
    ringAudio.play();
    rtcSession.on('failed', function (e) {
      console.log('connecttion failed', e);
      /*
      var remoteAudio = document.getElementById("RemoteAudio");
      remoteAudio.pause();
      */
      ringAudio.pause();
      var audioControl = document.getElementById('AudioControl');
      audioControl.style.display = 'none';
      $('#SipPhoneIncomeBox').find('#IncomeBox').css({'display': 'block'});
      $('#SipPhoneIncomeBox').find('#AnswerBox').css({'display': 'none'});
      $('#SipPhoneIncomeBox').css({'top': '-65px'});
    });
  }
});

function doCall(evt){
  var msisdn = $('#Msisdn').val();
  if (msisdn !== '') {
    const phoneNoTHRegEx = /^[0]?[689]\d{8}$/;
    let isCorrectFormat = phoneNoTHRegEx.test(msisdn);
    if (!isCorrectFormat){
      doInputErrorHandle();
    } else {
      $('#Msisdn').css('border', '');
      session = ua.call(msisdn, options);
      console.log(session);
      session.connection.addEventListener('addstream', function (e) {
        // set remote audio stream
        //console.log(e);
        var remoteAudio = document.getElementById('RemoteAudio');
        remoteAudio.srcObject = e.stream;
        remoteAudio.play();
        var audioControl = document.getElementById('AudioControl');
        audioControl.style.display = 'block';
      });
    }
  } else{
    doInputErrorHandle();
  }
}

function doInputErrorHandle(){
  $('#Msisdn').css('border', '');
  $('#Msisdn').css('border', '1px solid red');
  alert('โทรศัพท์ สามารถปล่อยว่างได้ แต่ถ้ามี ต้องพิมพ์ให้ถูกต้องตามรูปแบบ 0xxxxxxxxx');
  return;
}

function doHangup(evt){
  if (session){
    console.log(session);
    session.terminate();
    document.getElementById('AudioControl').style.display = 'none';
    /*
    var remoteAudio = document.getElementById("RemoteAudio");
    remoteAudio.pause();
    remoteAudio.currentTime = 0;
    */
    //doClearTracks();
    $('#SipPhoneIncomeBox').find('#IncomeBox').css({'display': 'block'});
    $('#SipPhoneIncomeBox').find('#AnswerBox').css({'display': 'none'});
    $('#SipPhoneIncomeBox').css({'top': '-65px'});
  }
}

const doRejectCall = function(evt){
  doHangup(evt);
}

const doEndCall = function(evt){
  doHangup(evt);
}

const doAcceptCall = function(evt){
  rtcSession.on("accepted",function(e){
    // the call has answered
    console.log('onaccept', e);
  });
  rtcSession.on("confirmed",function(e){
    // this handler will be called for incoming calls too
    console.log('onconfirm', e);
    var from = e.ack.from._display_name;
    $('#Msisdn').val(from);
    $('#CallCmd').hide();
    $('#HangupCmd').show();
    /*
    var remoteAudio = document.getElementById("RemoteAudio");
    remoteAudio.pause();
    remoteAudio.currentTime = 0;
    */
    //doClearTracks();
  });
  rtcSession.on("ended",function(e){
    // the call has ended
    console.log('onended', e);
    //remoteAudio.srcObject = null;
    //doClearTracks();
    /*
    var remoteAudio = document.getElementById("RemoteAudio");
    remoteAudio.pause();
    remoteAudio.currentTime = 0;
    */
    var audioControl = document.getElementById('AudioControl');
    audioControl.style.display = 'none';

    $('#Msisdn').val('');
    $('#CallCmd').show();
    $('#HangupCmd').hide();
    //doHangup(e);

  });
  rtcSession.on("failed",function(e){
    // unable to establish the call
    console.log('onfailed', e);
    var audioControl = document.getElementById('AudioControl');
    audioControl.style.display = 'none';
    doClearTracks();
    $('#CallCmd').show();
    $('#HangupCmd').hide();
    //doHangup(e);
  });

  // Answer call
  //rtcSession.answer(callOptions);
  rtcSession.answer(options);

  rtcSession.connection.addEventListener('addstream', function (e) {
    var remoteAudio = document.getElementById("RemoteAudio");
    remoteAudio.srcObject = e.stream;
    var audioControl = document.getElementById('AudioControl');
    audioControl.style.display = 'block';
    setTimeout(() => {
      remoteAudio.play();
      $('#SipPhoneIncomeBox').find('#IncomeBox').css({'display': 'none'});
      $('#SipPhoneIncomeBox').find('#AnswerBox').css({'display': 'block'});
    }, 500);
  });
}

function doTestSendMessage(evt) {
  let text = 'Hello Bob!';
  console.log(text);
  let sendMessageEventHandlers = {
    'succeeded': function(evt){ console.log(evt); },
    'failed':    function(evt){ console.log(evt); }
  };

  let sendMessageOptions = {
    'eventHandlers': sendMessageEventHandlers
  };

  //let toUserUri = 'sip:2000@' + domainname;
  let toUserUri = '0835077746';
  ua.sendMessage(toUserUri, text, sendMessageOptions);
}

const doPlayRingIncomeCall = function(audioElem){
  audioElem.removeAttribute('src');
  audioElem.src = '/mp3/telephone-ring-04.mp3';
  audioElem.load();
  audioElem.addEventListener('ended', function() {
    this.currentTime = 0;
    this.play();
  }, false);
  setTimeout(() => {
    audioElem.play();
  }, 500);
}

const doClearTracks = function(){
  var remoteAudio = document.getElementById("RemoteAudio");
  var stream = remoteAudio.srcObject;
  if (stream){
    var tracks = stream.getTracks();
    if (tracks){
      tracks.forEach(function(track) {
        track.stop();
      });
    }
  }
}
