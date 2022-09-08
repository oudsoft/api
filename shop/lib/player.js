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
      iconRootPath: '../../'
    }, options );

    const $this = this;
    const clipURL = window.URL;

    let timer = undefined;
    let selectedFiles = [];
    let isAutoPlay = false;
    let imageViewMode = 'preview';
    let fullScreenMode = false;

    let recordSwitch = undefined;
    let imgCanvas = undefined;

    let playerMainBox = undefined;
    let playerCmdBox = undefined;
    let playerViewBox = undefined;

    let recorder =undefined;
    let captureDimension = undefined;
    let playerStream = undefined;
    let audioStream = undefined;

    const doCreateNextCmd = function(){
      let nextImgCmd = $('<img id="NextCmd" data-toggle="tooltip" title="Next"/>');
      $(nextImgCmd).attr('src', settings.iconRootPath + '/images/next-cmd-icon.png');
      $(nextImgCmd).css({'position': 'relative', 'width': '30px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '-4px', 'margin-left': '10px'});
      $(nextImgCmd).on('click', (evt)=>{
        doShowNextImage();
      });
      return $(nextImgCmd);
    }

    const doCreatePrevCmd = function(){
      let prevImgCmd = $('<img id="PrevCmd" data-toggle="tooltip" title="Previous"/>');
      $(prevImgCmd).attr('src', settings.iconRootPath + '/images/prev-cmd-icon.png');
      $(prevImgCmd).css({'position': 'relative', 'width': '30px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '-4px', 'margin-left': '10px'});
      $(prevImgCmd).on('click', (evt)=>{
        doShowPrevImage();
      });
      return $(prevImgCmd);
    }

    const doCreateFullScreenCmd = function(){
      let fullScreenCmd = $('<img data-toggle="tooltip" title="Full Screen"/>');
      $(fullScreenCmd).attr('src', settings.iconRootPath+ '/images/fullscreen-icon.png');
      $(fullScreenCmd).css({'position': 'relative', 'width': '35px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '10px', 'margin-left': '10px'});
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
			let recordSwitchBox = $('<div style="position: relative; display: inline-block; margin-left: 5px; top: -10px;"></div>');
			let recordOption = {
				onActionCallback: (evt)=>{onStartRecord(evt)},
				offActionCallback: (evt)=>{onStopRecord(evt)}
			};
			recordSwitch = $(recordSwitchBox).readystate(recordOption);
      return $(recordSwitchBox)
    }

    const doCreateImageEditorCmd = function(){
      let editorCmd = $('<img data-toggle="tooltip" title="Edit"/>');
      $(editorCmd).attr('src', settings.iconRootPath+ '/images/image-editor-icon.png?ty=4306');
      $(editorCmd).css({'position': 'relative', 'width': '30px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '10px', 'margin-left': '10px'});
      $(editorCmd).on('click', (evt)=>{
        let n = $(playerViewBox).find('#FileSourceList').prop('selectedIndex');
        n = parseInt(n) + 1;
        if (n == selectedFiles.length){
          n = 0;
        }
        //var fileURL = clipURL.createObjectURL(selectedFiles[n]);
        let fileURL = selectedFiles[n].url;
        doOpenEditor(fileURL);
      });
      return $(editorCmd);
    }

    const doShowNextImage = function(){
      if (isAutoPlay) {
        $(playerCmdBox).find('#AutoPlayCmd').attr('src', settings.iconRootPath+ '/images/start-play-icon.png');
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
        $(playerCmdBox).find('#AutoPlayCmd').attr('src', settings.iconRootPath+ '/images/start-play-icon.png');
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
        $(toggleCmd).attr('src', settings.iconRootPath+ '/images/start-play-icon.png');
        $(playerViewBox).find('#FileSrcListBox').show();
        $(playerViewBox).css({'text-align': 'center'});
        if (timer) {
          window.clearTimeout(timer);
        }
      } else {
        isAutoPlay = true
        //$(toggleCmd).val('Stop');
        $(toggleCmd).attr('src', settings.iconRootPath+ '/images/stop-play-icon.png');
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
      //var fileURL = clipURL.createObjectURL(selectedFiles[n]);
      let fileURL = selectedFiles[n].url;
      let fileType = selectedFiles[n].type
      if (fileType.indexOf("image") >= 0){
        let imgName = selectedFiles[n].name;
        let playImg = new Image();
        playImg.src = fileURL;
        playImg.id = 'ImagePreview';

        let imgBox = $(playerViewBox).find('.imgbox');
        $(imgBox).empty();

        playImg.onload = function() {
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
            let localVideo = document.getElementById('LocalVideo');
            let playerCanvas = document.getElementById('ImageCanvas');
            let ctx = playerCanvas.getContext("2d");
            if (w > h) {
              h = settings.imgSize;
              w = (558/330) * settings.imgSize;
              //captureDimension = {width: w, height: h};
              //console.log(captureDimension);
              playerCanvas.width = w;
              playerCanvas.height = h;
              ctx.drawImage(playImg, 0, 0, w, h);
            } else {
              h = $(this).height();
              w = $(this).width();
              //captureDimension = {width: w, height: h};
              //console.log(captureDimension);
              playerCanvas.width = w;
              playerCanvas.height = h;
              ctx.drawImage(playImg, 0, 0, w, h);
            }
            localVideo.style.width = captureDimension.width + 'px';
            localVideo.style.height = captureDimension.height + 'px';
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
              //var fileURL = clipURL.createObjectURL(selectedFiles[n]);
              let fileURL = selectedFiles[n].url;
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
              //var fileURL = clipURL.createObjectURL(selectedFiles[n]);
              let fileURL = selectedFiles[n].url;
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
      let fileSrcListBox = $('<div id="FileSrcListBox" style="position: absolute; padding:5px; border: 2px solid green; top: -90px; background-color: #dddd"></div>');
    	let fileSrcSelector = $('<select id="FileSourceList" multiple size="6" style="height: 190px; width: 300px; margin-top: 10px;"></select>');
      $(fileSrcSelector).on('change', (evt)=>{
        let n = $(fileSrcSelector).prop('selectedIndex');
        let selectedFileType = selectedFiles[n].type;
        //let fileURL = clipURL.createObjectURL(selectedFiles[n]);
        let fileURL = selectedFiles[n].url;
        let imgName = selectedFiles[n].name;
        if ((selectedFileType === "image/jpeg") || (selectedFileType === "image/png")){
          $(playerViewBox).find('video').remove();
          $(playerViewBox).find('.imgbox').remove();
          $(playerCmdBox).find('#NavBar').remove();
          let imgBox = doCreateImagePreview(fileURL, imgName);
          $(playerViewBox).append($(imgBox));
          $(imgBox).draggable({containment: 'body', stop: function(evt){
              evt.stopPropagation();
            }
          });
          $(imgBox).resizable({containment: 'body', stop: function(evt){
              settings.imgSize = evt.target.clientWidth;
            }
          });
          if (isAutoPlay == true){
            doPlaySlide();
          }

          let navBar = doCreateNavBar();
          $(navBar).appendTo($(playerCmdBox));
        } else if ((selectedFileType === "video/mp4") || (selectedFileType === "video/webm")) {
          if (timer) {
            window.clearTimeout(timer);
          }
          $(playerViewBox).find('#LocalVideo').remove();
          $(playerViewBox).find('.imgbox').remove();
          $(playerCmdBox).find('#NavBar').remove();
          doPlayExternalVideo(fileURL);
          $(playerViewBox).find('#LocalVideo').draggable({containment: 'body'});
          $(playerViewBox).find('#LocalVideo').resizable({containment: 'body'});
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
          $(playerViewBox).find('#LocalAudio').draggable({containment: 'body'});
          $(playerViewBox).find('#LocalAudio').resizable({containment: 'body'});
          let navBar = doCreateNavBar();
          $(navBar).appendTo($(playerCmdBox));
        }

        if (isAutoPlay == true) {
          $(playerCmdBox).find('#AutoPlayCmd').click();
        }
      });
      let addFileCmd = $('<span>+</span>').css({'font-size': '28px', 'padding': '2px', 'cursor': 'pointer'});
      $(addFileCmd).on('click', (evt)=>{
        evt.stopPropagation();
        let srcFileListBox = $(playerViewBox).find('#FileSrcListBox');
        doCreateFileChooser(srcFileListBox, ()=>{});
      });
      let deleteFileCmd = $('<span>-</span>').css({'font-size': '28px', 'padding': '2px', 'cursor': 'pointer'});
      $(deleteFileCmd).on('click', (evt)=>{
        evt.stopPropagation();
        let srcFileListBox = $(playerViewBox).find('#FileSrcListBox');
        let srcFileSelector = $(srcFileListBox).find('select');
        let n = $(srcFileSelector).prop('selectedIndex');
        selectedFiles.splice(n, 1);
        $(srcFileSelector).find('option:selected').remove();
        if (selectedFiles.length >= n) {
          $(srcFileSelector).prop('selectedIndex', n).change();
        } else if (selectedFiles.length > 0) {
          $(srcFileSelector).prop('selectedIndex', 0).change();
        }
      });
      let fileCmdBox = $('<div style="text-align: left;"></div>');
      $(fileCmdBox).append($(addFileCmd)).append($(deleteFileCmd));
      return $(fileSrcListBox).append($(fileCmdBox)).append($(fileSrcSelector));
    }

    const doOpenFileChooser = function(){
      $(playerViewBox).find('#FileSrcListBox').remove();
      let srcFileListBox = doCreateFileListBox();
      $(srcFileListBox).draggable({containment: 'body'});
      $(playerViewBox).append($(srcFileListBox));
      doCreateFileChooser(srcFileListBox, ()=>{
        if (isAutoPlay == true) {
          window.clearTimeout(timer);
          isAutoPlay = false;
        }
        $(playerViewBox).find('.imgbox').remove();
        $(playerViewBox).find('#LocalVideo').remove();
        $(srcFileListBox).find('select').prop('selectedIndex', 0).change();
        $(srcFileListBox).hide();
        let autoPlayCmd = $(playerCmdBox).find('#AutoPlayCmd');
        $(autoPlayCmd).attr('src', settings.iconRootPath+ '/images/start-play-icon.png');
        $(playerViewBox).append($(srcFileListBox));
        if (timer) {
          window.clearTimeout(timer);
          $('#AuotoPlayCmd').click();
        }
      });
    }

    const doCreateFileChooser = function(srcFileListBox, chooseSuccessCallback) {
      let startCount = 0;
      let fileSelector = $(srcFileListBox).find('select');
      if (fileSelector) {
        startCount = $(fileSelector).find('option').length;
      }
      let fileChooser = $('<input type="file" multiple accept="video/*, image/png, image/jpeg, audio/mp3"/>');
      $(fileChooser).css({'display': 'none'});
      $(fileChooser).on('change', (evt)=> {
        let choosedFiles = evt.currentTarget.files;
        for (let i = 0; i < choosedFiles.length; i++) {
          let url = clipURL.createObjectURL(choosedFiles[i]);
          let name = choosedFiles[i].name;
          let type = choosedFiles[i].type
          selectedFiles.push({url, name, type});
        }
        let filesArray = choosedFiles.toArray();
        filesArray.forEach((item, i) => {
          let fileOption = $('<option value="' + item.name + '">' + (startCount + i + 1) + '. ' + item.name + '</option>');
          $(srcFileListBox).find('select').append($(fileOption));
        });
        chooseSuccessCallback();
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
      $(timeDelayCmd).attr('src', settings.iconRootPath+ '/images/setting-icon-2.png');
      $(timeDelayCmd).css({'position': 'relative', 'width': '30px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '10px', 'margin-left': '10px'});
      $(timeDelayCmd).on('click', (evt)=>{
        let newValue = prompt("Please enter your new delay time value", settings.timeDelay);
        if (Number(newValue) > 0) {
          settings.timeDelay = Number(newValue);
        }
      });

      let imgSizeCmd = $('<img data-toggle="tooltip" title="Change Image Size"/>');
      $(imgSizeCmd).attr('src', settings.iconRootPath+ '/images/search-setting-icon.png');
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
      let prevCmd = doCreatePrevCmd();
      let nextCmd = doCreateNextCmd();
      $(nextCmd).css({'margin-left': '10px'});
      return $(navBar).append($(prevCmd)).append($(nextCmd));
    }

    const doAppendTuiPlugin = function(){
      return new Promise(function(resolve, reject) {
        //$('head').append('<script type="text/javascript" src="/shop/lib/imageeditor.js?tt=mo9i456f"></script>');
        setTimeout(()=>{
          resolve();
        }, 1200);
      });
    }

    const doOpenEditor = function(fileURL){
      let w = $(playerViewBox).find('.imgbox').find('img').width();
      let h = $(playerViewBox).find('.imgbox').find('img').height();
      var editorbox = $('<div id="EditorBox"></div>');
      let pinSwitchBox = $('<div style="position: absolute; display: inline-block; right: 5px; top: 5px;"></div>');
			let pinOption = {
				onActionCallback: (evt)=>{
          $(editorbox).resizable({
          	containment: 'parent',
            start: function(evt) {
              $('body').css({'width': '100%', 'height': '100%'});
            },
          	stop: function(evt) {
          		$(this).css({'width': evt.target.clientWidth, 'height': evt.target.clientHeight});
          	}
          });
          $(editorbox).draggable({
          	containment: "parent",
            start: function(evt) {
              $('body').css({'width': '100%', 'height': '100%'});
            },
          	stop: function(evt) {
          		$(this).css({'min-height': '60px'});
          	}
          });
        },
				offActionCallback: (evt)=>{
          $(editorbox).resizable('destroy');
          $(editorbox).draggable('destroy');
        }
			};
			pinSwitch = $(pinSwitchBox).readystate(pinOption);
      $(editorbox).css({ 'position': 'absolute', 'width': '60%', 'background-color': '#fefefe', 'padding': '5px', 'border': '2px solid #888', 'z-index': '55', 'text-align': 'center', 'top': '4px;'});
      $(editorbox).css({ 'font-family': 'EkkamaiStandard', 'font-size': '18px'});
      $('body').append($(editorbox));
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
        uploadApiUrl: '/api/shop/upload/share'
      };
      let myEditor = $(editorbox).imageeditor(pluginOption);
      let modalHeader = $(editorbox).find('#ModalHeader');
      $(modalHeader).append($(pinSwitchBox));
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

    const onKeyDownEvt = function(evt) {
    	switch (evt.keyCode) {
    		case 39:
    			/* Arrow Right */
    			doShowNextImage();
    		break;
    		case 37:
    			/* Arrow Left */
    			doShowPrevImage();
    		break;
    		case 38:
    			/* Arrow Up */
    			settings.imgSize += 10;
    			$(playerViewBox).find('video').css({'width': settings.imgSize});
    			$(playerViewBox).find('#ImagePreview').css({'width': settings.imgSize});
    		break;
    		case 40:
    			/* Arrow Down */
    			settings.imgSize -= 10;
    			$(playerViewBox).find('video').css({'width': settings.imgSize});
    			$(playerViewBox).find('#ImagePreview').css({'width': settings.imgSize});
    		break;
    	}
    }

    const init = function() {
      playerMainBox = $('<div id="PlayerBox" style="width: 100%; height: 100%;"></div>'); // background-color: rgba(0,0,0,0.1)
      if (settings.backgroundColor) {
        $(playerMainBox).css({'background-color': settings.backgroundColor});
      }
      playerCmdBox = $('<div id="PlayerCmdBox" style="position: relative; width: 100%; top: 0px;"></div>');
      playerViewBox = $('<div id="PlayerViewBox" style="position: relative; width: 100%; top: 100px;"></div>');

      let fileChooserCmd = $('<img data-toggle="tooltip" title="Open"/>');
      $(fileChooserCmd).attr('src', settings.iconRootPath+ '/images/open-file-icon.png');
      $(fileChooserCmd).css({'position': 'relative', 'width': '40px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '-5px'});
      $(fileChooserCmd).on('click', (evt)=>{
        doOpenFileChooser(evt);
      });

      let autoPlayCmd = $('<img id="AutoPlayCmd" data-toggle="tooltip" title="Start/Stop Slide Show"/>');
      $(autoPlayCmd).attr('src', settings.iconRootPath+ '/images/start-play-icon.png');
      $(autoPlayCmd).css({'position': 'relative', 'width': '40px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '0px', 'margin-left': '5px'});
      $(autoPlayCmd).on('click', (evt)=>{
        doToggleAutoPlay(evt);
      });

      let togglePlayListCmd = $('<img id="ImageListCmd" data-toggle="tooltip" title="Show Image List"/>');
      $(togglePlayListCmd).attr('src', settings.iconRootPath+ '/images/list-item-icom.png');
      $(togglePlayListCmd).css({'position': 'relative', 'width': '36px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '-2px', 'margin-left': '5px'});
      $(togglePlayListCmd).on('click', (evt)=>{
        let isShow = $(playerViewBox).find('#FileSrcListBox').css('display');
        if (isShow === 'block'){
          $(playerViewBox).find('#FileSrcListBox').css('display', 'none');
        } else {
          $(playerViewBox).find('#FileSrcListBox').css('display', 'block');
        }
      });

      let fullScreenCmd = doCreateFullScreenCmd();
      $(fullScreenCmd).css({'top': '-2px'});

      /*
      let minimizeWindowCmd = $('<img data-toggle="tooltip" title="Minimize Player"/>');
      $(minimizeWindowCmd).attr('src', settings.iconRootPath+ '/images/minimize-icon.png');
      $(minimizeWindowCmd).css({'position': 'relative', 'width': '30px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '-5px', 'margin-left': '5px'});
      $(minimizeWindowCmd).on('click', (evt)=>{
        doMinimizeWindow(playerCmdBox, playerViewBox);
      });
      */

      let minPlayerBoxCmd = $('<div><span>_</span></div>').css({'font-size': '25px', 'cursor': 'pointer', 'position': 'absolute',/* 'border': '1px solid #dddd',*/ 'padding': '2px', 'vertical-align': 'sup', /* 'top': '-10px',*/ 'bottom': '40px', 'right': '25px'})
      $(minPlayerBoxCmd).on('click', (evt)=>{
        doMinimizeWindow(playerCmdBox, playerViewBox);
      });
      let closePlayerBoxCmd = $('<div><span>X</span></div>').css({'font-size': '25px', 'cursor': 'pointer', 'position': 'absolute',/* 'border': '1px solid #dddd',*/ 'padding': '2px', 'top': '-10px', 'right': '0px', 'margin-left': '10px'})
      $(closePlayerBoxCmd).on('click', (evt)=>{
        $($this).remove();
      });

      let configCmd = doCreateConfigCmd();
      $(configCmd).css({'top': '-14px'});
      let recordSwitch = doCreateRecordSwitch(doStartRecord, doStopRecord).css({'top': '-22px'});

      $(playerCmdBox).append($(fileChooserCmd)).append($(autoPlayCmd))/*.append($(minimizeWindowCmd))*/.append($(fullScreenCmd)).append($(configCmd)).append($(togglePlayListCmd)).append($(recordSwitch)).append($(minPlayerBoxCmd)).append($(closePlayerBoxCmd));
      return $(playerMainBox).append($(playerCmdBox)).append($(playerViewBox));
    }

    const formatDateStr = function(d) {
  		var yy, mm, dd, hh, mn, ss;
  		yy = d.getFullYear();
  		if (d.getMonth() + 1 < 10) {
  			mm = '0' + (d.getMonth() + 1);
  		} else {
  			mm = '' + (d.getMonth() + 1);
  		}
  		if (d.getDate() < 10) {
  			dd = '0' + d.getDate();
  		} else {
  			dd = '' + d.getDate();
  		}
      if (d.getHours() < 10) {
        hh = '0' + d.getHours();
      } else {
        hh = '' + d.getHours();
      }
      if (d.getMinutes() < 10) {
        mn = '0' + d.getMinutes();
      } else {
        mn = '' + d.getMinutes();
      }
      if (d.getSeconds() < 10) {
        ss = '0' + d.getSeconds();
      } else {
        ss = '' + d.getSeconds();
      }
  		var td = `${yy}${mm}${dd}-${hh}${mn}${ss}`;
  		return td;
  	}

    const delay = function(t) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve();
        }, t);
      });
    }

    const doGetAudioStream = function() {
      let streams = [];
      navigator.mediaDevices.getUserMedia({ audio: true }).then((audioStrean)=>{
        streams.push(audioStrean);
      });
      return delay(100).then(()=> {
        return streams[0];
      });
    }

    const doStartRecord = function(evt){
      //let promiseList = doGetAudioStream();
      //Promise.all([promiseList]).then((ob)=>{
        //audioStream = ob[0];
        let imgCanvas = $('<canvas id="ImageCanvas"></canvas>');
        $(imgCanvas).css({'position': 'absolute', 'width': (settings.imgSize + 'px'), 'height':  'auto', 'display': 'none', 'top': '10px'});
        $(playerViewBox).append($(imgCanvas));
        $(imgCanvas).draggable({containment: 'body'});

        let imgBox = $(playerViewBox).find('.imgbox');
        let fileURL = $(imgBox).find('img').prop('src');

        let ww = $(imgBox).width();
        let hh = $(imgBox).height();
        captureDimension = {width: ww, height: hh};

        let playImg = new Image();
        playImg.src = fileURL;

        let playerCanvas = document.getElementById('ImageCanvas');
        playerStream = playerCanvas.captureStream(30);
        let combinedStream = new MediaStream([...playerStream.getTracks()/*, ...audioStream.getTracks()*/]);
        recorder = new MediaRecorder(combinedStream, {
        //recorder = new MediaRecorder(playerCanvas, {
          mimeType: 'video/webm'
        });
        recorder.start();

        let ctx = playerCanvas.getContext("2d");
        playImg.onload = function() {
          console.log(captureDimension);
          if (captureDimension.width > captureDimension.height) {
            //$('#ImageCanvas').show();
            hh = settings.imgSize;
            ww = (558/330) * settings.imgSize;
            $(this).css({'width': 'auto', 'height': (settings.imgSize + 'px'), 'cursor': 'pointer'});
            playerCanvas.width = ww;
            playerCanvas.height = hh;
            ctx.drawImage(playImg, 0, 0, ww, hh);
          } else {
            $(this).css({'width': (settings.imgSize + 'px'), 'height': 'auto', 'cursor': 'pointer'});
            playerCanvas.width = captureDimension.width;
            playerCanvas.height = captureDimension.height;
            ctx.drawImage(playImg, 0, 0, captureDimension.width, captureDimension.height);
          }
          localVideo.style.width = captureDimension.width + 'px';
          localVideo.style.height = 'auto';
        }
        var localVideo = document.createElement('video');
        $(playerViewBox).append($(localVideo));
        localVideo.id = 'LocalVideo';
        localVideo.style.position = 'absolute';
        localVideo.style.display = 'block';
        //localVideo.style.width = settings.imgSize + 'px';
        //localVideo.style.height = 'auto';
        localVideo.style.border = '1px solid green';
        localVideo.style.padding = '2px';
        localVideo.style.top = '100px';
        localVideo.controls = true;
        localVideo.autoplay = true;
        localVideo.crossorigin = "anonymous";
        localVideo.srcObject = playerStream;
        setTimeout(() => {
          localVideo.addEventListener("canplay",  function() {
            console.log('can');
            localVideo.play();
          });
          localVideo.addEventListener("ended",  function() {
            console.log('end');
          });
        }, 500);
        $(localVideo).draggable({containment: 'body'});
      //});
    }

    const doStopRecord = async function(evt){
      recorder.ondataavailable = function(e) {
        var url = window.URL.createObjectURL(e.data);
        var dateStr = formatDateStr(new Date());
        var fileName = ['video-', dateStr, '.webm'].join('');
        var pom = document.createElement('a');
        pom.setAttribute('href', url);
        pom.setAttribute('download', fileName);
        delay(4000).then(()=> {
          pom.click();
          let playerViewBoxideo = document.getElementById('LocalVideo');
          $(playerViewBoxideo).remove();
        });
      }
      /*
      await audioStream.getTracks().forEach(function(track) {
        track.stop();
      });
      */
      await playerStream.getTracks().forEach(function(track) {
        track.stop();
      });

      recorder.stop();
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
    this.on('keydown', (evt)=>{
      onKeyDownEvt(evt);
    });

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
