/* jquery-custom-select-plugin.js */
(function ( $ ) {
  $.fn.customselect = function( options ) {

    var settings = $.extend({

    }, options );

    var $this = this;
    var selectedIndex = 0;
    var defualtDisplay = {name: "เลือกรังสีแพทย์"};
    var selectOptions = [defualtDisplay];
    var selectOptionDisplay = undefined;

    const doCreateLegentCmd = function(){
      let legentCmd = $('<img src="/images/question-icon.png" style="width: 27px; height: auto"; padding: 5px; border: 4px solid #ddd; border-radius: 5px;" data-toggle="tooltip" title="ความหมายสัญลักษณ์"/>');
  		$(legentCmd).css({'position': 'relative', 'cursor': 'pointer'});
  		$(legentCmd).hover(()=>{
        $(legentCmd).css({'border': '4px solid grey'});
      },()=>{
        $(legentCmd).css({'border': '4px solid #ddd'});
      });
  		$(legentCmd).on('click', (evt)=>{
        let content = doCreateLegentContent();
        settings.onShowLegentCmdClick(evt, content);
  		});
      let legentCmdBox = $('<span class="question-box"></span>');
  		return $(legentCmdBox).append($(legentCmd));
    }

    const doCreateLegentContent = function(){
      const legentBox = $('<div style="display: table; width: 100%; border-collapse: collapse;"></div>');
      let row = $('<div style="display: table-row; width: 100%"></div>');
      let cicle = $('<span></span>');
      let cicleCell = $('<div style="display: table-cell; vertical-align: middle"></div>');
      let enLegentCell = $('<div style="display: table-cell; vertical-align: middle"></div>');
      let thLegentCell = $('<div style="display: table-cell; vertical-align: middle"></div>');

      $(cicleCell).append($(cicle));
      $(enLegentCell).append($('<span></span>'));
      $(thLegentCell).append($('<span><h4>ความหมาย</h4></span>'));
      $(row).append($(cicleCell)).append($(enLegentCell)).append($(thLegentCell));
      $(legentBox).append($(row));

      row = $('<div style="display: table-row; width: 100%"></div>');
      cicle = circleBox('green');
      cicleCell = $('<div style="display: table-cell; vertical-align: middle"></div>');
      enLegentCell = $('<div style="display: table-cell; vertical-align: middle"></div>');
      thLegentCell = $('<div style="display: table-cell; vertical-align: middle"></div>');

      $(cicleCell).append($(cicle));
      $(enLegentCell).append($('<span>Active</span>'));
      $(thLegentCell).append($('<span>Active หรือ idle ไม่เกิน 5 นาที</span>'));
      $(row).append($(cicleCell)).append($(enLegentCell)).append($(thLegentCell));
      $(legentBox).append($(row));

      row = $('<div style="display: table-row; width: 100%"></div>');
      cicle = circleBox('yellow');
      cicleCell = $('<div style="display: table-cell; vertical-align: middle"></div>');
      enLegentCell = $('<div style="display: table-cell; vertical-align: middle"></div>');
      thLegentCell = $('<div style="display: table-cell; vertical-align: middle"></div>');

      $(cicleCell).append($(cicle));
      $(enLegentCell).append($('<span>Active x minutes ago/hours ago</span>'));
      $(thLegentCell).append($('<span>Idle เกิน 5 นาที หรือ Offline</span>'));
      $(row).append($(cicleCell)).append($(enLegentCell)).append($(thLegentCell));
      $(legentBox).append($(row));

      row = $('<div style="display: table-row; width: 100%"></div>');
      cicle = circleBox('red');
      cicleCell = $('<div style="display: table-cell; vertical-align: middle"></div>');
      enLegentCell = $('<div style="display: table-cell; vertical-align: middle"></div>');
      thLegentCell = $('<div style="display: table-cell; vertical-align: middle"></div>');

      $(cicleCell).append($(cicle));
      $(enLegentCell).append($('<span>Busy, x remaining task</span>'));
      $(thLegentCell).append($('<span>มีงานที่ Expire ค้างในระบบ x งาน</span>'));
      $(row).append($(cicleCell)).append($(enLegentCell)).append($(thLegentCell));
      $(legentBox).append($(row));

      row = $('<div style="display: table-row; width: 100%"></div>');
      cicle = circleBox('grey');
      cicleCell = $('<div style="display: table-cell; vertical-align: middle"></div>');
      enLegentCell = $('<div style="display: table-cell; vertical-align: middle"></div>');
      thLegentCell = $('<div style="display: table-cell; vertical-align: middle"></div>');

      $(cicleCell).append($(cicle));
      $(enLegentCell).append($('<span>Off</span>'));
      $(thLegentCell).append($('<span>ปิดรับงาน</span>'));
      $(row).append($(cicleCell)).append($(enLegentCell)).append($(thLegentCell));
      $(legentBox).append($(row));

      return $(legentBox);
    }

    const arrowUp = function(){
      let arrow = $('<span class="arrow"></span>');
      $(arrow).css({'width': '0', 'height': '0', 'border-left': '10px solid transparent', 'border-right': '10px solid transparent', 'border-bottom': '10px solid black', 'margin-top': '13px', 'margin-right': '5px'});
      return $(arrow);
    }

    const arrowDown = function(){
      let arrow = $('<span class="arrow"></span>');
      $(arrow).css({'width': '0', 'height': '0', 'border-left': '10px solid transparent', 'border-right': '10px solid transparent', 'border-top': '10px solid black', 'margin-top': '13px', 'margin-right': '5px'});
      return $(arrow);
    }

    const circleBox = function(bkColor){
      let circle = $('<span style="height: 25px; width: 25px; border: 1px solid #ccc; border-radius: 50%; display: inline-block; margin-left: 4px;"></span>');
      $(circle).css('background-color', bkColor);
      return $(circle);
    }

    const rectBox = function(bkColor){
      let rect = $('<span style="width: 25px; height: 25px; border: 1px solid #ccc; display: inline-block; margin-left: 4px;"></span>');
      $(rect).css('background-color', bkColor);
      return $(rect);
    }

    const minuteValueBox = function(minuteValue){
      let minuteBox = $('<span class="minute-value" style="display: table-cell; margin-left: 5px;"></span>');
      $(minuteBox).text('Live ' + minuteValue + ' Min. ago');
      return $(minuteBox);
    }

    const doCreateMeaningBox = function(color, x){
      let meanBox = $('<span class="minute-value" style="display: table-cell; margin-left: 5px; vertical-align: middle;"></span>');
      if (color === 'grey'){
        $(meanBox).text('Off');
      } else if (color === 'green'){
        $(meanBox).text('Active');
      } else if (color === 'yellow'){
        if (x){
          if (x < 60) {
            $(meanBox).text('Active ' + x + ' minutes ago.');
          } else {
            $(meanBox).text('Active many hours ago.');
          }
        } else {
          $(meanBox).text('Active many hours ago.');
        }
      } else if (color === 'red'){
        $(meanBox).text('Busy, ' + x + ' remaining task.');
      }
      return $(meanBox);
    }

    const doRenderSelectedOption = function(){
      let selectedOption = selectOptions[selectedIndex];
      selectedOptionDisplay = $('<span class="displayText"></span>')
      $(selectedOptionDisplay).append($('<span>' + selectedOption.name + '</span>'));
      return $(selectedOptionDisplay);
    }

    const doRenderOptionItem = function(optionItem, clickCallback) {
      let li = $('<li style="display: table-row; line-height: 22px; min-height: 22px;"><span style="display: table-cell; vertical-align: middle;">' + optionItem.name + '</span></li>');
      let readyBox = undefined;
      let meaningBox = undefined;
      if (optionItem.state) {
        if (optionItem.state.readyState == 0) {
          let color = 'grey';
          let xMin = 0;
          readyBox = circleBox(color, xMin);
          meaningBox = doCreateMeaningBox(color, xMin);
        } else {
          if (optionItem.state.screenState.online == 1) {
            let color = 'green';
            let xMin = 0;
            readyBox = circleBox(color);
            meaningBox = doCreateMeaningBox(color, xMin);
          } else if (optionItem.state.screenState.online == 0) {
            let color = 'yellow';
            let xMin = undefined;
            if (optionItem.state.screenState.minute) {
              xMin = optionItem.state.screenState.minute;
            }
            readyBox = circleBox(color);
            meaningBox = doCreateMeaningBox(color, xMin);
          } else {
            let color = 'red';
            let xMin = optionItem.state.screenState.minute;
            readyBox = circleBox(color);
            meaningBox = doCreateMeaningBox(color, xMin);
          }
        }
        $(readyBox).css('margin-left', '10px');
        $(li).append($(readyBox));
        $(meaningBox).css('margin-left', '10px');
        $(li).append($(meaningBox));
      }
      $(li).on('click', (evt)=>{
        clickCallback(evt);
      });
      return $(li);
    }

    const doRenderSelectOptions = function(){
      let ul = $('<ul class="select-ul"></ul>');
      let selectBoxWidth = settings.externalStyle.width;
      let selectBoxHeight = settings.externalStyle.height;
      $(ul).css('width', selectBoxWidth);
      $(ul).css('top', selectBoxHeight);
      if (selectOptions.length > 0){
        for (let i=0; i<selectOptions.length; i++){
          let selectOption = selectOptions[i];
          let li = doRenderOptionItem(selectOption, (evt)=>{
            let arrowSpan = $(selectorHandle).find('span.arrow');
            $(arrowSpan).remove();
            let arrowdown = arrowDown();
            $(arrowdown).css({'float': 'right'});
            selectedIndex = i;
            let thisOption = selectOptions[selectedIndex];
            let selectedDisplay = doRenderSelectedOption();
            $(selectorHandle).find('span.displayText').empty().append($(selectedDisplay));
            $(arrowdown).insertBefore($(selectOptionDisplay));
            $(li).parent().hide();
            $(selectOptionDisplay).toggle();
          });
          $(li).appendTo($(ul));
        }
      }
      return $(ul);
    }

    const doFindIndexOf = function(ofId){
      return new Promise(async function(resolve, reject) {
        let foundIndex = -1;
        let foundItem = await selectOptions.find((item, index)=>{
          if (item.radioId == ofId) {
            foundIndex = index;
            return item;
          }
        });
        resolve(foundIndex);
      });
    }

    const doSetSelectOptions = function(value){
      selectOptions = value;
      let defualtOption = selectOptions[selectedIndex];
      let defualtDisplay = doRenderSelectedOption(defualtOption);
      selectOptionDisplay = doRenderSelectOptions();
      $(selectorHandle).find('ul').remove();
      let arrow = arrowDown();
      $(arrow).css({'float': 'right'});
      $(selectorHandle).empty().append($(defualtDisplay)).append($(arrow)).append($(selectOptionDisplay));
    }

    const doGetSelectOptions = function(){
      return selectOptions;
    }

    const doGetRadioSelected = function(){
      let selectedOption = selectOptions[selectedIndex];
      return selectedOption;
    }

    const doSetRadioSelected = function(value){
      selectedIndex = value;
    }

    const doPreLoadOptions = function(){
      return new Promise(async function(resolve, reject) {
        settings.startLoad();
        await $.post(settings.loadOptionsUrl, {}, function(responseData){
          let newSelectOptions = [];
          let radioes = responseData.Records;
          const promiseList = new Promise(function(resolve, reject) {
            for (let i=0; i<radioes.length; i++) {
              let selectOption = {
                radioId: radioes[i].user.id,
                name: radioes[i].user.userinfo.User_NameTH + ' ' + radioes[i].user.userinfo.User_LastNameTH,
                state: radioes[i].currentState
              };
              newSelectOptions.push(selectOption);
            }
            setTimeout(()=> {
              resolve(newSelectOptions);
            },400);
          });
          Promise.all([promiseList]).then(async (ob)=> {
            selectOptions = ob[0];
            $(selectorHandle).find('ul').remove();
            selectOptionDisplay = doRenderSelectOptions();
            $(selectorHandle).append($(selectOptionDisplay));
            $(selectOptionDisplay).show();
            settings.stopLoad();
            resolve(ob[0]);
          });
        });
      });
    }

    const init = function() {
      let slectorBox = $('<div style="position: relative; border: 1px solid black; background-color: #ccc; display: inline-block;"></div>'); //border-radius: 4px;
      $(slectorBox).css(settings.externalStyle);
      let defualtOption = selectOptions[selectedIndex];
      let defualtDisplay = doRenderSelectedOption(defualtOption);
      selectOptionDisplay = doRenderSelectOptions();
      let arrowdown = arrowDown();
      $(arrowdown).css({'float': 'right'});
      $(slectorBox).on('click', async (evt)=>{
        $(selectOptionDisplay).toggle();
        $(selectorHandle).find('span.arrow').remove();
        if ($('ul').css('display') === 'block'){
          let arrowup = arrowUp();
          $(arrowup).css({'float': 'right'});
          $(arrowup).insertBefore($('ul'));

          await doPreLoadOptions();
        } else {
          let arrowdo = arrowDown();
          $(arrowdo).css({'float': 'right'});
          $(arrowdo).insertBefore($('ul'));
        }
        $(slectorBox).focus();
      });
      /*==============================================*/
      //-> focusin / focusout ไม่ทำงาน
      $(slectorBox).on('focusin', (evt)=>{
        console.log(evt);
      });
      $(slectorBox).on('focusout', (evt)=>{
        console.log('test.');
        console.log(evt);
        $(selectOptionDisplay).hide();
      });
      /*==============================================*/
      return $(slectorBox).append($(defualtDisplay)).append($(arrowdown)).append($(selectOptionDisplay));
    }

    /*
    pluginOption {

    }

    */

    const selectorHandle = init();
    this.append($(selectorHandle));

    const legentButton = doCreateLegentCmd();
    this.append($(legentButton));

    /* public method of plugin */
    var output = {
      handle: $this,
      settings: $this.settings,
      getSelectedIndex: doGetRadioSelected,
      setSelectedIndex: doSetRadioSelected,
      setSelectOptions: doSetSelectOptions,
      loadOptions: doPreLoadOptions,
      findIndexOf: doFindIndexOf,
      renderSelectedOption: doRenderSelectedOption,
      selectedIndex: selectedIndex,
      legentButton: legentButton,
      legentContent: doCreateLegentContent
    }

    return output;

  };
}( jQuery ));
