//https://learn.jquery.com/jquery-ui/widget-factory/how-to-use-the-widget-factory/
$.widget( "custom.iconitem", {
  options: {
    elementType: 'icon',
    left: 0,
    top: 0,
    width: '30',
    height: 'auto',
    imgUrl: '',
    cursor: 'pointer',
    padding: '5px'
  },
  _setOption: function( key, value ) {
    this.options[key] = value;
    this._super( key, value );
  },
  _setOptions: function( options ) {
    this._super( options );
    let $this = this;
    this.render($this);
  },
  _create: function() {
    let $this = this;
    this.render($this);
  },
  render: function(me) {
    this.element.empty();
    let icoDiv = $('<div></div>');
		$(icoDiv).css({'float': 'left'});

		let hsIcon = new Image();
    hsIcon.src = this.options.imgUrl;
    $(hsIcon).css({"width": this.options.width, "height": this.options.height, "border": this.options.border, "cursor": this.options.cursor, "padding": this.options.padding});
    $(hsIcon).css({'border': '4px solid #ddd', 'border-radius': '5px', 'margin': '4px'});
    $(hsIcon).prop('data-toggle', 'tooltip');
    $(hsIcon).prop('title', this.options.toggleTitle);
    $(hsIcon).hover(()=>{
      $(hsIcon).css({'border': '4px solid grey'});
    },()=>{
      $(hsIcon).css({'border': '4px solid #ddd'});
    });
    $(hsIcon).on("click", function(e){
      me.options.onClick(e);
		});
    $(icoDiv).append($(hsIcon));

    this.element.append($(icoDiv));
  }
});

const validImageTypes = ['image/gif', 'image/jpeg', 'image/png'];

$.widget( "custom.imageitem", {
  options: {
    elementType: 'image',
    left: 0,
    top: 0,
    width: '100',
    height: 'auto',
    imgUrl: '',
    border: '1px solid red',
    cursor: 'pointer'
  },
  _setOption: function( key, value ) {
    this.options[key] = value;
    this._super( key, value );
  },
  _getOption: function( key ) {
    return this.options[key];
  },
  _setOptions: function( options ) {
    this._super( options );
    let $this = this;
    this.render($this);
  },
  _getOptions: function(){
    return this.options;
  },
  _create: function() {
    let $this = this;
    this.render($this);
  },
  option: function( key ){
    return this._getOption(key);
  },
  render: function(me) {
    let $this = this;
    this.element.empty();
    let imgDiv = $('<div></div>');
		$(imgDiv).css({'float': 'left'});

		let hsImage = new Image();
    if (this.options.fileType) {
      if (!validImageTypes.includes(this.options.fileType)) {
        if (this.options.fileType.toUpperCase() === 'APPLICATION/PDF') {
          hsImage.src = 'https://radconnext.info/images/pdf-icon.png';
        } else if ((this.options.fileType.toUpperCase() === 'APPLICATION/ZIP') || (this.options.fileType.toUpperCase() === 'APPLICATION/X-ZIP-COMPRESSED')) {
          hsImage.src = 'https://radconnext.info/images/zip-icon.png';
        } else {
          console.log(this.options.fileType);
          hsImage.src = 'https://radconnext.info/images/otherfile-icon.png';
        }
      } else {
        hsImage.src = this.options.imgUrl;
      }
    } else {
      hsImage.src = this.options.imgUrl;
    }

    $(hsImage).css({"width": this.options.width, "height": this.options.height, "border": this.options.border, "cursor": this.options.cursor});
    $(hsImage).on("click", function(e){
			window.open($this.options.imgUrl, '_blank');
		});
    $(imgDiv).append($(hsImage));

    let removeLink = $('<span>x</span>').css({'cursor': 'pointer', 'font-size': '30px'});
		$(removeLink).addClass('remove');
		$(removeLink).on("click", function(e){
			//$(imgDiv).remove();
      me.options.onRemoveClick(e, imgDiv);
		});
		$(imgDiv).append($(removeLink));

    this.element.append($(imgDiv));

    this.element.trigger('newpatienthistoryimage');
  }
});

let imagehistory;
const videoConstraints = {video: {displaySurface: "application", height: 1080, width: 1920 }};

$.widget( "custom.imagehistory", {
  options: {
    elementType: 'history',
    left: 0,
    top: 0,
    width: '200',
    height: 'auto',
    border: '2px solid blue',
  },
  _setOption: function( key, value ) {
    this.options[key] = value;
    this._super( key, value );
  },
  _setOptions: function( options ) {
    this._super( options );
    let $this = this;
    this.render($this);
  },
  _create: function() {
    imagehistory = this;
    let $this = this;
    this.render($this);
  },
  cachedScript: function( url, options ) {
    options = $.extend( options || {}, {
      dataType: "script",
      cache: true,
      url: url
    });
    return $.ajax( options );
  },
  render: function(me) {
    this.element.empty();
    this.element.data({images: []})
    let iconCmdDiv = $('<div id="IconCmdDiv" style="width: 100%; position: relative;"></div>');
    let imageListDiv = $('<div id="ImageListDiv" style="width: 100%; position: relative;"></div>');
    this.element.append($(iconCmdDiv));
    this.element.append($(imageListDiv));
    let uploadIconProp = {
      /* imgUrl: '/images/attach-icon.png', */
      imgUrl: this.options.attachFileUploadIconUrl,
      toggleTitle: this.options.attachFileToggleTitle,
      onClick: function(e){me.uploadClick(e, imageListDiv)}
    };
    let uploadIconCmd = $( "<div></div>" ).appendTo($(iconCmdDiv)).iconitem( uploadIconProp );
    let scannerIconProp = {
      /* imgUrl: '/images/scanner-icon.png', */
      imgUrl: this.options.scannerUploadIconUrl,
      toggleTitle: this.options.scannerUploadToggleTitle,
      onClick: function(e){me.scannerClick(e, imageListDiv)}
    };
    let scannerIconCmd = $( "<div></div>" ).appendTo($(iconCmdDiv)).iconitem( scannerIconProp );
    let captureIconProp = {
      /* imgUrl: '/images/screen-capture-icon.png', */
      imgUrl: this.options.captureUploadIconUrl,
      toggleTitle: this.options.captureUploadToggleTitle,
      onClick: function(e){me.captureClick(e, imageListDiv)}
    };
    let captureIconCmd = $( "<div></div>" ).appendTo($(iconCmdDiv)).iconitem( captureIconProp );
    //this._setOption('doUploadBlob', this.doUploadBlob);
    this.options.doUploadBlob = this.doUploadBlob;
  },
  uploadClick: function(e, imageListBox){
    let $this = this;
    let simpleUploadPluginUrl = "https://radconnext.info/lib/simpleUpload.min.js";
		this.cachedScript( simpleUploadPluginUrl ).done(function( script, textStatus ) {
      $this.doOpenSelectFile(imageListBox);
		});
  },
  doOpenSelectFile: function (imageListBox){
    let $this = this;
    let fileBrowser = $('<input type="file"/>');
    $(fileBrowser).attr("multiple", true);
    $(fileBrowser).css('display', 'none');
    $(fileBrowser).on('change', function(e) {
      const defSize = 100000000;
      let fileSize = e.currentTarget.files[0].size;
      let fileType = e.currentTarget.files[0].type;
      if ((fileType.toUpperCase() === 'APPLICATION/ZIP') || (fileType.toUpperCase() === 'APPLICATION/X-ZIP-COMPRESSED')) {
        if (fileSize <= defSize*100) {
          $(fileBrowser).attr("name", 'archiveupload');
          $this.doUploadImage(fileBrowser, imageListBox, fileType);
        } else {
          $(imageListBox).append('<div>' + 'File not excess ' + defSize + ' Byte.' + '</div>');
        }
      } else {
        if (fileSize <= defSize) {
          $(fileBrowser).attr("name", 'patienthistory');
          $this.doUploadImage(fileBrowser, imageListBox, fileType);
        } else {
          $(imageListBox).append('<div>' + 'File not excess ' + defSize + ' Byte.' + '</div>');
        }
      }
    });
    $(fileBrowser).appendTo($(imageListBox));
    $(fileBrowser).click();
  },
  doUploadImage: function(fileBrowser, imageListBox, fileType) {
    let $this = this;
    let uploadUrl = $this.options.attachFileUploadApiUrl;
    if ((fileType.toUpperCase() === 'APPLICATION/ZIP') || (fileType.toUpperCase() === 'APPLICATION/X-ZIP-COMPRESSED')) {
      uploadUrl = 'https://radconnext.info/api/transfer/archive';
    }
    $(fileBrowser).simpleUpload(uploadUrl, {
      success: function(data){
        console.log(data);
        $(fileBrowser).remove();
        setTimeout(() => {
          if (window.location.hostname == 'localhost') {
            let dwnLink = undefined;
            if ((fileType.toUpperCase() === 'APPLICATION/ZIP') || (fileType.toUpperCase() === 'APPLICATION/X-ZIP-COMPRESSED')) {
              dwnLink = 'https://radconnext.info' + data.archive.link;
            } else {
              dwnLink = 'https://radconnext.info' + data.link;
            }
            data.link = dwnLink;
          }
          $this.doAppendNewImageData(data);
          let uploadImageProp = {
            fileType: fileType,
            imgUrl: data.link,
            onRemoveClick: function(e, imgDiv){$this.doRemoveImage(e, data.link, imgDiv)}
          };
          $( "<div></div>" ).appendTo($(imageListBox)).imageitem( uploadImageProp );
        }, 400);
      },
    });
  },
  doAppendNewImageData: function(data){
    let $this = this;
    let oldData = $this.element.data();
    if (oldData) {
      if (oldData.images.length) {
        oldData.images.push({link: data.link, instanceId: data.instanceId});
      } else {
        oldData.images = [];
        oldData.images.push({link: data.link, instanceId: data.instanceId});
      }
    } else {
      oldData.images = [];
      oldData.images.push({link: data.link, instanceId: data.instanceId});
    }
    $this.element.data(oldData);
    //console.log($this.element.data());
  },
  doRemoveImage: function(e, imgLink, imageDiv){
    let $this = this;
    let data = this.element.data();
    let newData = data.images.filter((item) => {
      return (item.link !== imgLink)
    })
    this.element.data({images: newData});
    //console.log($this.element.data());
    $(imageDiv).remove();
  },
  scannerClick: function(e, imageListBox){
    let $this = this;
    let scannerPluginUrl = "https://radconnext.info/lib/scanner.js";
    this.cachedScript( scannerPluginUrl ).done(function( script, textStatus ) {
      scanner.scan($this.displayImagesOnPage, {
				"use_asprise_dialog": false,
        "output_settings": [{"type": "return-base64", "format": "jpg" }]
      });
    });
  },
  displayImagesOnPage: function(successful, mesg, response) {
    let $this = imagehistory;
    //console.log('response==> ', response);
    if(!successful) { // On error
      console.error('Failed: ' + mesg);
      return;
    }

    if(successful && mesg != null && mesg.toLowerCase().indexOf('user cancel') >= 0) { // User cancelled.
      console.info('User cancelled');
      return;
    }

    let scannedImages = scanner.getScannedImages(response, true, false); // returns an array of ScannedImage
    let imageData = scannedImages[scannedImages.length - 1].src;
    let params = {image: imageData};
    //let uploadImageUrl = "/api/scannerupload";
    let uploadImageUrl = $this.options.scannerUploadApiUrl;
    $.post(uploadImageUrl, params, function(data){
      if (window.location.hostname == 'localhost') {
        data.link = 'https://radconnext.info' + data.link;
      }
      setTimeout(()=>{
        $this.doAppendNewImageData(data);
        let uploadImageProp = {
          imgUrl: data.link,
          onRemoveClick: function(e, imgDiv){$this.doRemoveImage(e, data.link, imgDiv)}
        };
        $( "<div></div>" ).appendTo($("#ImageListDiv")).imageitem( uploadImageProp );
      }, 400);
    });
  },
  images: function(data){
    let $this = this;
    if (data) {
      this.doAppendNewImageData(data)
      let uploadImageProp = {
        imgUrl: data.link,
        onRemoveClick: function(e, imgDiv){$this.doRemoveImage(e, data.link, imgDiv)}
      };
      $( "<div></div>" ).appendTo(this.element.find("#ImageListDiv")).imageitem( uploadImageProp );
      return;
    }

    let allData = this.element.data();
    return allData.images;
  },

  /* Screen Capture Section */
  doLoadEditorPlugin: function(){
    let $this = this;
    return new Promise(async function(resolve, reject) {
      let fabricUrl = "https://radconnext.info/lib/fabric.js"
      let codeSnippetUrl = "https://radconnext.info/lib/tui-code-snippet.min.js"
      let colorPickerUrl = "https://radconnext.info/lib/tui-color-picker.js"
      let tuiEditorPluginUrl = "https://radconnext.info/lib/tui-image-editor.min.js";
      let fubric = await $this.cachedScript(fabricUrl);
      let codeSnippet = await $this.cachedScript(codeSnippetUrl);
      let colorPicker = await $this.cachedScript(colorPickerUrl);
      let tuiEditorPlugin = await $this.cachedScript(tuiEditorPluginUrl);
      resolve();
    });
  },
  openDisplayMedia: function(successCallback, errorCallback){
    return new Promise(function(resolve, reject) {
      if(navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia(videoConstraints).then(successCallback).catch(errorCallback);
      } else {
        navigator.getDisplayMedia(videoConstraints).then(successCallback).catch(errorCallback);
      }
      resolve();
    });
  },
  captureClick: async function(e, imageListBox){
    let $this = this;
    await this.openDisplayMedia(this.invokeGetDisplayMedia, this.doGetScreenSignalError);
    await this.doLoadEditorPlugin();
  },
  doGetScreenSignalError: function(e){
    var error = {
  		name: e.name || 'UnKnown',
  		message: e.message || 'UnKnown',
  		stack: e.stack || 'UnKnown'
  	};

  	if(error.name === 'PermissionDeniedError') {
  		if(location.protocol !== 'https:') {
  			error.message = 'Please use HTTPs.';
  			error.stack   = 'HTTPs is required.';
  		}
  	}

  	console.error(error.name);
  	console.error(error.message);
  	console.error(error.stack);

  	//alert('Unable to capture your screen.\n\n' + error.name + '\n\n' + error.message + '\n\n' + error.stack);
  },
  invokeGetDisplayMedia: (stream) => {
    let $this = imagehistory;
    $("body").append($('<video id="CaptureVideo" width="520" height="290" autoplay/>'));
    $("body").append($('<canvas id="CaptureCanvas" width="100%" height="auto"/>'));
		let canvas = document.getElementById('CaptureCanvas');
		let video = document.getElementById('CaptureVideo');
		let ctx =  canvas.getContext('2d');
		let vw, vh;

    stream.getTracks().forEach(function(track) {
  		track.addEventListener('ended', function() {
  			console.log('Stop Stream.');
  		}, false);
  	});

    video.srcObject = stream;

    video.addEventListener( "loadedmetadata", function (e) {
      let $this = imagehistory;
      //console.log(this.videoWidth, this.videoHeight);
      vw = this.videoWidth;
      vh = this.videoHeight;
      video.width = vw;
      video.height = vh;

      ctx.canvas.width = vw;
      ctx.canvas.height = vh;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      var dataURL = canvas.toDataURL("image/jpeg", 1.0);
      let modalDialog = $this.doCreateModalDialog();
      $(modalDialog).appendTo('body');
      $(modalDialog).show();

      $('#CaptureCanvasDiv').append($(canvas));

      let imageEditor = $this.doCreateImageEditor(dataURL);

      $this._setOption('modalDialog', modalDialog);
      $this._setOption('imageEditor', imageEditor);

      setTimeout(() => {
        $('.tui-image-editor-header-logo').hide();
  			var tuiCanvas = imageEditor._graphics.getCanvas();
  			$('#CaptureCanvasDiv').css('height', Number(tuiCanvas.height) + 120);

        if (video.srcObject){
    			video.srcObject.getTracks().forEach(function(track) {
    				track.stop();
    			});
    			video.srcObject = null;
          $('#CaptureVideo').remove();
    		}
      }, 500);

    }, false );
  },
  doCreateModalDialog: function(){
    let $this = this;
    let mainModal = $('<div id="main-dialog" class="modal"></div>');
    let modalContent = $('<div class="modal-content"></div>');
    $(modalContent).appendTo($(mainModal));
    let modalHeader = $('<div class="modal-header"></div>');
    let modalTitle = $('<h3 id="dialog-title">Screen Capture</h3>');
    $(modalTitle).appendTo($(modalHeader));
    $(modalHeader).appendTo($(modalContent));
    let captureCanvasDiv = $('<div id="CaptureCanvasDiv" style="margin-top: 5px; padding: 5px; border: 2px solid gray;"></div>');
    $(captureCanvasDiv).appendTo($(modalContent));
    let modalFooter = $('<div class="modal-footer"></div>');
    $(modalFooter).appendTo($(modalContent));
    //let saveCmd = $('<input type="button" id="SaveEdit-Cmd" value=" Save Image " style="display: none;"/>');
    let saveCmd = $('<input type="button" id="SaveEdit-Cmd" value=" Save Image "/>');
    $(saveCmd).appendTo($(modalFooter));
    $(saveCmd).on('click', (e)=>{ $this.doSaveCaptureImage(e) });
    let downloadCmd = $('<input type="button" id="DownloadEdit-Cmd" value=" Download Image "/>');
    $(downloadCmd).appendTo($(modalFooter));
    $(downloadCmd).on('click', (e)=>{ $this.doDownloadCaptureImage(e) });
    let closeCmd = $('<input type="Button" value=" Cancel "/>');
    $(closeCmd).appendTo($(modalFooter));
    $(closeCmd).on('click', (e)=>{$(mainModal).remove()});
    return $(mainModal);
  },
  doCreateImageEditor: function(imageData) {
    var imageEditor = new tui.ImageEditor('#CaptureCanvasDiv', {
      includeUI: {
        loadImage: {
          path: imageData,
          name: 'Blank'
        },
        menu: [/*'undo', 'redo', 'reset',*/ 'crop', 'rotate', 'draw', 'shape', 'icon', 'text'],
        initMenu: 'text',
        menuBarPosition: 'bottom'
      },
      cssMaxWidth: 700,
      cssMaxHeight: 700,
      selectionStyle: {
        cornerSize: 20,
        rotatingPointOffset: 70
      }
    });
    return imageEditor;
  },
  base64ToBlob: function (base64, mime) {
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
  },

  doSaveCaptureImage: function(e){
    let $this = imagehistory;
    let imageEditor = $this.options.imageEditor;
    var tuiCanvas = imageEditor._graphics.getCanvas();

    var dataURL = tuiCanvas.toDataURL("image/jpeg", 1.0);

    var base64ImageContent = dataURL.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
    //var base64ImageContent = dataURL.replace("image/jpg", "image/octet-stream");
    var blob = $this.base64ToBlob(base64ImageContent, 'image/jpg');

    $this.doUploadBlob(blob).then(function(data){
      let context = tuiCanvas.getContext('2d');
      context.clearRect(0, 0, tuiCanvas.width, tuiCanvas.height);
    });
  },
  doUploadBlob: function(blob, type='image') {
    return new Promise(function(resolve, reject) {
      let $this = imagehistory;
      let formData = new FormData();
      let uploadUrl = undefined;
      let fileType = undefined;
      if (type === 'image') {
        formData.append('picture', blob);
        uploadUrl = $this.options.captureUploadApiUrl;
        fileType = 'image/jpeg';
      } else if (type === 'pdf') {
        formData.append('picture', blob);
        uploadUrl = $this.options.captureUploadApiUrl;
        fileType = 'application/pdf';
      } else if (type === 'zip') {
        formData.append('archiveupload', blob);
        uploadUrl = 'https://radconnext.info/api/transfer/archive';
        fileType = 'application/zip';
      }
      $.ajax({
        url: uploadUrl,
        type: "POST",
        cache: false,
        contentType: false,
        processData: false,
        data: formData}).done(function(data){
          if (window.location.hostname == 'localhost') {
            let dwnLink = undefined;
            if (type === 'zip') {
              dwnLink = 'https://radconnext.info' + data.archive.link;
            } else {
              dwnLink = 'https://radconnext.info' + data.link;
            }
            data.link = dwnLink;
          }
          setTimeout(()=>{
            $this.doAppendNewImageData(data);
            let uploadImageProp = {
              imgUrl: data.link,
              fileType: fileType,
              onRemoveClick: function(e, imgDiv){$this.doRemoveImage(e, data.link, imgDiv)}
            };
            $( "<div></div>" ).appendTo($("#ImageListDiv")).imageitem( uploadImageProp );
            $('#main-dialog').remove();
            resolve(data);
          }, 400);
        }
      );
    });
  },
  doDownloadCaptureImage: function(e){
    let $this = imagehistory;
    let imageEditor = $this.options.imageEditor;
    var tuiCanvas = imageEditor._graphics.getCanvas();

    //var dataURL = tuiCanvas.toDataURL('image/jpeg', 1.0);
    //var base64ImageContent = dataURL.replace("/^data:image/png;base64,/", "");
    var dataURL = tuiCanvas.toDataURL();
    var blob = dataURItoBlob(dataURL);
    const file = new File([blob], 'edited-4you.jpg', {
      type: "image/jpeg",
      lastModified: new Date(),
    });

    var fr = new FileReader();

    fr.onload = function(evt){
       document.body.innerHTML = evt.target.result + "<br><a href="+URL.createObjectURL(file)+" download=" + file.name + ">Download " + file.name + "</a><br>type: "+file.type+"<br>last modified: "+ file.lastModifiedDate
    }

    fr.readAsDataURL(file);
    //debugBase64(file);
    function debugBase64(base64URL){
      var win = window.open();
      win.document.write('<iframe src="' + base64URL  + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
    }
    function dataURItoBlob(dataURI) {
      var byteString = window.atob(dataURI.split(",")[1]);
      var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
      var ab = new ArrayBuffer(byteString.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mimeString });
    }
  }
});
