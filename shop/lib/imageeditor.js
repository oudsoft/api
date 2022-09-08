/* imageeditor.js */
(function($) {
  $.fn.imageeditor = function( options ) {
    var settings = $.extend({
      cWidth: 100,
      cHeight: 100,
      //imageInit: 'https://radconnext.tech/shop/img/usr/myqr.png',
      imageInit: '',
      uploadApiUrl: '/api/shop/upload/share'
    }, options );

    const $this = this;

    let mainModal = undefined;
    let modalContent = undefined;
    let modalHeader = undefined;
    let modalFooter = undefined;

    let outputLink =undefined;

    const doSetOutputLink = function(value) {
      outputLink = value;
    }

    const doGetOutputLink = function(){
      return outputLink;
    }

    const cachedScript = function( url, options ) {
      options = $.extend( options || {}, {
        dataType: "script",
        cache: true,
        url: url
      });
      return $.ajax( options );
    }

    const doCreateImageEditor = function(imageData, maxWidth, maxHeight) {
      var createOptions = {
        includeUI: {
          menu: [/*'undo', 'redo', 'reset',*/ 'crop', 'rotate', 'draw', 'shape', 'icon', 'text'],
          initMenu: 'text',
          menuBarPosition: 'bottom',
          uiSize: {
            width: '100%',
            height: '500px'
          },
        },
        cssMaxWidth: maxWidth,
        cssMaxHeight: maxHeight,
        selectionStyle: {
          cornerSize: 20,
          rotatingPointOffset: 70
        }
      };
      if ((imageData) && (imageData !== '')) {
        createOptions.includeUI.loadImage = {path: imageData, name: 'Blank'};
      } else {
        createOptions.includeUI.loadImage = {name: 'Blank'};
      }
      var imageEditor = new tui.ImageEditor('#CaptureCanvasDiv', createOptions);
      return imageEditor;
    }

    const base64ToBlob = function (base64, mime) {
    	mime = mime || '';
    	var sliceSize = 1024;
    	var byteChars = window.atob(base64);
    	var byteArrays = [];
    	for (var offset = 0, len = byteChars.length; offset < len; offset += sliceSize) {
    		var slice = byteChars.slice(offset, offset + sliceSize);
    		var byteNumbers = new Array(slice.length);
    		for (var i = 0; i < slice.length; i++) {
    			byteNumbers[i] = slice.charCodeAt(i);
    		}
    		var byteArray = new Uint8Array(byteNumbers);
    		byteArrays.push(byteArray);
    	}
    	return new Blob(byteArrays, {type: mime});
    }

    const doImportImage = function(evt){
      let newImageUrl = prompt("Please enter image url", '');
      if (newImageUrl !== '') {
        $('#CaptureCanvasDiv').remove();
        let captureCanvasDiv = $('<div id="CaptureCanvasDiv" style="position: relative; margin-top: 0px; padding: 2px; width: 100%; height: auto;"></div>');
        $(captureCanvasDiv).append($(settings.canvas));
        $('#ModalContent').append($(captureCanvasDiv));

        let img = new Image();
        img.src = newImageUrl;
        img.onload = function() {
          let iWidth = this.width;
          let iHeight = this.height;

          let imageEditor = doCreateImageEditor(newImageUrl, settings.cWidth, settings.cHeight);
          settings.imageEditor = imageEditor;
          $('.tui-image-editor-header-logo').hide();
          let editorContentHeight = (settings.cHeight + 320);
          $(captureCanvasDiv).css({'height': editorContentHeight + 'px', 'top': '20px'});
        };

      }
    }

    const doSaveCaptureImage = function(e){
      const quickReplyDialogStyle = { 'position': 'fixed', 'z-index': '29', 'left': '0', 'top': '0', 'width': '100%', 'height': '100%', 'overflow': 'auto', 'background-color': 'rgb(0,0,0)', 'background-color': 'rgba(0,0,0,0.4)'};
      const quickReplyContentStyle = { 'background-color': '#fefefe', 'margin': '10% auto', 'padding': '20px', 'border': '1px solid #888', 'font-family': 'THSarabunNew', 'font-size': '20px' };

      let imageEditor = settings.imageEditor;
      var tuiCanvas = imageEditor._graphics.getCanvas();

      var dataURL = tuiCanvas.toDataURL("image/png", 1.0);

      var base64ImageContent = dataURL.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
      var blob = base64ToBlob(base64ImageContent, 'image/png');
      var formData = new FormData();
      formData.append('picture', blob);
      $.ajax({
        url: settings.uploadApiUrl,
        type: "POST",
        cache: false,
        contentType: false,
        processData: false,
        data: formData}).done(function(data){
          doSetOutputLink(data.link);
          console.log(data);
          window.open(data.shareLink, '_blank');
          doCreatePreviviewDialogBox(data.link, data.code);
        }
      );
    }

    const doCreatePreviviewDialogBox = function(imgLink, imgCode){
      let previewBox = $('<div style="width: 60%; padding: 5px;"></div>');
      let titleBar = $('<div style="position: relative; width: 100%;"></div>');
      let closeCmd = $('<span style="padding: 5px; background-color: red; color: white; cursor: pointer; float: right;">Close</span>')
      $(closeCmd).on('click', (evt)=>{
        $('#PopupPreview').removeAttr('style');
        $('#PopupPreview').empty();
        $('#PopupPreview').remove();
        //$(mainModal).remove();
        $('#EditorBox').remove();
      });
      /*
      let toggleCmd = $('<span style="padding: 5px; background-color: blue; color: white; cursor: pointer; float: right;">Main</span>')
      $(toggleCmd).on('click', (evt)=>{
        $this.show();
        $('#PopupPreview').removeAttr('style');
        $('#PopupPreview').empty();
      });
      */
      //$(titleBar).append($(toggleCmd)).append($(closeCmd));
      $(titleBar).append($(closeCmd));

      let imgSource = imgLink;
      let imgPreviewBox = $('<div style="width: 100%; text-align: center;"></div>');
      let imgPreview = $('<img/>');
      $(imgPreview).attr('src', imgSource);
      $(imgPreview).css({'width': '330px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'border': '2px solid red'});
      //let openUrl = 'https://radconnext.info/images/viewer/index.html?url=' + imgUrl;

      $(imgPreview).on('click', (evt)=>{
        /*
        var image = new Image();
        image.src = imgUrl;
        var w = window.open("");
        w.document.write(image.outerHTML);
        */
        window.open(imgSource, '_blank');
      });

      $(imgPreviewBox).append($(imgPreview));

      //let imgOutputLink = doGetOutputLink();
      //console.log(imgOutputLink);
      let lineShareIconCmd = $('<img src="/images/wide-default.png" style="cursor: pointer; margin-left: 10px; width: 100px; height: auto;"/>');
      let id = imgCode;
      let myLiffUrl = 'https://liff.line.me/1655999531-z5xnKvpR?id=' + id;
      let lineShareContent = $('<a href="https://social-plugins.line.me/lineit/share?url=' + myLiffUrl +'"></a>');
      $(lineShareContent).append($(lineShareIconCmd));
    	let linsSocialScript = $('<script src="https://d.line-scdn.net/r/web/social-plugin/js/thirdparty/loader.min.js" async="async" defer="defer"></script>');
      let lineShareBox = $('<div style="text-align: center; margin-top: 10px;"></div>');
      $(lineShareBox).append($(lineShareContent)).append($(linsSocialScript));

      return $(previewBox).append($(titleBar)).append($(imgPreviewBox)).append($(lineShareBox));

      //return $(previewBox).append($(titleBar)).append($(imgPreviewBox));

    }

    const init = function() {
      mainModal = $('<div style="position: relative; width: 100%; height: auto;"></div>');
      modalContent = $('<div id ="ModalContent" style="position: relative; width: 100%;"></div>');
      $(mainModal).append($(modalContent));
      modalHeader = $('<div id ="ModalHeader" style="text-align: center; padding: 4px; border: 2px solid blue; background-color: #BBCBFC"></div>');

      let modalTitle = $('<h3 id="dialog-title">Your Image Editor</h3>');
      $(modalHeader).append($(modalTitle));
      $(modalContent).append($(modalHeader));

      let captureCanvasDiv = $('<div id="CaptureCanvasDiv" style="position: relative; margin-top: 0px; padding: 2px; width: 100%; height: auto;"></div>');
      $(captureCanvasDiv).append($(settings.canvas));
      $(captureCanvasDiv).on('click', (evt)=>{
        evt.stopPropagation();
      });
      $(modalContent).append($(captureCanvasDiv));

      if ((settings.imageInit) && (settings.imageInit !== '')) {
        ///
      } else {
        settings.imageInit = '../../images/tools-icon-wh.png';
      }

      let img = new Image();
      img.src = settings.imageInit;
      img.onload = function() {
        let iWidth = this.width;
        let iHeight = this.height;
        let imageEditor = doCreateImageEditor(settings.imageInit, settings.cWidth, settings.cHeight);
        settings.imageEditor = imageEditor;
        $('.tui-image-editor-header-logo').hide();
        let editorContentHeight = (settings.cHeight + 320);
        $(captureCanvasDiv).css({'height': editorContentHeight + 'px', 'top': '20px'});
      };

      modalFooter = $('<div id="ModalFooterBar" style="position: relative; width: 100%; height: auto; text-align: center; padding: 4px; border: 2px solid blue; background-color: #BBCBFC; margin-top: 10px; height: 42px;"></div>');
      $(modalContent).append($(modalFooter));

      let importCmd = $('<input type="button" id="SaveEdit-Cmd" value=" Import " style="height: 38px;"/>');
      $(importCmd).appendTo($(modalFooter));
      $(importCmd).on('click', (evt)=>{ doImportImage(evt) });

      let saveCmd = $('<input type="button" id="SaveEdit-Cmd" value=" Save & Share " style="height: 38px; margin-left: 10px;"/>');
      $(saveCmd).appendTo($(modalFooter));
      $(saveCmd).on('click', (evt)=>{
        doSaveCaptureImage(evt);
      });
      let clearCmd = $('<input type="Button" value=" Clear " style="height: 38px; margin-left: 10px;"/>');
      $(clearCmd).appendTo($(modalFooter));
      $(clearCmd).on('click', (evt)=>{
        let imageEditor = settings.imageEditor;
        var tuiCanvas = imageEditor._graphics.getCanvas();
        let context = tuiCanvas.getContext('2d');
        context.clearRect(0, 0, tuiCanvas.width, tuiCanvas.height);
      });

      let downloadCmd = $('<input type="Button" value=" Download " style="height: 38px; margin-left: 10px;"/>');
      $(downloadCmd).appendTo($(modalFooter));
      $(downloadCmd).on('click', (evt)=>{
        let imageEditor = settings.imageEditor;
        var tuiCanvas = imageEditor._graphics.getCanvas();
        var dataURL = tuiCanvas.toDataURL("image/png", 1.0);
        var base64ImageContent = dataURL.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
        var blob = base64ToBlob(base64ImageContent, 'image/png');
        var reader = new FileReader();
        reader.onloadend = function(event) {
          let localFilename = JSON.parse(localStorage.getItem('lastFilename'));
          let lastFilename = undefined;
          if (!localFilename) {
            lastFilename = 'download-01';
          } else {
            lastFilename = localFilename.name;
          }
          let fileName = prompt("ชื่อไฟล์", lastFilename);
          if (fileName !== '') {
            localStorage.setItem('lastFilename', JSON.stringify({name: fileName}));
            let pom = document.createElement('a');
            pom.setAttribute('target', "_blank");
            pom.setAttribute('href', reader.result);
            pom.setAttribute('download', fileName + '.png');
            pom.click();
          }
        };
        reader.readAsDataURL(blob);
      });

      let closeCmd = $('<input type="Button" value=" Close " style="height: 38px; margin-left: 10px;"/>');
      $(closeCmd).appendTo($(modalFooter));
      $(closeCmd).on('click', (evt)=>{
        //$(mainModal).remove();
        $('#EditorBox').remove();
      });

      return $(mainModal);
    }

    /*
    pluginOption {
    }
    */

    let editor = init();
    this.empty().append($(editor));

    /* public method of plugin */
    var output = {
      settings: settings,
      handle: this,
      setOutputLink: doSetOutputLink,
      getOutputLink: doGetOutputLink
    }

    return output;

  };


})(jQuery);
