/*jquery-report-element-plugin.js */
(function ( $ ) {
  $.fn.textelement = function( options ) {

    var settings = $.extend({
      // These are the defaults.
      elementType: 'text',
      type: "static",
      x: 0,
      y: 0,
      width: '140',
      height: '40',
      fontsize: 20,
      fontweight: 'normal',
      fontstyle: 'normal',
      fontalign: 'left'
    }, options );

    var $this = this;

    const doCreatetextElement = function(){
      let element = $('<div></div>');
      $(element).addClass("ui-widget-content");
      $(element).addClass("reportElement");
      $(element).addClass("textElement");
      $(element).css({"left": settings.x + "px", "top": settings.y + "px", "width": settings.width + "px", "height": settings.height + "px"});
      $(element).text(settings.title);
      $(element).draggable({
        containment: "parent",
        stop: function(evt) {
          setOption("x", evt.target.offsetLeft);
          setOption("y", evt.target.offsetTop);
          $(element).trigger("elementdrop", null, settings);
        }
      });
      $(element).on('click', function(e, ui) {
        $(element).trigger("elementselect", null, settings);
      });
      let elementData = {customTextelement: {options: settings}};
      $(element).data( "custom-textelement", elementData );

      return $(element);
    }

    const setOption = function(key, value){
      settings[key] = value;
    }

    const elementResizeStopEvt = function(evt, ui) {
      console.log(evt);
      console.log(ui);
      settings.width = evt.target.clientWidth;
      settings.height = evt.target.clientHeight;
      //$(textElement).trigger("elementresizestop", null, this.settings);
      settings.elementresizestop(evt, settings)
    }

    const init = function() {
      let textElement = doCreatetextElement();
      return $(textElement);
    }


    /*
    pluginOption {

    }

    */

    const textElement = init();
    this.append($(textElement));
    $(textElement).resizable({
      containment: "parent",
      stop: elementResizeStopEvt
    });

    /* public method of plugin */
    var output = {
      settings: $this.settings,
      elementHandle: textElement,
    }

    return output;

  };
}( jQuery ));
