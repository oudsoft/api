/* login-form.js */
(function($) {
  $.fn.loginform = function( options ) {
    var settings = $.extend({

    }, options );

    const $this = this;
    const browserSupports = ["chrome", "firefox", "safari", "opera", "edge"];

    //let mainBox = undefined;
    let signinTextBox = undefined;
    let signinYourAccountTextBox = undefined;
    let usernameInputBox = undefined;
    let passwordInputBox = undefined;
    let errorMessageBox = undefined;
    let rememberMeOptionBox = undefined;
    let loginButtonCmd = undefined;
    let registerButtonCmd = undefined;
    let tryLoginCount = 0;

    const doCallLoginApi = function(user) {
      return new Promise(function(resolve, reject) {
        tryLoginCount += 1;
        var loginApiUri = '/api/shop/login/';
        var params = user;
        $.post(loginApiUri, params, function(response){
    			resolve(response);
    		}).catch((err) => {
    			console.log(JSON.stringify(err));
          reject(err);
    		})
    	});
    }

    const doGetCheckUsername = function(username){
  		return new Promise(function(resolve, reject) {
  			var existUsernameApiUri = '/api/shop/users/searchusername/' + username;
  			var params = {username: username};
  			$.get(existUsernameApiUri, params, function(response){
  				resolve(response);
  			}).catch((err) => {
  				console.log(JSON.stringify(err));
  				reject(err);
  			})
  		});
  	}

    const doCallSendResetPwdEmail = function(yourEmail, username, userId) {
  		return new Promise(function(resolve, reject) {
        var existEmailApiUri = '/api/shop/resettask/new';
        var params = {email: yourEmail, username: username, userId: userId};
        $.post(existEmailApiUri, params, function(response){
    			resolve(response);
    		}).catch((err) => {
    			console.log(JSON.stringify(err));
          reject(err);
    		})
    	});
  	}

    const gotoYourPage = function(usertype){
  		let dicomfilter = undefined;
      console.log(usertype);
      switch (usertype) {
        case 1:
          window.location.replace('/shop/setting/admin.html');
          /* รอแก้ bundle ของ admin */
        break;
        case 2:
          //window.location.replace('/case/index.html');
          window.location.replace('/shop/setting/admin.html');
        break;
        case 3:
  				//window.location.replace('/biller/index.html');
          window.location.replace('/shop/setting/admin.html');
        break;
        case 4:
          let isMobileDevice = isMobileDeviceCheck();
          if (isMobileDevice) {
            window.location.replace('/shop/mobile/index.html');
          } else {
            window.location.replace('/shop/setting/admin.html');
          }
          //window.location.replace('/shop/mobile/index.html');
        break;
        case 5:
          //window.location.replace('/refer/index.html');
        break;
        case 8:
          //window.location.replace('/sip/dialcall.html');
        break;
      }
    }

  	const doCheckUserData = function(){
  		let yourToken = localStorage.getItem('token');
  		if (yourToken) {
  			let userdata = localStorage.getItem('userdata');
  			if (userdata !== 'undefined') {
  				userdata = JSON.parse(userdata);
  				if (userdata && userdata.usertype){
            let userAgent = doBrowserDetect();
            if (browserSupports.includes(userAgent)) {
  					  gotoYourPage(userdata.usertype.id);
            } else {
              let bowserNotSupportBox = doCreateUserBowserNotSupportBox();
              $this.append($(bowserNotSupportBox));
            }
  				}
  			}
  		}
  	}

    const isMobileDeviceCheck = function(){
  	  if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
        || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) {
        return true;
  	  } else {
  			return false;
  		}
  	}

    const doBrowserDetect = function(){
       let userAgent = navigator.userAgent;
       let browserName;
       if(userAgent.match(/chrome|chromium|crios/i)){
           browserName = "chrome";
       }else if(userAgent.match(/firefox|fxios/i)){
         browserName = "firefox";
       }  else if(userAgent.match(/safari/i)){
         browserName = "safari";
       }else if(userAgent.match(/opr\//i)){
         browserName = "opera";
       } else if(userAgent.match(/edg/i)){
         browserName = "edge";
       }else{
         browserName="No browser detection";
       }
       return browserName;
    }

    const doCreateSigninTextBox = function(){
      let signinTextBox = $('<div></div>');
      let signinText = $('<h2>เข้าใช้งาน</h2>');
      return $(signinTextBox).append($(signinText));
    }

    const doCreateSigninYourAccountTextBox = function(){
      let signinYourAccountTextBox = $('<div></div>');
      let signinYourAccountText = $('<h3>ล็อกอินเข้าใช้งานด้วยบัญชีของคุณ</h3>');
      return $(signinYourAccountTextBox).append($(signinYourAccountText));
    }

    const doCreateUsernameInputBox = function(){
      let usernameInputBox = $('<div style="position: relative;"></div>');
      let usernameGuideText = $('<h5 style="position: relative; line-height: 0px;">Username <span style="color: red;">*</span></h5>');
      let usernameInput = $('<input type="text" style="position: relative; margin: -50px 0px; width: 100%;"/>');
      $(usernameInput).on('keypress',function(evt) {
        if(evt.which == 13) {
          doUserClickLogin();
        };
      });
      let lastStorageOption = localStorage.getItem('rememberme');
      if (lastStorageOption == 1) {
        let lastStorageUsername = localStorage.getItem('username');
        $(usernameInput).val(lastStorageUsername);
      }
      return $(usernameInputBox).append($(usernameGuideText)).append($(usernameInput));
    }

    const doCreatePasswordInputBox = function(){
      let passwordInputBox = $('<div style="position: relative;"></div>');
      let passwordGuideText = $('<h5 style="line-height: 0px;">Password <span style="color: red;">*</span></h5>');
      let passwordInput = $('<input type="password" style="width: 100%; margin-top: -50px;"/>');
      $(passwordInput).on('keypress',function(evt) {
        if(evt.which == 13) {
          doUserClickLogin();
        };
      });
      /*
      let lastStorageOption = localStorage.getItem('rememberme');
      if (lastStorageOption == 1) {
        let lastStoragePassword = localStorage.getItem('password');
        $(usernameInput).val(lastStoragePassword);
      }
      */
      return $(passwordInputBox).append($(passwordGuideText)).append($(passwordInput));
    }

    const doCreateLoginErrorMessageBox = function(){
      let errorMessageBox = $('<div style="display: none; line-height: 4px;"></div>');
      let errorMessageText = $('<h5 class="errormessage" style="color: red; line-height: 14px;">Error...</h5>');
      return $(errorMessageBox).append($(errorMessageText));
    }

    const doCreateRememberMeOptionBox = function(){
      let rememberMeOptionBox = $('<div style="margin-top: 10px;"></div>');
      let optionBox = $('<input type="checkbox" id="RememberMe" value="1"/>');
      let labelBox = $('<label for="RememberMe" style="margin-left: 5px;">จดจำบัญชีใช้งานของฉันไว้ในอุปกรณ์นี้</label>');
      let lastStorageOption = localStorage.getItem('rememberme');
      if (lastStorageOption == 1) {
        $(optionBox).prop("checked", true);
      }
      return $(rememberMeOptionBox).append($(optionBox)).append($(labelBox));
    }

    const doCreateLoginButtonCmd = function(){
      let loginButtonCmd = $('<input type="button" value=" ล็อกอิน " style="width: 100%; margin-top: 20px;"/>');
      $(loginButtonCmd).css({'background-color': '#184175', 'color': 'white'}); //#2F4646
      $(loginButtonCmd).on('click', (evt)=>{
        doUserClickLogin();
      });
      return $(loginButtonCmd);
    }

    const doCreateRegisterButtonCmd = function(){
      let registerButtonCmd = $('<input type="button" value=" ลงทะเบียน " style="width: 100%; margin-top: 20px;"/>');
      $(registerButtonCmd).css({'background-color': '#184175', 'color': 'white'}); //#2F4646
      $(registerButtonCmd).on('click', (evt)=>{
        window.location.replace('/shop/reg/');
      });
      return $(registerButtonCmd);
    }

    const doCreateForgotMyPassword = function(username, userEmail, userId){
      let linkCmd = $('<a href="#" style="position: relative; line-height: 0px; margin-top: 60px;">I have forgot my password.</a>');
      $(linkCmd).on('click', (evt)=>{
        doCallSendResetPwdEmail(userEmail, username, userId).then((sendRes)=>{
          let sendEmailResBox = $('<div style="position: relative; width: 100%; padding: 10px; background-color: white; border-radius: 10px; border: 2px solid red;"></div>');
          let resText = '<p>ระบบฯ ได้ส่งลิงค์สำหรับรีเซ็ตรหัสผ่านไปทางอีเมล์ <b>'+ userEmail + '</b> เรียบร้อยแล้ว โปรดตรวจสอบ ที่กล่องอีเมล์ของคุณ</p>';
          resText += '<p><b>คุณมีเวลาสำหรับรีเซ็ตรหัสผ่าน 1 ชม. นับจากนี้</b></p>';
          $(sendEmailResBox).append($(resText));
          $(sendEmailResBox).insertBefore($(loginButtonCmd));
          $(linkCmd).remove();
        });
      });
      return $(linkCmd);
    }

    const doUserClickLogin = function(){
      let errorMsgBox = $(errorMessageBox);
      let username = $(usernameInputBox).find('input').val();
      let password = $(passwordInputBox).find('input').val();
      if (username !== '') {
        $(usernameInputBox).find('input').css('border', '');
        $(errorMsgBox).find('.errormessage').text('');
        $(errorMsgBox).hide();
        if (password !== '') {
          $(passwordInputBox).find('input').css('border', '');
          $(errorMsgBox).find('.errormessage').text('');
          $(errorMsgBox).hide();
          let user = {username: username, password: password};
          doCallLoginApi(user).then(async (response) => {
            if (response.success == false) {
              if (tryLoginCount == 4) {
                doGetCheckUsername(username).then((existRes)=>{
                  if ((existRes.result == true) && (existRes.email !== '')  && (existRes.id)) {
                    let forgotLink = doCreateForgotMyPassword(username, existRes.email, existRes.id);
                    $(forgotLink).insertBefore($(loginButtonCmd));

                    let errorMsg = 'We are sorry, Your password Incorrect.'
                    $(passwordInputBox).find('input').css('border', '1px solid red');
                    $(errorMsgBox).find('.errormessage').text('').text(errorMsg);
                    $(errorMsgBox).show();
                  }
                });
              } else {
                let errorMsg = 'We are sorry, Your username or password is not correct.'
                $(usernameInputBox).find('input').css('border', '1px solid red');
                $(passwordInputBox).find('input').css('border', '1px solid red');
                $(errorMsgBox).find('.errormessage').text('').text(errorMsg);
                $(errorMsgBox).show();
              }
            } else {
              $(usernameInputBox).find('input').css('border', '');
              $(passwordInputBox).find('input').css('border', '');
              $(errorMsgBox).find('.errormessage').text('');
              $(errorMsgBox).hide();

              let usertype = response.data.usertype.id;

              localStorage.setItem('token', response.token);
    					localStorage.setItem('userdata', JSON.stringify(response.data));
      				const defualtSettings = {"itemperpage" : "20"};
      				localStorage.setItem('defualsettings', JSON.stringify(defualtSettings));

              let rememberMeOption = $(rememberMeOptionBox).find('input').prop("checked");
              if (rememberMeOption == true) {
    						localStorage.setItem('rememberme', 1);
                localStorage.setItem('username', username);
                //localStorage.setItem('password', password);
    					} else {
    						localStorage.setItem('rememberme', 0);
    					}

              sessionStorage.setItem('logged', true);

    					let queryObj = urlQueryToObject(window.location.href);
              if (queryObj.action) {
    						if (queryObj.action === 'callchat'){
    							let caseId = queryObj.caseId;
    							window.location.replace('/refer/callradio.html?caseId=' + caseId);
    						}
    					} else {
              	gotoYourPage(usertype);
    					}
            }
          });
        } else {
          let errorMsg = 'Please enter your password.'
          $(passwordInputBox).find('input').css('border', '1px solid red');
          $(errorMsgBox).find('.errormessage').text('').text(errorMsg);
          $(errorMsgBox).show();
        }
      } else {
        let errorMsg = 'Please enter your username.'
        $(usernameInputBox).find('input').css('border', '1px solid red');
        $(errorMsgBox).find('.errormessage').text('').text(errorMsg);
        $(errorMsgBox).show();
      }
    }

    const doCreateUserBowserNotSupportBox = function(){
      let notSupportBox = $('<div><h3>โปรดเปลี่ยน Browser เป็น Google Chrome, Firefox หรือ MS Edge</h3></div>');
      return $(notSupportBox)
    }

    const init = function() {
      $this.css({'position': 'relative', 'width': '50%', 'text-align': 'left', 'margin-left': 'auto', 'margin-right': 'auto'});
      signinTextBox = doCreateSigninTextBox();
      signinYourAccountTextBox = doCreateSigninYourAccountTextBox();
      usernameInputBox = doCreateUsernameInputBox();
      passwordInputBox = doCreatePasswordInputBox();
      errorMessageBox = doCreateLoginErrorMessageBox();
      rememberMeOptionBox = doCreateRememberMeOptionBox();
      loginButtonCmd = doCreateLoginButtonCmd();
      registerButtonCmd = doCreateRegisterButtonCmd();
      let isMobileDevice = isMobileDeviceCheck();
      if (isMobileDevice) {
        $this.append($(usernameInputBox)).append($(passwordInputBox));
        return $this.append($(errorMessageBox)).append($(rememberMeOptionBox)).append($(loginButtonCmd)).append($(registerButtonCmd));
      } else {
        $this.append($(signinTextBox)).append($(signinYourAccountTextBox));
        $this.append($(usernameInputBox)).append($(passwordInputBox));
        return $this.append($(errorMessageBox)).append($(rememberMeOptionBox)).append($(loginButtonCmd)).append($(registerButtonCmd));
      }
    }

    init();

    var output = {
      settings: settings,
      handle: this,
      signinTextBox: signinTextBox,
      signinYourAccountTextBox: signinYourAccountTextBox,
      usernameInputBox: usernameInputBox,
      passwordInputBox: passwordInputBox,
      errorMessageBox: errorMessageBox,
      rememberMeOptionBox: rememberMeOptionBox,
      loginButtonCmd: loginButtonCmd,
      doUserClickLogin: doUserClickLogin,
      isMobileDevice: isMobileDeviceCheck
    }

    return output;

  };

})(jQuery);

(()=>{

  const loginBox = $('<div id="LoginForm"></div>');
  //$(loginBox).css({'position': 'relative', 'width': '100%', 'text-align': 'center'});

  const radconnextOption = {};
  const myRadconnextLoginForm = $(loginBox).loginform(radconnextOption);

  return myRadconnextLoginForm;

})();
