JsSIP.debug.disable('JsSIP:*');

var session = undefined;
var rtcSession = undefined;
var phoneCallHandle = undefined;

var userdata = JSON.parse(localStorage.getItem('userdata'));
if (!(userdata) || !(userdata.userinfo)){
  window.location.replace('/');
}

var username = userdata.userinfo.User_SipPhone;
var usersecret = userdata.userinfo.User_SipSecret;

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
  sockets: [ socket ],
  authorization_user: username,
  uri: 'sip:' + userUri,
  password: usersecret,
  ws_servers: socketUrl,
  realm: domainname,
  display_name: username,
  contact_uri: 'sip:' + userUri
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

ua.on("newRTCSession", function(data){
  rtcSession = data.session;
  session = rtcSession;
  if (rtcSession.direction === "incoming") {
    $('#SipPhoneIncomeBox').css({'top': '10px'});
    let ringAudio = document.getElementById('RingAudio');
    ringAudio.play();
    rtcSession.on('failed', function (e) {
      ringAudio.pause();
      var audioControl = document.getElementById('AudioControl');
      audioControl.style.display = 'none';
      $('#SipPhoneIncomeBox').find('#IncomeBox').css({'display': 'block'});
      $('#SipPhoneIncomeBox').find('#AnswerBox').css({'display': 'none'});
      $('#SipPhoneIncomeBox').css({'top': '-65px'});
    });
  }
});

if ((username) && (usersecret)) {
  ua.start();
}

var eventHandlers = {
  'progress': function(e) {
    console.log('call is in progress ...');
    //let callingNo = phoneCallHandle.getCallingNo();
    //phoneCallHandle.changeProgress(callingNo);
    phoneCallHandle.changeProgress();
  },
  'failed': function(e) {
    console.log('call failed with cause: ', e/*.data.cause*/);
  },
  'ended': function(e) {
    console.log('call ended with cause: ', e/*.data.cause*/);
    doClearTracks();
    var audioControl = document.getElementById('AudioControl');
    audioControl.style.display = 'none';
    phoneCallHandle.changeStart();
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

var callOptions = {mediaConstraints: options.mediaConstraints};

const doStartCallBack = function(msisdn){
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

const doEndCallBack = function(){
  doHangup();
}

const doHangup = function(evt){
  if (session){
    console.log(session);
    session.terminate();
    document.getElementById('AudioControl').style.display = 'none';
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
    console.log('onaccept', e);
  });
  rtcSession.on("confirmed",function(e){
    console.log('onconfirm', e);
  });
  rtcSession.on("ended",function(e){
    console.log('onended', e);
    var audioControl = document.getElementById('AudioControl');
    audioControl.style.display = 'none';
  });
  rtcSession.on("failed",function(e){
    // unable to establish the call
    console.log('onfailed', e);
    var audioControl = document.getElementById('AudioControl');
    audioControl.style.display = 'none';
    doClearTracks();
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
