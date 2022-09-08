/*feeder.js */
/*
  This plugin for geegee slide play
*/

(function($) {
  /*
  var origAppend = $.fn.append;

  $.fn.append = function () {
    return origAppend.apply(this, arguments).trigger("append");
  };
  */
  $.fn.feeder = function( options ) {
    var settings = $.extend({
      onActionCallback: undefined,
      offActionCallback: undefined,
      perpage: 10,
      width: '100px',
      delay: 1,
      onPlay: true
    }, options );

    const $this = this;

    let timer = undefined;
    let anmTimer = undefined;
    let yourGeegeeList = undefined;
    let currentPage = 0;
    let pageAmount = undefined;
    let currentPageBox = undefined;
    let geegeeName = undefined;
    let galleryName = undefined;

    this.bind("append", function() { $.notify('Hello, world!', 'success'); });

    const doAppend = function(msg){
      console.log(msg);
      $.notify('Hello, world!!!' + msg, 'success');
    }

    const doCallEntryPoint = function(){
      return new Promise(function(resolve, reject) {
        var realUrl = '/api/entrypoint';
        var params = {};
        $.get(realUrl, params, function(data){
          resolve(data);
        }).fail(function(error) {
          reject(error);
        });
      });
    }

    const doLoadGeegeeList = function(){
      return new Promise(function(resolve, reject) {
        var realUrl = '/api/geegee';
        var params = {};
        $.get(realUrl, params, function(data){
          resolve(data);
        }).fail(function(error) {
          reject(error);
        });
      });
    }

    const doLoadGeegeeFileItem = function(ggName, galleryName){
      return new Promise(function(resolve, reject) {
        var realUrl = '/api/load/file';
        var params = {ggname: ggName, galleryname: galleryName};
        $.get(realUrl, params, function(data){
          resolve(data);
        }).fail(function(error) {
          reject(error);
        });
      });
    }

    const doLoadGeegeeSelect = function(){
      return new Promise(function(resolve, reject) {
        var realUrl = '/api/load/main';
        var params = {};
        $.get(realUrl, params, function(data){
          resolve(data);
        }).fail(function(error) {
          reject(error);
        });
      });
    }

    const doLoadGallerySelect = function(ggName){
      return new Promise(function(resolve, reject) {
        var realUrl = '/api/load/gallery';
        var params = {ggname: ggName};
        $.get(realUrl, params, function(data){
          resolve(data);
        }).fail(function(error) {
          reject(error);
        });
      });
    }

    const doCreatePreviewBox = function(ggg, page){
      let geegeeBox = $('<div id="GeegeeBox"></div>');
      let geegeeLabelBox = $('<div style="position: relative, width: 100%; text-align: center;"></div>');
      $(geegeeLabelBox).text(geegeeName + '/' + galleryName);
      $(geegeeBox).append($(geegeeLabelBox));
      let from = (page-1)*settings.perpage;
      let to = from + settings.perpage;
      for (let i=from; i<to; i++) {
        let geegeeWrapper = $('<div class="geegee-wrapper" style="display: inline-block;"></div>');
        let thumb = $('<img class="geegee"/>');
        $(thumb).attr('src', '/api/geegeefile/' + ggg[i]);
        $(thumb).css({'width': settings.width, 'height': 'auto', 'cursor': 'pointer', 'padding': '5px'});
        $(thumb).on('click', (evt)=>{
          let viewURL = '/api/geegeeview/' + ggg[i]
          window.open(viewURL, '_blank');
        })
        $(geegeeWrapper).append($(thumb))
        $(geegeeBox).append($(geegeeWrapper));
      }
      let toolBox = $('<div style="position: absolute, right: 14px"></div>');
      let backGalleryCmd = doCreateChangeGalleryCmd(geegeeName);
      let prevCmd = doCreatePrevCmd();
      let curBox = doCreateCurrentPageBox();
      let stopCmd = doCreateStopCmd();
      let nextCmd = doCreateNextCmd();
      let delayCmd = doCreateChangeDelayCmd();
      let perPageCmd = doCreateChangePerPageCmd();
      let sizeCmd = doCreateChangeThumbSizeCmd();
      let minimizeCmd = doCreateMinimizeCmd();

      $(toolBox).append($(backGalleryCmd)).append($(prevCmd)).append($(curBox)).append($(nextCmd)).append($(stopCmd)).append($(delayCmd)).append($(perPageCmd)).append($(sizeCmd)).append($(minimizeCmd));
      $(geegeeBox).append($(toolBox));
      currentPageBox = curBox;
      return $(geegeeBox);
    }

    const doCreateChangeGeegeeCmd = function(){
      let backCmd = $('<img/>');
      $(backCmd).attr('src', '/api/images/back-icon.png');
      $(backCmd).css({'position': 'relative', 'width': '40px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '20px'});
      $(backCmd).on('click', (evt)=>{
        doLoadGeegeeSelect().then((geegeeRes)=>{
          let geegeeSelect = doCreateGeegeeSelect(geegeeRes.geegee);
          $this.empty().append($(geegeeSelect));
          window.clearTimeout(timer);
          window.clearTimeout(anmTimer);
        })
      })
      return $(backCmd);
    }

    const doCreateChangeGalleryCmd = function(ggName){
      let galleryCmd = $('<img/>');
      $(galleryCmd).attr('src', '/api/images/back-icon.png');
      $(galleryCmd).css({'position': 'relative', 'width': '40px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '20px'});
      $(galleryCmd).on('click', (evt)=>{
        doLoadGallerySelect(ggName).then((galleryRes)=>{
          let gallerySelect = doCreateGallerySelect(ggName, galleryRes.galleries);
          $this.empty().append($(gallerySelect));
          window.clearTimeout(timer);
          window.clearTimeout(anmTimer);
        })
      })
      return $(galleryCmd);
    }

    const doCreateChangeDelayCmd = function(){
      let delayCmd = $('<img/>');
      $(delayCmd).attr('src', '/api/images/tools-icon.png');
      $(delayCmd).css({'position': 'relative', 'width': '40px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '20px'});
      $(delayCmd).on('click', (evt)=>{
        let newValue = prompt("Please enter your new delay value", settings.delay);
        if (Number(newValue) > 0) {
          settings.delay = Number(newValue);
        }
      });
      return $(delayCmd);
    }

    const doCreateChangePerPageCmd = function(){
      let perPageCmd = $('<img/>');
      $(perPageCmd).attr('src', '/api/images/setting-icon-2.png');
      $(perPageCmd).css({'position': 'relative', 'width': '40px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '20px'});
      $(perPageCmd).on('click', (evt)=>{
        let newValue = prompt("Please enter your new per page value", settings.perpage);
        if (Number(newValue) > 0) {
          settings.perpage = Number(newValue);
          doSetCurrentPage();
        }
      });
      return $(perPageCmd);
    }

    const doCreateChangeThumbSizeCmd = function(){
      let thumbSizeCmd = $('<img/>');
      $(thumbSizeCmd).attr('src', '/api/images/search-setting-icon.png');
      $(thumbSizeCmd).css({'position': 'relative', 'width': '40px', 'height': 'auto', 'cursor': 'pointer', 'padding': '4px', 'top': '20px'});
      $(thumbSizeCmd).on('click', (evt)=>{
        let newValue = prompt("Please enter your new width size value", settings.width);
        if (Number(newValue) > 0) {
          settings.width = newValue;
        }
      });
      return $(thumbSizeCmd);
    }

    const doCreatePrevCmd = function(){
      let prevCmd = $('<input type="button" value=" << " style="margin-left: 5px;"/>');
      $(prevCmd).on('click', (evt)=>{
        let eventData = {newCurrentPage: (currentPage-1), cmd: 'prev'};
        $(currentPageBox).trigger('currentpagechange', [eventData]);
        window.clearTimeout(timer);
        window.clearTimeout(anmTimer);
      });
      return $(prevCmd);
    }

    const doCreateNextCmd = function(){
      let nextCmd = $('<input type="button" value=" >> " style="margin-left: 5px;"/>');
      $(nextCmd).on('click', (evt)=>{
        let eventData = {newCurrentPage: (currentPage+1), cmd: 'next'};
        $(currentPageBox).trigger('currentpagechange', [eventData]);
        window.clearTimeout(timer);
        window.clearTimeout(anmTimer);
      });
      return $(nextCmd);
    }

    const doCreateStopCmd = function(){
      let stopCmd = $('<input type="button" value="###" style="margin-left: 5px;"/>');
      $(stopCmd).on('click', (evt)=>{
        let playState = settings.onPlay;
        if (playState === true) {
          settings.onPlay = false;
          window.clearTimeout(timer);
          window.clearTimeout(anmTimer);
          $(stopCmd).val('>>>');
        } else {
          settings.onPlay = true;
          play();
          $(stopCmd).val('###');
        }
      });
      return $(stopCmd);
    }

    const doCreateMinimizeCmd = function(){
      let minimizeCmd = $('<input type="button" value=" -- " style="margin-left: 5px;"/>');
      $(minimizeCmd).on('click', (evt)=>{
        doMinimizeWindow()
      });
      return $(minimizeCmd);
    }
    const doCreateCurrentPageBox = function(){
      let box = $('<span style="margin-left: 5px;"></span>');
      let newText = (currentPage-1) + ' / ' + pageAmount;
      $(box).text(newText);
      $(box).on('currentpagechange', (evt, data)=>{
        let newValue = Number(data.newCurrentPage);
        if (data.cmd === 'prev'){
          newValue = newValue - 0;
          if ((newValue > 1) && (newValue < pageAmount)) {
            //newValue = 1;
          } else {
            if (newValue <= 0) {
              newValue = 1;
            } else if (newValue > pageAmount) {
              newValue = 1;
            } else {
              newValue = pageAmount;
            }
          }
        } else if (data.cmd === 'next'){
          newValue = newValue + 0;
          if ((newValue > 1) && (newValue < pageAmount)) {
            //newValue = 1;
          } else {
            if (newValue <= 0) {
              newValue = pageAmount;
            } else if (newValue > pageAmount) {
              newValue = 1;
            } else {
              newValue = pageAmount;
            }
          }
        }
        newText = newValue + ' / ' + pageAmount;
        $(box).empty().text(newText);

        currentPage = newValue;

        let previewBox = doCreatePreviewBox(yourGeegeeList, currentPage);
        $this.empty().append($(previewBox));
      })
      return $(box);
    }

    const doCreateGeegeeSelect = function(ggItems){
      let selectFolderBox = $('<div></div>');
      ggItems.forEach((item, i) => {
        let selectFolder = $('<div style="position: relative; display: inline-block;"></div>');
        let selectGeegeeCmd = $('<img/>');
        $(selectGeegeeCmd).attr('src', '/api/images/folder-icon.png');
        $(selectGeegeeCmd).css({'width': '80px', 'height': 'auto', 'cursor': 'pointer', 'padding': '5px'});
        $(selectGeegeeCmd).on('click', (evt)=>{
          geegeeName = item;
          doLoadGallerySelect(item).then((galleryRes)=>{
            let gallerySelect = doCreateGallerySelect(item, galleryRes.galleries);
            $this.empty().append($(gallerySelect));
          })
        });
        let selectGeegeeName = $('<div style="text-align: center;"><span>' + item + '</span></div>');
        $(selectFolder).append($(selectGeegeeCmd)).append($(selectGeegeeName));
        $(selectFolder).appendTo($(selectFolderBox))
      });
      return $(selectFolderBox);
    }

    const doCreateGallerySelect = function(ggname, galleries){
      let selectGalleryBox = $('<div></div>');
      galleries.forEach((item, i) => {
        let selectGallery = $('<div style="position: relative; display: inline-block;"></div>');
        let selectGalleryCmd = $('<img/>');
        $(selectGalleryCmd).attr('src', '/api/images/folder-icon.png');
        $(selectGalleryCmd).css({'width': '80px', 'height': 'auto', 'cursor': 'pointer', 'padding': '5px'});
        $(selectGalleryCmd).on('click', async (evt)=>{
          galleryName = item.name;
          $('body').loading('start');
          let fileRes = await doLoadGeegeeFileItem(ggname, item.name);
          yourGeegeeList = fileRes;
          currentPage = 1;
          play();
          $('body').loading('stop');
        });
        let selectGalleryName = $('<div style="text-align: center;"><span>' + item.name + '</span></div>');
        $(selectGallery).append($(selectGalleryCmd)).append($(selectGalleryName));
        $(selectGallery).appendTo($(selectGalleryBox));
      });
      let backToMainCmdBox = $('<div></div>');
      //let backToMainCmd = doCreateChangeGalleryCmd(ggname);
      let backToMainCmd = doCreateChangeGeegeeCmd();
      $(backToMainCmdBox).append($(backToMainCmd));
      $(selectGalleryBox).append($(backToMainCmdBox));
      return $(selectGalleryBox);
    }

    const doSetCurrentPage = function(page){
      let maxPage = parseInt(yourGeegeeList.length/settings.perpage);
      let z = yourGeegeeList % settings.perpage;
      if (z > 0) {
        maxPage += 1;
      }
      pageAmount = maxPage;
      if (!page){
        if ((currentPage > 0) && (currentPage < maxPage)) {
          currentPage += 1;
        } else {
          currentPage = 1;
        }
      } else {

        if ((page > 0) && (page < maxPage)) {
          currentPage = page;
        } else {
          currentPage = 1;
        }
      }
    }

    const delay = (t)=> new Promise((resolve)=> setTimeout(resolve(), t));
    const zoomIn = (elem)=> new Promise((resolve)=> {
      $(elem).animate({"zoom": "-=20%"}, 'slow', ()=> resolve())
    });
    const zoomOut = (elem)=> new Promise((resolve)=> {
      $(elem).animate({"zoom": "+=20%"}, 'fast', ()=> resolve())
    });

    const geegeeAnimate = function(ggIndex){
      $('geegee-wrapper').css({'heigth': '110px'});
      let gg = $('img.geegee').eq(ggIndex);
      $(gg).css({'border': '2px solid yellow', 'animation': 'blink 1s', 'animation-iteration-count': '3'});
      //zoomIn(gg).then(()=> zoomOut(gg).then(()=> {
      //}))
      anmTimer = window.setTimeout(()=>{
        $(gg).css({'border': ''});
        let i = ggIndex;
        if (i < settings.perpage) {
          i++;
          geegeeAnimate(i);
        } else {
          window.clearTimeout(anmTimer);
          //geegeeAnimate(0);
        }
      }, 3000);
    }

    const play = function(){
      doSetCurrentPage();
      let previewBox = doCreatePreviewBox(yourGeegeeList, currentPage);
      delay(7000).then(()=>{
        $this.empty().append($(previewBox));
        geegeeAnimate(0);
        next();
      });
    }

    const next = function(){
      if (settings.onPlay == true){
        let delayMiiliSec = settings.delay*1000;
        timer = window.setTimeout(()=>{
          play();
        }, delayMiiliSec);
      }
    }

    const doMinimizeWindow = function(){
      let maximizeWindowCmd = $('<input type="button" value="Show me" style=" font-family: THSarabunNew; font-size: 20px;"/>');
      $(maximizeWindowCmd).css({'position': 'absolute', 'bottom': '0px', 'right': '0px'});
      $(maximizeWindowCmd).on('click', (evt)=>{
        $this.parent().show();
        $(maximizeWindowCmd).remove();
      });
      $(maximizeWindowCmd).draggable({containment: 'parent'});
      $('body').append($(maximizeWindowCmd));
      $this.parent().hide();
    }

    const init = function() {
      return new Promise(function(resolve, reject) {
        doLoadGeegeeSelect().then((geegeeRes)=>{
          let geegeeSelect = doCreateGeegeeSelect(geegeeRes.geegee);
          //$this.empty().append($(geegeeSelect));
          resolve($(geegeeSelect));
        })
      });
    }

    /*
    pluginOption {
    }
    */
    init().then((hello)=>{
      doCallEntryPoint().then((nari)=>{
        console.log(nari);
        $this.empty().append($(hello));
      });
    })

    /* public method of plugin */
    var output = {
      settings: settings,
      handle: this,
      appendMe: doAppend,
      loadGeegeeList: doLoadGeegeeList
    }

    return output;

  };


})(jQuery);

(()=>{

  const myBox = $('<div></div>');
  $(myBox).css({'width': '100%', 'min-height': '200px;'})

  const myFeeder = $(myBox).feeder({perpage: 8, delay: 25, width: '100px'});

  return myFeeder;

})();
