//*editor-tools.js */

const doOpenEditor = function(fileURL){
  $('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/fabric.js"></script>');
  setTimeout(()=>{
  	$('head').append('<link href="https://radconnext.tech/lib/tui-image-editor.min.css" rel="stylesheet">');
  	$('head').append('<link href="https://radconnext.tech/lib/tui-color-picker.css" rel="stylesheet">');
  	$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/tui-code-snippet.min.js"></script>');
  	$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/tui-color-picker.js"></script>');
  	$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/tui-image-editor.min.js"></script>');
  	$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/simpleUpload.min.js"></script>');
  	$('head').append('<script type="text/javascript" src="https://radconnext.tech/setting/plugin/jqury-readystate-plugin.js"></script>');

  	$('head').append('<link rel="stylesheet" href="https://radconnext.tech/stylesheets/style.css" type="text/css" />');
  	//$('head').append('<script type="text/javascript" src="https://radconnext.tech/shop/lib/imageeditor.js?tt=mo9i456f"></script>');
    $('head').append('<script type="text/javascript" src="../lib/imageeditor.js?tt=mo78456f"></script>');
    setTimeout(()=>{
      let w = 470;
      let h = 720;
      var editorbox = $('<div id="EditorBox"></div>');
      $(editorbox).css({ 'position': 'absolute', 'width': '80%', 'min-height': '650px', 'background-color': '#fefefe', 'padding': '5px', 'border': '2px solid #888', 'z-index': '55', 'text-align': 'center', 'margin-left': '10%'});
      $(editorbox).css({ 'font-family': 'EkkamaiStandard', 'font-size': '18px'});
      $('body').append($(editorbox).css({'top': '10px'}));
      /*
      let previewPopup = $('<div id="PopupPreview"></div>');
      $(previewPopup).css({ 'position': 'absolute', 'z-index': '559', 'text-align': 'center', 'top': '4px'});
      $('body').append($(previewPopup));
      */
      $(editorbox).append($('<canvas id="CaptureCanvas" width="100%" height="auto" style="position: relative; display: none;"/>'));

      let canvas = document.getElementById('CaptureCanvas');
      let ctx =  canvas.getContext('2d');
      ctx.canvas.width = w;
      ctx.canvas.height = h;

      let pluginOption = {
        canvas: canvas,
        cWidth: w,
        cHeight: h,
        imageInit: fileURL,
        uploadApiUrl: '/api/shop/upload/share'
      };

      const myEditor = $(editorbox).imageeditor(pluginOption);
      $(editorbox).resizable({
        containment: 'parent',
        stop: function(evt) {
          $(this).css({'width': evt.target.clientWidth, 'height': evt.target.clientHeight});
        }
      });
      /*
      $(editorbox).draggable({
        containment: "parent",
        start: function(evt) {
          evt.stopPropagation();
        },
        stop: function(evt) {
          $(this).css({'min-height': '60px'});
        }
      });
      */
      $('body').css({'min-height': '1250px'});
    }, 1100);
  }, 1200);
}
