/* jqury-readystate-plugin.js */
(function ( $ ) {
  $.fn.readystate = function( options ) {

    var settings = $.extend({
      switchTextOnState: '',
      switchTextOffState: '',
      onActionCallback: undefined,
      offActionCallback: undefined
    }, options );

    var $this = this;
    var switchText = undefined;
    const onActionFromExternal = function() {
      $(readySwitch).find('input[type="checkbox"]').prop('checked', true);
      $(switchText).text(settings.switchTextOnState);
    }

    const offActionFromExternal = function() {
      $(readySwitch).find('input[type="checkbox"]').prop('checked', false);
      $(switchText).text(settings.switchTextOffState);
    }

    const doGetState = function(){
      let state = $(readySwitch).find('input[type="checkbox"]').prop('checked');
      return state;
    }

    const init = function(onAction, offAction) {
      let switchBox = $('<div></div>');
  		let toggleSwitch = $('<label class="switch"></label>');
  		let input = $('<input type="checkbox">');
  		let slider = $('<span class="slider"></span>');
  		$(toggleSwitch).append($(input));
  		$(toggleSwitch).append($(slider));
      switchText = $('<span style="margin-left: 5px; margin-top: 5px;"></span>');
  		$(input).on('click', (evt)=>{
  			let isOn = $(input).prop('checked');
  			if (isOn) {
  				onAction(evt);
          $(switchText).text(settings.switchTextOnState);
  			} else {
          offAction(evt);
          $(switchText).text(settings.switchTextOffState);
  			}
  		});
      return $(switchBox).append($(toggleSwitch)).append($(switchText));
    }

    /*
    pluginOption {
      onActionCallback
      offActionCallback
    }

    */

    const readySwitch = init(settings.onActionCallback, settings.offActionCallback);
    this.append($(readySwitch));

    /* public method of plugin */
    var output = {
      settings: $this.settings,
      readySwitch: readySwitch,
      onAction: onActionFromExternal,
      offAction: offActionFromExternal,
      getState: doGetState
    }

    return output;

  };
}( jQuery ));
