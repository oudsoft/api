/*jquery-phone-call-display-plugin.js*/
(function ( $ ) {

  $.fn.phonecalldisplay = function( options ) {

    var settings = $.extend({
      startCallHandle: undefined,
      endCallHandle: undefined,
      keyPressSoundUrl: '/mp3/button-35.mp3'
    }, options );

    var $this = this;
    var callingNo = undefined;

    const btnStyle = {'font-size': '200%', 'width': '80px', 'height': '80px', 'font' : 'normal 40pt Tahoma', 'border-radius':'5pt'};
    const displayStyle = {'font-size': '60px', 'width': '260px', 'height': '80px', 'text-align': 'right', 'border-radius': '5pt', 'color': 'black', 'background-color': '#EAEDED'};

    const doPlaySoundButtonKeyPress = function(){
      $('#RingAudio').remove();
      ringAudio = new Audio(settings.keyPressSoundUrl);
      ringAudio.id = 'RingAudio';
      $this.append($(ringAudio));
      ringAudio.load();
      setTimeout(() => {
        ringAudio.play();
      }, 100);
    }

    const onBtnNoClick = function(evt, display){
      doPlaySoundButtonKeyPress();
      let evtVal = $(evt.currentTarget).val();
      let currentVal = $(display).val();
      $(display).val(currentVal + evtVal);
    }

    const onBtnDELCmdClick = function(evt, display){
      let currentVal = $(display).val();
      let newVal = currentVal.slice(0, -1)
      $(display).val(newVal);
    }

    const onBtnTELCmdClick = function(evt, display){
      const phoneNoTHRegEx = /^[0]?[689]\d{8}$/;
      let msisdn = $(display).val();
      let isCorrectFormat = phoneNoTHRegEx.test(msisdn);
      if (!isCorrectFormat){
        doInputErrorHandle(display);
      } else {
        $(display).css('border', '');
        doSetCallingNo(msisdn);
        settings.startCallHandle(msisdn);
      }
    }

    const doInputErrorHandle = function(display){
      $(display).css('border', '1px solid red');
      alert('หมายเลขโทรศัพทไม่ถูกต้อง');
      return;
    }

    const onEndCallBtnCmdClick = function(evt, callDisplay){
      let msisdn = $(callDisplay).val();
      settings.endCallHandle(msisdn);
      setTimeout(()=>{
        doChangeStartDisplay();
      }, 650);
    }

    const onCallProgressDisplay = function(callNo){
      const callDisplay = $('<input type="text" id="CallDisplay" disabled></input>').css(displayStyle);
      $(callDisplay).val(callNo);
      const endCallBtnCmd = $('<input type="button" id="EndCallBtnCmd" value=""></input>').css(btnStyle);
      $(endCallBtnCmd).css({'background':'url(/images/phone-call-icon-3.png) no-repeat', 'background-size': '100% 100%'});
      $(endCallBtnCmd).on('click', (evt)=>{onEndCallBtnCmdClick(evt, callDisplay)});
      const avatarImageBox = $('<div style="width: 240px; height: auto; text-align: center;"></div>');
      $(avatarImageBox).append($('<img src="/images/user-account.png" width="80%" height="auto"/>'));
      const cellCallDisplay = $('<td aling="center"></td>').append($(callDisplay));
      const cellAvatarImage = $('<td aling="center"></td>').append($(avatarImageBox));
      const cellEndCallBtnCmd = $('<td aling="center"></td>').append($(endCallBtnCmd));
      const rowFrame1 =$('<tr></tr>').append($(cellCallDisplay));
      const rowFrame2 =$('<tr></tr>').append($(cellAvatarImage));
      const rowFrame3 =$('<tr></tr>').append($(cellEndCallBtnCmd));
      const mainFrame = $('<table></table>');
      return $(mainFrame).append($(rowFrame1)).append($(rowFrame2)).append($(rowFrame3));
    }

    const onStartCallDisplay = function(){
      const callDisplay = $('<input type="text" id="CallDisplay" disabled></input>').css(displayStyle);
      const callBtnNo1 = $('<input type="button" id="CallBtnNo1" value="1"></input>').css(btnStyle);
      $(callBtnNo1).on('click', (evt)=>{onBtnNoClick(evt, callDisplay)});
      const callBtnNo2 = $('<input type="button" id="CallBtnNo2" value="2"></input>').css(btnStyle);
      $(callBtnNo2).on('click', (evt)=>{onBtnNoClick(evt, callDisplay)});
      const callBtnNo3 = $('<input type="button" id="CallBtnNo3" value="3"></input>').css(btnStyle);
      $(callBtnNo3).on('click', (evt)=>{onBtnNoClick(evt, callDisplay)});
      const callBtnNo4 = $('<input type="button" id="CallBtnNo4" value="4"></input>').css(btnStyle);
      $(callBtnNo4).on('click', (evt)=>{onBtnNoClick(evt, callDisplay)});
      const callBtnNo5 = $('<input type="button" id="CallBtnNo5" value="5"></input>').css(btnStyle);
      $(callBtnNo5).on('click', (evt)=>{onBtnNoClick(evt, callDisplay)});
      const callBtnNo6 = $('<input type="button" id="CallBtnNo6" value="6"></input>').css(btnStyle);
      $(callBtnNo6).on('click', (evt)=>{onBtnNoClick(evt, callDisplay)});
      const callBtnNo7 = $('<input type="button" id="CallBtnNo7" value="7"></input>').css(btnStyle);
      $(callBtnNo7).on('click', (evt)=>{onBtnNoClick(evt, callDisplay)});
      const callBtnNo8 = $('<input type="button" id="CallBtnNo8" value="8"></input>').css(btnStyle);
      $(callBtnNo8).on('click', (evt)=>{onBtnNoClick(evt, callDisplay)});
      const callBtnNo9 = $('<input type="button" id="CallBtnNo9" value="9"></input>').css(btnStyle);
      $(callBtnNo9).on('click', (evt)=>{onBtnNoClick(evt, callDisplay)});
      const callBtnNo0 = $('<input type="button" id="CallBtnNo0" value="0"></input>').css(btnStyle);
      $(callBtnNo0).on('click', (evt)=>{onBtnNoClick(evt, callDisplay)});
      const callBtnTELCmd = $('<input type="button" id="CallBtnTELCmd" value=""></input>').css(btnStyle);
      $(callBtnTELCmd).css({'background':'url(/images/phone-call-icon-1.png) no-repeat', 'background-size': '100% 100%'});
      $(callBtnTELCmd).on('click', (evt)=>{onBtnTELCmdClick(evt, callDisplay)});
      const callBtnDELCmd = $('<input type="button" id="CallBtnDELCmd" value=""></input>').css(btnStyle);
      $(callBtnDELCmd).css({'background':'url(/images/back-slash-icon.png) no-repeat', 'background-size': '100% 100%'});
      $(callBtnDELCmd).on('click', (evt)=>{onBtnDELCmdClick(evt, callDisplay)});
      const cellCallDisplay = $('<td colspan="3" aling="center"></td>').append($(callDisplay));
      const cellCallBtnNo1 = $('<td aling="center"></td>').append($(callBtnNo1));
      const cellCallBtnNo2 = $('<td aling="center"></td>').append($(callBtnNo2));
      const cellCallBtnNo3 = $('<td aling="center"></td>').append($(callBtnNo3));
      const cellCallBtnNo4 = $('<td aling="center"></td>').append($(callBtnNo4));
      const cellCallBtnNo5 = $('<td aling="center"></td>').append($(callBtnNo5));
      const cellCallBtnNo6 = $('<td aling="center"></td>').append($(callBtnNo6));
      const cellCallBtnNo7 = $('<td aling="center"></td>').append($(callBtnNo7));
      const cellCallBtnNo8 = $('<td aling="center"></td>').append($(callBtnNo8));
      const cellCallBtnNo9 = $('<td aling="center"></td>').append($(callBtnNo9));
      const cellCallBtnNo0 = $('<td aling="center"></td>').append($(callBtnNo0));
      const cellCallBtnTELCmd = $('<td aling="center"></td>').append($(callBtnTELCmd));
      const cellCallBtnDELCmd = $('<td aling="center"></td>').append($(callBtnDELCmd));
      const rowFrame1 =$('<tr></tr>').append($(cellCallDisplay));
      const rowFrame2 =$('<tr></tr>').append($(cellCallBtnNo1)).append($(cellCallBtnNo2)).append($(cellCallBtnNo3));
      const rowFrame3 =$('<tr></tr>').append($(cellCallBtnNo4)).append($(cellCallBtnNo5)).append($(cellCallBtnNo6));
      const rowFrame4 =$('<tr></tr>').append($(cellCallBtnNo7)).append($(cellCallBtnNo8)).append($(cellCallBtnNo9));
      const rowFrame5 =$('<tr></tr>').append($(cellCallBtnTELCmd)).append($(cellCallBtnNo0)).append($(cellCallBtnDELCmd));;
      const mainFrame = $('<table></table>');
      return $(mainFrame).append($(rowFrame1)).append($(rowFrame2)).append($(rowFrame3)).append($(rowFrame4)).append($(rowFrame5));
    }

    const init = function() {
      return onStartCallDisplay();
    }

    const doChangeProgeesDisplay = function(){
      $this.empty();
      console.log(callingNo);
      let phoneProgressDisplay = onCallProgressDisplay(callingNo);
      $this.append($(phoneProgressDisplay));
    }

    const doChangeStartDisplay = function(){
      $this.empty();
      let phoneCallDisplay = onStartCallDisplay();
      $this.append($(phoneCallDisplay));
    }

    const doSetCallingNo = function(value){
      callingNo = value;
    }

    const doGetCallingNo = function(){
      return callingNo;
    }

    let phoneCallDisplay = init();
    this.append($(phoneCallDisplay));

    /* public method of plugin */
    let output = {
      changeProgress: doChangeProgeesDisplay,
      changeStart: doChangeStartDisplay,
      getCallingNo: doGetCallingNo
    }

    return output;
  }

}( jQuery ));
