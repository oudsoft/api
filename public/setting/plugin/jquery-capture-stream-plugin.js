
(function ( $ ) {
  $.fn.capturestream = function( options ) {

    var settings = $.extend({

    }, options );

    var $this = this;
    var recorder = undefined;

    const doCreateAspectRatioOption = function(changeCallBack){
      let aspectRatio = $('<select id="AspectRatioOption"></select>');
      $(aspectRatio).append('<option value="default">Default</option>');
  		$(aspectRatio).append('<option value="1.77">16:9</option>');
  		$(aspectRatio).append('<option value="1.33">4:3</option>');
  		$(aspectRatio).append('<option value="2.35">21:9</option>');
  		$(aspectRatio).append('<option value="1.4">14:10</option>');
  		$(aspectRatio).append('<option value="1.9">19:10</option>');
      $(aspectRatio).on('change', (evt)=>{
        changeCallBack(evt);
      });
      return $('<div style="position: relative; display: inline-block;"></div>').append('<span>Aspect Ratio: </span>').append($(aspectRatio));
    }

    const doCreateFrameRateOption = function(changeCallBack){
      let frameRate = $('<select id="FrameRateOption"></select>');
      $(frameRate).append('<option value="default">Default</option>');
  		$(frameRate).append('<option>30</option>');
  		$(frameRate).append('<option>25</option>');
  		$(frameRate).append('<option>15</option>');
  		$(frameRate).append('<option>5</option>');
      $(frameRate).on('change', (evt)=>{
        changeCallBack(evt);
      });
      return $('<div style="position: relative; display: inline-block;"></div>').append('<span>Frame Rate: </span>').append($(frameRate));
    }

    const doCreateResolutionsOption = function(changeCallBack){
      let resolutions = $('<select id="ResolutionsOption"></select>');
      $(resolutions).append('<option value="default">Default</option>');
  		$(resolutions).append('<option value="fit-screen">Fit Screen</option>');
  		$(resolutions).append('<option value="4K">4K</option>');
  		$(resolutions).append('<option value="1080p">1080p</option>');
  		$(resolutions).append('<option value="720p">720p</option>');
  		$(resolutions).append('<option value="480p">480p</option>');
  		$(resolutions).append('<option value="360p">360p</option>');
      $(resolutions).on('change', (evt)=>{
        changeCallBack(evt);
      });
      return $('<div style="position: relative; display: inline-block;"></div>').append('<span>Resolutions: </span>').append($(resolutions));
    }

    const doCreateControlStramOption = function(execCaptureCallback){
      let aspectRatioOptionBox = doCreateAspectRatioOption(aspectRatioChangeHandle);
      let frameRateOptionBox = doCreateFrameRateOption(frameRateChangeHandle);
      let resolutionsOptionBox = doCreateResolutionsOption(resolutionsChangeHandle);
      let getStreamCmd = $('<input type="button" value=" OK "/>');
      $(getStreamCmd).on('click', (evt)=>{
        execCaptureCallback(evt);
      })
      return $('<div style="position: relative; display: inline-block;"></div>').append($(aspectRatioOptionBox)).append($(frameRateOptionBox)).append($(resolutionsOptionBox)).append($(getStreamCmd));
    }

    const aspectRatioChangeHandle = function(evt){
      let aspectRatioSelector = $(evt.currentTarget);
    }

    const frameRateChangeHandle = function(evt){
      let frameRateSelector = $(evt.currentTarget);
    }

    const resolutionsChangeHandle = function(evt){
      let resolutionsSelector = $(evt.currentTarget);
    }

    const doCreateVideoContrains = function(aspectRatio, frameRate, resolutions){
      var videoConstraints = {};

      if(aspectRatio !== 'default') {
        videoConstraints.aspectRatio = aspectRatio;
      }

      if(frameRate !== 'default') {
        videoConstraints.frameRate = frameRate;
      }

      if(resolutions !== 'default') {
  			if (resolutions === 'fit-screen') {
  				videoConstraints.width = screen.width;
  				videoConstraints.height = screen.height;
  			}

  			if (resolutions === '4K') {
  				videoConstraints.width = 3840;
  				videoConstraints.height = 2160;
  			}

  			if (resolutions === '1080p') {
  				videoConstraints.width = 1920;
  				videoConstraints.height = 1080;
  			}

  			if (resolutions === '720p') {
  				videoConstraints.width = 1280;
  				videoConstraints.height = 720;
  			}

  			if (resolutions === '480p') {
  				videoConstraints.width = 853;
  				videoConstraints.height = 480;
  			}

  			if (resolutions === '360p') {
  				videoConstraints.width = 640;
  				videoConstraints.height = 360;
  			}

  		} else {
  			videoConstraints.width = screen.width;
  			videoConstraints.height = screen.height;
  		}

  		videoConstraints.displaySurface = "application";

  		return {
  			video: videoConstraints
  		};

    }

    const doExecCaptureStream = function(evt){
      let getStreamCmd = $(evt.currentTarget);
      let aspectRatioOption = $this.find('#AspectRatioOption');
      let frameRateOption = $this.find('#FrameRateOption');
      let resolutionsOption = $this.find('#ResolutionsOption');

      let videoContrains = doCreateVideoContrains($(aspectRatioOption).val(), $(frameRateOption).val(), $(resolutionsOption).val());

      openDisplayMedia(videoContrains, successCallback, errorCallback)
    }

    const openDisplayMedia = function(videoConstraints, successCallback, errorCallback){
      let $this = this;
      //return new Promise(function(resolve, reject) {
        if(navigator.mediaDevices.getDisplayMedia) {
          navigator.mediaDevices.getDisplayMedia(videoConstraints).then(successCallback).catch(errorCallback);
        } else {
          navigator.getDisplayMedia(videoConstraints).then(successCallback).catch(errorCallback);
        }
        //resolve();
      //});
    }

    const successCallback = function(stream){
      var recordRTC = RecordRTC(stream);
      recordRTC.startRecording();
      $("body").append($('<video id="CaptureVideo" width="520" height="290" autoplay/>'));
      let video = document.getElementById('CaptureVideo');
      stream.getTracks().forEach(function(track) {
    		track.addEventListener('ended', function() {
    			console.log('Stop Stream.');
          setTimeout(function() {

            recordRTC.save();
          }, 1300);
    		}, false);
    	});

      video.srcObject = stream;

      video.addEventListener( "loadedmetadata", function (evt) {

      });

      $(video).draggable({containment: "body"});

    }

    const errorCallback = function(err){
      var error = {
    		name: err.name || 'UnKnown',
    		message: err.message || 'UnKnown',
    		stack: err.stack || 'UnKnown'
    	};

    	if(error.name === 'PermissionDeniedError') {
    		if(location.protocol !== 'https:') {
    			error.message = 'Please use HTTPs.';
    			error.stack   = 'HTTPs is required.';
    		}
    	}
    	console.error(error);
    }

    const init = function(){
      return doCreateControlStramOption(doExecCaptureStream)
    }

    const captureStreamBox = init();
    this.append($(captureStreamBox));

    /* public method of plugin */
    var output = {
      handle: this,
      settings: $this.settings,
    }

    return output;

  };
}( jQuery ));
