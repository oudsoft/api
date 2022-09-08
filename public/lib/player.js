/* player.js */

(function($) {

  File.prototype.toObject = function () {
    return Object({
    lastModified: parseInt(this.lastModified),
    lastModifiedDate: String(this.lastModifiedDate),
    name: String(this.name),
    size: parseInt(this.size),
    type: String(this.type)
    })
  }

  FileList.prototype.toArray = function () {
    return Array.from(this).map(function (file) {
      return file.toObject()
    })
  }

  $.fn.player = function( options ) {
    var settings = $.extend({
      imgSize: '330',
      timeDelay: 7,
    }, options );

    const $this = this;
    const clipURL = window.URL;
    const pluginUrl = 'https://' + window.location.hostname;;

    let timer = undefined;
    let selectedFiles = undefined;
    let isAutoPlay = false;
    let imageViewMode = 'preview';
    let fullScreenMode = false;

    let recordSwitch = undefined;
    let imgCanvas = undefined;

    let playerMainBox = undefined;
    let playerCmdBox = undefined;
    let playerViewBox = undefined;

    const doCreateNextCmd = function(){
      let nextImgCmd = $('<img id="NextCmd" data-toggle="tooltip" title="Next"/>');
      $(nextImgCmd).attr('src', pluginUrl + '/images/next-cmd-icon.png');
      $(nextImgCmd).css({'position': 'relative', 'width': '30px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '10px', 'margin-left': '10px'});
      $(nextImgCmd).on('click', (evt)=>{
        doShowNextImage();
      });
      return $(nextImgCmd);
    }

    const doCreatePrevCmd = function(){
      let prevImgCmd = $('<img id="PrevCmd" data-toggle="tooltip" title="Previous"/>');
      $(prevImgCmd).attr('src', pluginUrl + '/images/prev-cmd-icon.png');
      $(prevImgCmd).css({'position': 'relative', 'width': '30px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '10px', 'margin-left': '10px'});
      $(prevImgCmd).on('click', (evt)=>{
        doShowPrevImage();
      });
      return $(prevImgCmd);
    }

    const doCreateFullScreenCmd = function(){
      let fullScreenCmd = $('<img data-toggle="tooltip" title="Full Screen"/>');
      $(fullScreenCmd).attr('src', pluginUrl+ '/images/fullscreen-icon.png');
      $(fullScreenCmd).css({'position': 'relative', 'width': '30px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '10px', 'margin-left': '10px'});
      $(fullScreenCmd).on('click', (evt)=>{
        let xElem = document.getElementById('ImgBox');
        if (xElem) {
          requestFullScreen(xElem).then((wh) => {
            fullScreenMode = true;
            $('#ImagePreview').css({'height': '100%', 'width': 'auto'})
  		    });
        } else {
          console.log('Error: not found your img elem. at Cmd.');
        }
      });
      return $(fullScreenCmd);
    }

    const doCreateRecordSwitch = function(onStartRecord, onStopRecord){
			let recordSwitchBox = $('<div style="position: relative; display: inline-block; margin-left: 10px; top: -10px;"></div>');
			let recordOption = {
				onActionCallback: ()=>{onStartRecord()},
				offActionCallback: ()=>{onStopRecord()}
			};
			recordSwitch = $(recordSwitchBox).readystate(recordOption);
      return $(recordSwitchBox)
    }

    const doCreateImageEditorCmd = function(){
      let editorCmd = $('<img data-toggle="tooltip" title="Edit"/>');
      $(editorCmd).attr('src', pluginUrl+ '/images/image-editor-icon.png?ty=7906');
      $(editorCmd).css({'position': 'relative', 'width': '30px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '10px', 'margin-left': '10px'});
      $(editorCmd).on('click', (evt)=>{
        let n = $(playerViewBox).find('#FileSourceList').prop('selectedIndex');
        n = parseInt(n) + 1;
        if (n == selectedFiles.length){
          n = 0;
        }
        var fileURL = clipURL.createObjectURL(selectedFiles[n]);
        doOpenEditor(fileURL);
      });
      return $(editorCmd);
    }

    const doShowNextImage = function(){
      if (isAutoPlay) {
        $(playerCmdBox).find('#AutoPlayCmd').attr('src', pluginUrl+ '/images/start-play-icon.png');
      }
      isAutoPlay = false;
      window.clearTimeout(timer);
      let n = $(playerViewBox).find('#FileSourceList').prop('selectedIndex');
      n = parseInt(n) + 1;
      if (n == selectedFiles.length){
        n = 0;
      }
      $(playerViewBox).find('#FileSourceList').prop('selectedIndex', n);
      doPlaySlide();
    }

    const doShowPrevImage = function(){
      if (isAutoPlay) {
        $(playerCmdBox).find('#AutoPlayCmd').attr('src', pluginUrl+ '/images/start-play-icon.png');
      }
      isAutoPlay = false;
      window.clearTimeout(timer);
      let n = $(playerViewBox).find('#FileSourceList').prop('selectedIndex');
      n = parseInt(n) - 1;
      if (n < 0){
        n = (selectedFiles.length - 1);
      }
      $(playerViewBox).find('#FileSourceList').prop('selectedIndex', n);
      doPlaySlide();
    }

    const doToggleAutoPlay = function(evt){
      let toggleCmd = $(evt.currentTarget);
      if (isAutoPlay == true) {
        isAutoPlay = false;
        //$(toggleCmd).val('Play');
        $(toggleCmd).attr('src', pluginUrl+ '/images/start-play-icon.png');
        $(playerViewBox).find('#FileSrcListBox').show();
        $(playerViewBox).css({'text-align': 'center'});
        if (timer) {
          window.clearTimeout(timer);
        }
      } else {
        isAutoPlay = true
        //$(toggleCmd).val('Stop');
        $(toggleCmd).attr('src', pluginUrl+ '/images/stop-play-icon.png');
        let n = $(playerViewBox).find('select').prop('selectedIndex');
        if (!n) {
          n = 0;
          $(playerViewBox).find('select').prop('selectedIndex', n);
        }
        $(playerViewBox).css({'text-align': 'center'});
        let selectedFileType = selectedFiles[n].type;
        if ((selectedFileType === "image/jpeg") || (selectedFileType === "image/png")){
          $(playerViewBox).find('#FileSrcListBox').hide();
          doPlaySlide();
        }
      }
    }

    const doCreateImagePreview = function(fileURL, label){
      let labelBox = $('<p id="GGLabel" style="font-family: EkkamaiStandard; font-size: 20px; color: yellow;">' + label + '</p>');
      $(labelBox).css({'color': settings.ggFontColor});
      let imgBox = $('<div id="ImgBox" class="imgbox" style="position: absolute; padding: 10px; text-align: center; top: -120px;"></div>');
      let imgView = $('<div class="imgview" style="position: relative; width: 450px; height: auto;"></div>');
      $(imgBox).append($(imgView));

      let img = $('<img id="ImagePreview" style="cursor: pointer; width: ' + settings.imgSize + 'px; height: auto;"/>');
      $(img).prop('src', fileURL);
      $(img).on('click', (evt)=>{
        window.open(fileURL, '_blank');
      })
      $(img).on('load', function() {
        let w = $(this).width();
        let h = $(this).height();
        if (w > h) {
          $(img).css({'width': 'auto', 'height': (w + 'px')});
        }
        $(labelBox).css({'margin-top': '1px'});
  		});

      $(imgView).append($(img)).append($(labelBox));

      return $(imgBox);
    }

    const doPlaySlide = function(){
      let n = $(playerViewBox).find('#FileSourceList').prop('selectedIndex');
      if (!n) {
        n = 0;
      }
      n = parseInt(n) + 1;
      if (n == selectedFiles.length){
        n = 0;
      }
      var fileURL = clipURL.createObjectURL(selectedFiles[n]);
      let fileType = selectedFiles[n].type
      if (fileType.indexOf("image") >= 0){
        let imgName = selectedFiles[n].name;
        let playImg = new Image();
        playImg.src = fileURL;
        playImg.id = 'ImagePreview';

        let imgBox = $(playerViewBox).find('.imgbox').empty();
        playImg.onload = function() {
          //console.log(fileURL);
          $(imgBox).append($(this));
          let w = $(this).width();
          let h = $(this).height();

          if (w > h) {
            $(this).css({'width': 'auto', 'height': (settings.imgSize + 'px'), 'cursor': 'pointer'});
          } else {
            $(this).css({'width': (settings.imgSize + 'px'), 'height': 'auto', 'cursor': 'pointer'});
          }
          $(this).on('click', (evt)=>{
            window.open(fileURL, '_blank');
          });

          let recordState = recordSwitch.getState();
          if (recordState == true){
            let imageCanvas = $('#ImageCanvas')[0];
            let ctx = $(imageCanvas).getContext("2d");
            ctx.drawImage(playImg, 0, 0, w, h);
            $(imgCanvas).on('click', (evt)=>{
              window.open(fileURL, '_blank');
            });

            if (w > h) {
              $(imgCanvas).css({'width': 'auto', 'height': (settings.imgSize + 'px'), 'cursor': 'pointer'});
            } else {
              $(imgCanvas).css({'width': (settings.imgSize + 'px'), 'height': 'auto', 'cursor': 'pointer'});
            }
          }

          if (fullScreenMode == true) {
            let w = window.screen.width;
            let h = window.screen.height;
            if (w > h) {
              $(this).css({'height': '100%', 'width': 'auto'});
            } else {
              $(this).css({'height': 'auto', 'width': '100%'});
            }
          }
          let imgLabel = $('<p id="ImgLabel"></p>').css({'color': 'red'});
          $(imgLabel).text(imgName);
          $(imgBox).append($(imgLabel));
        };

        if (isAutoPlay == true){
          timer = window.setTimeout(()=>{
            $(playerViewBox).find('#FileSourceList').prop('selectedIndex', n);
            doPlaySlide();
          }, parseInt(settings.timeDelay) * 1000);
        }
      } else if (fileType.indexOf("video") >= 0){
        $(playerViewBox).find('#FileSourceList').prop('selectedIndex', n)
      }
    }

    const doPlayExternalVideo = function(URL) {
      if (playerViewBox){
        $(playerViewBox).find('.imgbox').remove();
      }
      if (timer) {
        window.clearTimeout(timer);
      }
      if (URL !== null) {
        let localVideo = document.createElement('video');
        $(playerViewBox).append($(localVideo));
        localVideo.id = 'LocalVideo';
        localVideo.style.position = 'relative';
        localVideo.style.display = 'inline-block';
        localVideo.style.width = settings.imgSize + 'px';
        localVideo.style.height = 'auto';
        localVideo.style.border = '1px solid green';
        localVideo.style.padding = '2px';
        localVideo.style.top = '-90px';
        localVideo.controls = true;
        localVideo.autoplay = true;
        localVideo.crossorigin = "anonymous";
        localVideo.src = URL;
        setTimeout(() => {
          localVideo.addEventListener("canplay",  function() {
            localVideo.play();
          });
          localVideo.addEventListener("ended",  function() {
            if (isAutoPlay){
              let n = $(playerViewBox).find('#FileSourceList').prop('selectedIndex');
              n = parseInt(n) + 1;
              if (n == selectedFiles.length){
                n = 0;
              }
              var fileURL = clipURL.createObjectURL(selectedFiles[n]);
              localVideo.src = fileURL;
              $(playerViewBox).find('#FileSourceList').prop('selectedIndex', n);
            }
          });
        }, 2500);
        $(localVideo).draggable({containment: 'parent'});
        $(localVideo).resizable({containment: 'parent'});
      } else {
        console.log('Error=> clipURL is null');
      }
    }

    const doPlayExternalAudio  = function(URL) {
      if (playerViewBox){
        $(playerViewBox).find('.imgbox').remove();
      }
      if (timer) {
        window.clearTimeout(timer);
      }
      if (URL !== null) {
        let localAudio = document.createElement('audio');
        let localAudioBox = $('<div style="width: fit-content(20em);"></div>').append($(localAudio));
        $(playerViewBox).append($(localAudioBox));
        localAudio.id = 'LocalAudio';
        localAudio.style.position = 'relative';
        localAudio.style.display = 'inline-block';
        localAudio.style.width = settings.imgSize + 'px';
        localAudio.style.height = '45px';
        localAudio.style.border = '1px solid green';
        localAudio.style.padding = '2px';
        localAudio.style.top = '-90px';
        localAudio.controls = true;
        localAudio.autoplay = true;
        localAudio.crossorigin = "anonymous";
        localAudio.src = URL;
        setTimeout(() => {
          localAudio.addEventListener("canplay",  function() {
            localAudio.play();
          });
          localAudio.addEventListener("ended",  function() {
            if (isAutoPlay){
              let n = $(playerViewBox).find('#FileSourceList').prop('selectedIndex');
              n = parseInt(n) + 1;
              if (n == selectedFiles.length){
                n = 0;
              }
              var fileURL = clipURL.createObjectURL(selectedFiles[n]);
              localAudio.src = fileURL;
              $(playerViewBox).find('#FileSourceList').prop('selectedIndex', n);
            }
          });
        }, 2500);
        $(localAudioBox).draggable({containment: 'parent'});
        $(localAudioBox).resizable({containment: 'parent'});
      } else {
        console.log('Error=> clipURL is null');
      }
    }

    const doCreateFileListBox = function(){
      let fileSrcListBox = $('<div id="FileSrcListBox" style="position: absolute; padding:5px; border: 1px solid green; top: -90px;"></div>');
    	let fileSrcSelector = $('<select id="FileSourceList" multiple size="6" style="height: 190px; width: 300px; margin-top: 10px;"></select>');
      $(fileSrcSelector).on('change', (evt)=>{
        let n = $(fileSrcSelector).prop('selectedIndex');
        let selectedFileType = selectedFiles[n].type;
        let fileURL = clipURL.createObjectURL(selectedFiles[n]);
        let imgName = selectedFiles[n].name;
        if ((selectedFileType === "image/jpeg") || (selectedFileType === "image/png")){
          $(playerViewBox).find('video').remove();
          $(playerViewBox).find('.imgbox').remove();
          $(playerCmdBox).find('#NavBar').remove();
          let imgBox = doCreateImagePreview(fileURL, imgName);
          $(playerViewBox).append($(imgBox));
          $(imgBox).draggable({containment: 'parent'});
          $(imgBox).resizable({containment: 'parent'});
          if (isAutoPlay == true){
            doPlaySlide();
          }

          let navBar = doCreateNavBar();
          $(navBar).appendTo($(playerCmdBox));
        } else if (selectedFileType === "video/mp4"){
          if (timer) {
            window.clearTimeout(timer);
          }
          $(playerViewBox).find('#LocalVideo').remove();
          $(playerViewBox).find('.imgbox').remove();
          $(playerCmdBox).find('#NavBar').remove();
          doPlayExternalVideo(fileURL);
          $(playerViewBox).find('#LocalVideo').draggable({containment: 'parent'});
          $(playerViewBox).find('#LocalVideo').resizable({containment: 'parent'});
          let navBar = doCreateNavBar();
          $(navBar).appendTo($(playerCmdBox));
        } else if (selectedFileType === "audio/mpeg"){
          if (timer) {
            window.clearTimeout(timer);
          }
          $(playerViewBox).find('#LocalAudio').remove();
          $(playerViewBox).find('.imgbox').remove();
          $(playerCmdBox).find('#NavBar').remove();
          doPlayExternalAudio(fileURL);
          $(playerViewBox).find('#LocalAudio').draggable({containment: 'parent'});
          $(playerViewBox).find('#LocalAudio').resizable({containment: 'parent'});
          let navBar = doCreateNavBar();
          $(navBar).appendTo($(playerCmdBox));
        }

        if (isAutoPlay == true) {
          $(playerCmdBox).find('#AutoPlayCmd').click();
        }
      });
      return $(fileSrcListBox).append($(fileSrcSelector));
    }

    const doOpenFileChooser = function(){
      $(playerViewBox).find('#FileSrcListBox').remove();
      let srcFileListBox = doCreateFileListBox();
      $(srcFileListBox).draggable({containment: 'parent'});
      $(playerViewBox).append($(srcFileListBox));
      let fileChooser = $('<input type="file" multiple accept="video/*, image/png, image/jpeg, audio/mp3"/>');
      $(fileChooser).css({'display': 'none'});
      $(fileChooser).on('change', (evt)=> {
        if (isAutoPlay == true) {
          window.clearTimeout(timer);
          isAutoPlay = false;
        }
        selectedFiles = evt.currentTarget.files;
        $(playerViewBox).find('.imgbox').remove();
        $(playerViewBox).find('#AutoPlayCmd').attr('src', pluginUrl+ '/images/start-play-icon.png');
        $(playerViewBox).find('#LocalVideo').remove();
        let filesArray = selectedFiles.toArray();
        filesArray.forEach((item, i) => {
          let fileOption = $('<option value="' + item.type + '">' + (i+1) + '. ' + item.name + '</option>');
          $(srcFileListBox).find('select').append($(fileOption))
        });
        $(playerViewBox).append($(srcFileListBox));
        $(playerViewBox).prop('selectedIndex', 0);
        if (timer) {
          window.clearTimeout(timer);
          $('#AuotoPlayCmd').click();
        }
      });

      $(fileChooser).click();
    }

    const doMinimizeWindow = function(cmdBox, viewBox){
      if (isAutoPlay == true) {
        $(playerCmdBox).find('#AutoPlayCmd').click();
      }
      //let firstOption = $(playerViewBox).find('#FileSourceList').find('option:first');
      let firstOption = $(playerViewBox).find('#FileSourceList').find('option:selected');
      let ownerMediaName = $(firstOption).text();
      let maximizeWindowCmd = $('<input type="button" style="position: relative; float: right; bottom: 0px; margin-right: 5px;"/>');
      $(maximizeWindowCmd).css({'font-family': 'THSarabunNew', 'font-size': '20px'});
      if (ownerMediaName !== ''){
        $(maximizeWindowCmd).val(ownerMediaName);
        $(maximizeWindowCmd).prop('id', ownerMediaName);
      } else {
        $(maximizeWindowCmd).val('Maximize');
      }
      $(maximizeWindowCmd).on('click', (evt)=>{
        //$this.show();
        $(cmdBox).show()
        $(viewBox).show();
        $(maximizeWindowCmd).remove();
      });
      $this.append($(maximizeWindowCmd));
      //$this.hide();
      $(cmdBox).hide()
      $(viewBox).hide();
    }

    const doCreateConfigCmd = function(){
      let configBox = $('<div style="position: relative; display: inline-block;"></div>');
      let timeDelayCmd = $('<img data-toggle="tooltip" title="Change Delay Time"/>');
      $(timeDelayCmd).attr('src', pluginUrl+ '/images/setting-icon-2.png');
      $(timeDelayCmd).css({'position': 'relative', 'width': '30px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '10px', 'margin-left': '10px'});
      $(timeDelayCmd).on('click', (evt)=>{
        let newValue = prompt("Please enter your new delay time value", settings.timeDelay);
        if (Number(newValue) > 0) {
          settings.timeDelay = Number(newValue);
        }
      });

      let imgSizeCmd = $('<img data-toggle="tooltip" title="Change Image Size"/>');
      $(imgSizeCmd).attr('src', pluginUrl+ '/images/search-setting-icon.png');
      $(imgSizeCmd).css({'position': 'relative', 'width': '30px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '10px', 'margin-left': '10px'});
      $(imgSizeCmd).on('click', (evt)=>{
        let newValue = prompt("Please enter your new image size", settings.imgSize);
        if (Number(newValue) > 0) {
          settings.imgSize = Number(newValue);
          $(playerViewBox).find('video').css({'width': settings.imgSize});
          $(playerViewBox).find('#ImagePreview').css({'width': settings.imgSize});
        }
      });

      let imageeditor = doCreateImageEditorCmd();

      return $(configBox).append($(timeDelayCmd)).append($(imgSizeCmd)).append($(imageeditor));
    }

    const doCreateNavBar = function(){
      let navBar = $('<div id="NavBar" style="position: relative; display: inline-block;"></div>');

      //let prevCmd = $(playerViewBox).find('#PrevCmd').clone();
      let prevCmd = doCreatePrevCmd();

      //let nextCmd = $(playerViewBox).find('#NextCmd').clone();
      let nextCmd = doCreateNextCmd();
      $(nextCmd).css({'margin-left': '10px'});

      /*
      return $(navBar).append($(prevCmd)).append($(nextCmd)).append($(fullScreenCmd));
      */
      return $(navBar).append($(prevCmd)).append($(nextCmd));
    }

    const doAppendTuiPlugin = function(){
      return new Promise(function(resolve, reject) {
        //$('head').append('<script type="text/javascript" src="https://radconnext.info/lib/imageeditor.js?t=ee759"></script>');
        $('head').append('<script type="text/javascript" src="/lib/imageeditor.js?tt=mo9i123g"></script>');
        setTimeout(()=>{
          resolve();
        }, 1200);
      });
    }

    const doOpenEditor = function(fileURL){
      doAppendTuiPlugin().then(()=>{
        let w = $(playerViewBox).find('.imgbox').find('img').width();
        let h = $(playerViewBox).find('.imgbox').find('img').height();
        var editorbox = $('<div id="EditorBox"></div>');
        $(editorbox).css({ 'position': 'absolute', 'width': '60%', 'background-color': '#fefefe', 'padding': '5px', 'border': '2px solid #888', 'z-index': '55', 'text-align': 'center', 'top': '4px;'});
        $(editorbox).css({ 'font-family': 'EkkamaiStandard', 'font-size': '18px'});
        $('body').append($(editorbox));
        let previewPopup = $('<div id="PopupPreview"></div>');
        $(previewPopup).css({ 'position': 'absolute', 'z-index': '559', 'text-align': 'center', 'top': '4px'});
        $('body').append($(previewPopup));

        $(editorbox).append($('<canvas id="CaptureCanvas" width="100%" height="auto" style="position: relative; margin-top: 4px;"/>'));

        let canvas = document.getElementById('CaptureCanvas');
        let ctx =  canvas.getContext('2d');
        ctx.canvas.width = w;
        ctx.canvas.height = h;

        let pluginOption = {
          canvas: canvas,
          cWidth: w,
          cHeight: h,
          imageInit: fileURL,
          uploadApiUrl: 'https://' + window.location.hostname + '/api/shareupload/share'
        };

        const myEditor = $(editorbox).imageeditor(pluginOption);
        /*
        $(editorbox).draggable({
        	containment: "body",
        	stop: function(evt) {
        		$(this).css({'min-height': '60px'});
        	}
        });
        */
        $(editorbox).resizable({
        	containment: 'body',
        	stop: function(evt) {
        		$(this).css({'width': evt.target.clientWidth, 'height': evt.target.clientHeight});
        	}
        });

        $(previewPopup).draggable({
        	containment: "parent",
        	stop: function(evt) {
        		$(this).css({'min-height': '60px'});
        	}
        });
      });
    }

    const init = function() {
      playerMainBox = $('<div id="PlayerBox" style="width: 100%; height: 100%;"></div>'); // background-color: rgba(0,0,0,0.1)
      playerCmdBox = $('<div id="PlayerCmdBox" style="position: relative; width: 100%; top: 0px; padding: 5px; top: -20px;"></div>');
      playerViewBox = $('<div id="PlayerViewBox" style="position: relative; width: 100%; top: 100px;"></div>');

      let fileChooserCmd = $('<img data-toggle="tooltip" title="Open"/>');
      $(fileChooserCmd).attr('src', pluginUrl+ '/images/open-file-icon.png');
      $(fileChooserCmd).css({'position': 'relative', 'width': '40px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '5px', 'margin-left': '10px'});
      $(fileChooserCmd).on('click', (evt)=>{
        doOpenFileChooser(evt);
      });

      let autoPlayCmd = $('<img id="AutoPlayCmd" data-toggle="tooltip" title="Start/Stop Slide Show"/>');
      $(autoPlayCmd).attr('src', pluginUrl+ '/images/start-play-icon.png');
      $(autoPlayCmd).css({'position': 'relative', 'width': '40px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '10px', 'margin-left': '10px'});
      $(autoPlayCmd).on('click', (evt)=>{
        doToggleAutoPlay(evt);
      });

      let togglePlayListCmd = $('<img id="ImageListCmd" data-toggle="tooltip" title="Show Image List"/>');
      $(togglePlayListCmd).attr('src', pluginUrl+ '/images/list-item-icom.png');
      $(togglePlayListCmd).css({'position': 'relative', 'width': '40px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '10px', 'margin-left': '10px'});
      $(togglePlayListCmd).on('click', (evt)=>{
        let isShow = $('#FileSrcListBox').css('display');
        if (isShow === 'block'){
          $('#FileSrcListBox').css('display', 'none');
        } else {
          $('#FileSrcListBox').css('display', 'block');
        }
      });

      let fullScreenCmd = doCreateFullScreenCmd();

      let minimizeWindowCmd = $('<img data-toggle="tooltip" title="Minimize Player"/>');
      $(minimizeWindowCmd).attr('src', pluginUrl+ '/images/minimize-icon.png');
      $(minimizeWindowCmd).css({'position': 'relative', 'width': '30px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '8px', 'margin-left': '10px'});
      $(minimizeWindowCmd).on('click', (evt)=>{
        doMinimizeWindow(playerCmdBox, playerViewBox);
      });

      let configCmd = doCreateConfigCmd();
      let recordSwitch = doCreateRecordSwitch(doStartRecord, doStopRecord);

      $(playerCmdBox).append($(fileChooserCmd)).append($(autoPlayCmd)).append($(minimizeWindowCmd)).append($(fullScreenCmd)).append($(configCmd)).append($(togglePlayListCmd)).append($(recordSwitch));
      return $(playerMainBox).append($(playerCmdBox)).append($(playerViewBox));
    }

    const fullSceenChangeHandler = function(evt){
      //let oldImgSize = settings.imgSize;
      if ((document.webkitIsFullScreen == false) || (document.mozFullScreen == false) || (document.msFullscreenElement == false))	{
        fullScreenMode = false;
        console.log(fullScreenMode);
      } else {
        let xElem = document.getElementById('ImgBox');
        if (xElem) {
          requestFullScreen(xElem).then((wh) => {
            fullScreenMode = true;
            xElem.style.width = window.screen.width;
            xElem.style.height = window.screen.height;
            //xElem.style.border = '2px solid yellow';
            //xElem.style.padding = '5px';
          });
        } else {
          console.log('Error: not found your img elem.');
        }
        console.log(fullScreenMode);
      }
    }

    const requestFullScreen = function(element) {
      return new Promise(function(resolve, reject) {
        var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullScreen;
        if (requestMethod) { // Native full screen.
          requestMethod.call(element);
          var width = window.innerWidth;
          var height = window.innerHeight;
          resolve({width: width, height: height});
        } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
          var wscript = new ActiveXObject("WScript.Shell");
          if (wscript !== null) {
            wscript.SendKeys("{F11}");
          }
          resolve(null);
        }
      });
    }

    let recorder = undefined;

    const doStartRecord = function(){
      let imgBox = $(playerViewBox).find('.imgbox');
      let imgCanvas = $('<canvas id="ImageCanvas"></canvas>');
      $(imgCanvas).css({'Width': (settings.imgSize + 'px'), 'Height':  'auto', 'cursor': 'pointer'});

      let fileURL = $(imgBox).find('img').prop('src');
      console.log(fileURL);


      let playImg = new Image();
      playImg.src = fileURL;


      //let imgCanvas = document.getElementById('ImageCanvas');;
      //console.log(imgCanvas);
      playImg.onload = function() {
        let w = $(this).width();
        let h = $(this).height();

        let ctx = $(imgCanvas)[0].getContext("2d");
        ctx.drawImage(playImg, 0, 0, w, h);
        /*
        $(imgCanvas).on('click', (evt)=>{
          window.open(fileURL, '_blank');
        });
        */
        if (w > h) {
          $(imgCanvas).css({'width': 'auto', 'height': (settings.imgSize + 'px'), 'cursor': 'pointer'});
        } else {
          $(imgCanvas).css({'width': (settings.imgSize + 'px'), 'height': 'auto', 'cursor': 'pointer'});
        }
      }
      recorder = new RecordRTCPromisesHandler(imgCanvas, {
        type: 'canvas',
        disableLogs: false
      });
      $(imgBox).append($(imgCanvas));

      recorder.startRecording();
    }
    const doStopRecord = function(){
      $('#ImagePreview').show();
      $('#ImageCanvas').hide();
      recorder.stopRecording(function() {
        setTimeout(function() {
          var blob = recorder.getBlob();
          console.log(blob);
          var video = document.createElement('video');
          let blobUrl = URL.createObjectURL(blob);
          console.log(blobUrl);
          video.src = blobUrl;
          //video.setAttribute('style', 'height: 100%; position: absolute; top:0; left:0;z-index:9999;width:100%;');
          video.setAttribute('style', 'width: 330px; height: auto;');
          document.body.appendChild(video);
          video.controls = true;
          video.play();
        }, 3300);
      });
    }

    document.addEventListener("fullscreenchange", fullSceenChangeHandler, false);
    document.addEventListener("webkitfullscreenchange", fullSceenChangeHandler, false);
    document.addEventListener("mozfullscreenchange", fullSceenChangeHandler, false);

    /*
    pluginOption {
    }
    */

    let player = init();
    this.empty().append($(player));

    /* public method of plugin */
    var output = {
      settings: settings,
      handle: this,
      player: player,
      next: doShowNextImage,
      prev: doShowPrevImage
    }

    return output;

  };


})(jQuery);
