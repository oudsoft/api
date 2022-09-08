/*jquery-radutil-plugin.js*/
(function ( $ ) {

	const overlayStyle = { 'position': 'fixed', 'z-index': '43', 'left': '0', 'top': '0', 'width': '100%', 'height': '100%', 'overflow': 'auto', 'background-color': 'rgb(0,0,0)', 'background-color': 'rgba(0,0,0,0.4)'};
	const contentStyle = { 'background-color': '#fefefe', 'margin': '8% auto', 'padding': '10px', 'border': '1px solid #888', /*'min-width': '420px', 'max-width': '820px', 'font-family': 'THSarabunNew', */ 'font-size': '20px', 'line-height': '22px'};
  const cmdButtonStyle = {'padding': '3px', 'cursor': 'pointer', 'border': '1px solid white', 'color': 'white', 'background-color': 'blue'};

  const figgerIcon = $('<img src="/images/figger-right-icon.png" width="30px" height="auto"/>');

	const doCreateOverlay = function(){
		let overlay = $('<div></div>');
		$(overlay).css(overlayStyle);
		return $(overlay);
	}


	$.fn.screencenter = function ( options ) {
		var settings = $.extend({
			//
    }, options );

	  this.css("position","absolute");
	  this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) + $(window).scrollTop()) + settings.offset.y + "px");
	  this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) +  $(window).scrollLeft())  + settings.offset.x + "px");
	  return this;
	}

  $.fn.radalert = function( options ) {

    var settings = $.extend({
      title: '',
      msg: '',
      width: '520px',
      height: 'auto',
			okLabel: ' ตกลง ',
			cancelLabel: ' ยกเลิก '
    }, options );

    var $this = this;
    var alertBox = undefined;
    var overlay = undefined;
    var okCmd = undefined;
    var cancelCmd = undefined;

    const doCreateTitleBar = function(){
      let titleBar = $('<div style="position: relative; background-color: #184175; color: white; border: 2px solid grey; min-height: 28px;"></div>');
      let titleTextBox = $('<span style="display: inline-block; margin-left: 8px; margin-top: 6px;"></span>');
      $(titleTextBox).append(settings.title);
      //$(figgerIcon).css({'margin-top': '5px'})
      //return $(titleBar).append($(figgerIcon)).append($(titleTextBox));
			let closePopupCmd = $('<img data-toggle="tooltip" src="/images/cross-mark-icon.png" title="ปิดกล่อง" width="20" height="auto"/>');
			$(closePopupCmd).css({'position': 'relative', 'display': 'inline-block', 'float': 'right', 'padding': '2px'});
			$(closePopupCmd).css({'margin-right': '0px', 'cursor': 'pointer', 'border': '3px solid grey', 'background-color': 'white'});
			$(closePopupCmd).on('click', (evt)=>{
				$(cancelCmd).click();
			});
			return $(titleBar).append($(titleTextBox)).append($(closePopupCmd));
    }

    const doCreateMsgView = function(msg){
      let msgView = $('<div></div>');
      if (msg.jquery){
        $(msgView).append($(msg));
      } else {
        $(msgView).html(msg);
      }
      return $(msgView);
    }

    const doCreateCmdView = function(){
      let cmdBar = $('<div style="position: relative; width: 100%; padding: 4px; text-align: center;"></div>');
      okCmd = $('<input type="button" class="action-btn"/>');
			$(okCmd).val(settings.okLabel);
      cancelCmd = $('<input type="button"/>');
			$(cancelCmd).val(settings.cancelLabel)
      //$(okCmd).css({'background-color': '#2579B8', 'color': 'white', 'line-height': '26px'});
      $(cancelCmd).css({/* 'background-color': 'red', 'color': 'white' */});
      $(okCmd).on('click', function(evt){
        settings.onOk(evt);
        //doCloseAlert();
      });
      $(cancelCmd).on('click', function(evt){
        settings.onCancel(evt);
        doCloseAlert();
      });
      return $(cmdBar).append($(okCmd)).append($('<span>  </span>')).append($(cancelCmd));
    }

    const doCreateAlertBox = function(msg){
      alertBox = $('<div></div>');
      $(alertBox).css(contentStyle);
      $(alertBox).css({width: settings.width, height: settings.heigth});
      let titleBox = doCreateTitleBar();
      alertBox.append($(titleBox));
      let msgBox = doCreateMsgView(msg);
      alertBox.append($(msgBox));
      alertBox.append($('<hr/>'));
      let cmdBox = doCreateCmdView();
      alertBox.append($(cmdBox));
      return $(alertBox);
    }

    const init = function() {
      overlay = doCreateOverlay();
      let msgBox = doCreateAlertBox(settings.msg);
      $(overlay).append($(msgBox));
      return $(overlay);
    }

    const doCloseAlert = function(){
      if (overlay) {
        $(overlay).remove();
      }
    }

    let radalert = init();
    this.append($(radalert));

    /* public method of plugin */
    let output = {
      overlay: overlay,
      alertBox: alertBox,
      okCmd: okCmd,
      cancelCmd: cancelCmd,
      settings: settings,
      closeAlert: doCloseAlert,
			handle: radalert
    }

    return output;
  }

	$.fn.radprogress = function( options ) {
		var settings = $.extend({
			value: 0,
			apiname: '',
			style: {'font-size': '50px', 'color': 'white'}
    }, options );

    var $this = this;
		let overlay = undefined;
		let apiNameBox = undefined;
		let progressValueBox = undefined;
		let progressBox = undefined;

		const doCreateProgressBox = function(value){
			apiNameBox = $('<span id="ApiNameBar" style="color: white;">' + settings.apiname +'</span>');
			progressValueBox = $('<div id="ProgressValueBox">' + settings.value +'%</div>');
			progressBox = $('<div id="ProgressBox" style="text-align: center;"></div>');
			$(progressBox).append($(progressValueBox)).append($(apiNameBox));
			return $(progressBox);
		}

		const doUpdateProgressValue = function(newValue){
			settings.value = newValue;
			$(progressValueBox).text(settings.value + '%');
		}

		const init = function() {
      overlay = doCreateOverlay();
      let progressWrapperBox = doCreateProgressBox(settings.value);
			$(progressWrapperBox).find('#ProgressValueBox').css(settings.style);
      $(overlay).append($(progressWrapperBox));
      return $(overlay);
    }

    const doCloseProgress = function(){
      if (overlay) {
        $(overlay).remove();
      }
    }

    let radprogress = init();
    this.append($(radprogress));

		let output = {
			handle: this,
			progressValueBox: progressValueBox,
			progressBox: progressBox,
			doUpdateProgressValue: doUpdateProgressValue,
			doCloseProgress: doCloseProgress
    }

    return output;

	}

	$.fn.simplelog = function(dataPairObj, options){
		let settings = $.extend({
			//
    }, options );

    let $this = this;

		const doAppendLog = function(dataPairObj) {
		  let keyTags = Object.getOwnPropertyNames(dataPairObj);
		  for (let i=0; i<keyTags.length; i++) {
		    let logItem = $('<div style="width: 100%; border: 1px solid grey;"></div>');
		    let key = keyTags[i];
		    let value = dataPairObj[key]
		    let logKey = $('<span>' + key + '</span>');
		    $(logKey).css({'color': 'black'});
		    let logValue = $('<span>' + value + '</span>');
		    $(logValue).css({'color': 'blue'});
		    $(logItem).append($(logKey));
		    $(logItem).append($('<span> => </span>'));
		    $(logItem).append($(logValue));
				$this.append($(logItem));
		  }
			return $this;
		}

		return doAppendLog(dataPairObj);
	}

}( jQuery ));
