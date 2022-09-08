/*callrad.js*/
const urlQueryToObject = function(url) {
  let result = url.split(/[?&]/).slice(1).map(function(paramPair) {
    return paramPair.split(/=(.+)?/).slice(0, 2);
  }).reduce(function (obj, pairArray) {
    obj[pairArray[0]] = pairArray[1];
    return obj;
  }, {});
  return result;
}

const inputStyleClass = {"font-family": "THSarabunNew", "font-size": "24px"};

const doCallApi = function (apiurl, params) {
 var dfd = $.Deferred();
  $.post(apiurl, params, function(data){
    dfd.resolve(data);
  }).fail(function(error) {
    dfd.reject(error);
  });
  return dfd.promise();
}

function isIE11 () {
  /*
  var myUA = navigator.userAgent.toLowerCase();
  console.log(myUA);
  mozilla/5.0 (windows nt 10.0; wow64; trident/7.0; .net4.0c; .net4.0e; .net clr 2.0.50727; .net clr 3.0.30729; .net clr 3.5.30729; rv:11.0) like gecko
  return (myUA.indexOf('msie') != -1) ? parseInt(myUA.split('msie')[1]) : false;
  */

  var myUA = navigator.userAgent.toLowerCase();
  var test = function(regexp) {return regexp.test(myUA)};
  return test(/rv:11/i);
}

const browser = function() {
  var test = function(regexp) {return regexp.test(window.navigator.userAgent)}
  switch (true) {
    case test(/edg/i): return "Microsoft Edge";
    case test(/trident/i): return "Microsoft Internet Explorer";
    case test(/firefox|fxios/i): return "Mozilla Firefox";
    case test(/opr\//i): return "Opera";
    case test(/ucbrowser/i): return "UC Browser";
    case test(/samsungbrowser/i): return "Samsung Browser";
    case test(/chrome|chromium|crios/i): return "Google Chrome";
    case test(/safari/i): return "Apple Safari";
    default: return "Other";
  }
}

const browserSupport = function(ua){
  if ((ua === 'Google Chrome') || (ua === 'Microsoft Edge') || (ua === 'Mozilla Firefox')) {
    return true;
  } else if (ua === 'Microsoft Internet Explorer') {
    if (isIE11()) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

const initPage = function() {
  $('body').append($('<div id="overlay"><div class="loader"></div></div>'));
  $('body').loading({overlay: $("#overlay"), stoppable: true});

  let queryObj = urlQueryToObject(window.location.href);
  let ua = browser();
  let canSupport = browserSupport(ua);

  if (canSupport) {
    $('body').loading('stop');
    if (queryObj.caseId) {
      window.location.replace('/refer/callradio.html?action=callchat&caseId=' + queryObj.caseId);
    } else {
      window.location.replace('/refer/callradio.html?action=callchat');
    }
  } else {

    const sorryMsg = $('<div></div>');
    $(sorryMsg).append($('<p>โปรดเปลี่ยนไปใช้เว็บบราวส์เซอร์ที่สนับสนุน ซึ่งมีดังนี้</p>'));
    let supportBrowserIcon = $('<div style="position: relative; width: 100%; text-align: center;"></div>');
    $(supportBrowserIcon).appendTo($(sorryMsg));
    let chromeBrowser = $('<div style="padding: 5px; display: inline-block;"><img src="/images/chrome-icon.png" width="100px" height="auto"/><p>Google Chrome ทุกเวอร์ชั่น</p></div>');
    let msedgeBrowser = $('<div style="padding: 5px; display: inline-block;"><img src="/images/msedge-icon.png" width="100px" height="auto"/><p>Microsoft Edge ทุกเวอร์ชั่น</p></div>');
    let firefoxBrowser = $('<div style="padding: 5px; display: inline-block;"><img src="/images/firefox-icon.png" width="100px" height="auto"/><p>Firefox ทุกเวอร์ชั่น</p></div>');
    let iev11Browser = $('<div style="padding: 5px; display: inline-block;"><img src="/images/ie-v11-icon.jpg" width="100px" height="auto"/><p>Microsoft Internet Explorer ตั้งแต่เวอร์ชั่น 11 ขึ้นไป</p></div>');
    $(supportBrowserIcon).append($(chromeBrowser)).append($(msedgeBrowser)).append($(firefoxBrowser)).append($(iev11Browser))
    const radalertoption = {
      title: 'เว็บบราวส์เซอร์ของคุณไม่รองรับการติดต่อรังสีแพทย์ผ่านทางการส่งข้อความ',
      msg: $(sorryMsg),
      width: '560px',
      onOk: function(evt) {
        $(sorryMsg).empty().append($('<p>เราหวังเป็นอย่างยิ่งว่าเราจะได้มีโอกาสรับใช้คุณ เมื่อคุณได้ทำตามที่แนะนำ</p>'));
        setTimeout(function(){
          radAlertBox.closeAlert();
        }, 5000)
      },
      onCancel: function(evt){
        console.log(evt);
      }
    }

    let radAlertBox = $('body').radalert(radalertoption);
    $(radAlertBox.alertBox).css({'max-width': '1000px'});
    $(radAlertBox.cancelCmd).hide();

  }

}

$(document).ready(function() {
	initPage();
});
