(function ( $ ) {
  $.fn.sipphoneincome = function( options ) {

    let settings = $.extend({
      onRejectCallCallback: undefined,
      onAcceptCallCallback: undefined,
      onEndCallCallback: undefined,
      ringSoundUrl: '/mp3/telephone-ring-04.mp3'
    }, options );

    let $this = this;

    let incomeRowHandle = undefined;
    let answerRowHandle = undefined;
    let ringAudio = undefined;
    let remoteAudio =undefined;

    const doGetIncomeRowHandle = function(){
      return $(incomeRowHandle);
    }

    const doGetAnswerRowHandle = function(){
      return $(answerRowHandle)
    }

    const doCreateIncomeCallRow = function(onRejectCallClick, onAcceptCallClick){
      let tableBox = $('<div id="IncomeBox" width="98%"></div>');
      let leftCol = $('<div style="width: 40%; text-align: center; float: left; clear: left;"></div>');
      let rightCol = $('<div style="width: 40%; text-align: center; float: right; clear: right;"></div>');
      let rejectCallCmd = $('<input type="button" value=" ไม่รับสาย "/>');
      let acceptCallCmd = $('<input type="button" value=" รับสาย "/>');
      $(rejectCallCmd).on('click', (evt)=>{
        ringAudio.pause();
        onRejectCallClick(evt);
      });
      $(acceptCallCmd).on('click', (evt)=>{
        ringAudio.pause();
        onAcceptCallClick(evt);
      });
      $(leftCol).append($(rejectCallCmd));
      $(rightCol).append($(acceptCallCmd));
      return $(tableBox).append($(leftCol)).append($(rightCol));
    }

    const doCreateCallAnswerRow = function(onEndCallClick){
      let tableBox = $('<div id="AnswerBox" style="width: 100%; text-align: center; display: none;"></div>');
      let endCallCmd = $('<input type="button" value=" วางสาย "/>');
      $(endCallCmd).on('click', (evt)=>{
        onEndCallClick(evt);
      });
      return $(tableBox).append($(endCallCmd));
    }

    const init = function(onRejectAction, onAcceptAction, onEndAction) {
      ringAudio = new Audio(settings.ringSoundUrl);
      ringAudio.id = 'RingAudio';
      ringAudio.addEventListener('ended', function() {
        this.currentTime = 0;
        this.play();
      }, false);

      remoteAudio = new Audio();
      remoteAudio.id = 'RemoteAudio';
      
      let sipPhoneBox = $('<div></div>');
      incomeRowHandle = doCreateIncomeCallRow(onRejectAction, onAcceptAction);
      answerRowHandle = doCreateCallAnswerRow(onEndAction);
      return $(sipPhoneBox).append($(incomeRowHandle)).append($(answerRowHandle)).append($(ringAudio)).append($(remoteAudio));
    }

    const sipPhone = init(settings.onRejectCallCallback, settings.onAcceptCallCallback, settings.onEndCallCallback);
    this.append($(sipPhone));

    /* public method of plugin */
    var output = {
      settings: $this.settings,
      getIncomeRowHandle: doGetIncomeRowHandle,
      getAnswerRowHandle: doGetAnswerRowHandle
    }

    return output;

  };
}( jQuery ));
