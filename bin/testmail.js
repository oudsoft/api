const nodemailer = require('nodemailer');

const sendActivateAccountEmail = function(email, username){
    return new Promise(async function(resolve, reject) {
      var transporter = nodemailer.createTransport({
        /*
        https://myaccount.google.com/security
        */
        //host: 'smtp.gmail.com',
        host: 'win05-mail.zth.netdesignhost.com',
        port: 465,
        secure: true,
        auth: {
          /*
          user: 'oudsoft@gmail.com',
          pass: 'oud@2515'
          */
          user: 'radconnext@smartmedinfo.co.th',
          pass: 'Radconnext@2515'

        }
      });

      var mailOptions = {
        from: 'radconnext@smartmedinfo.co.th',
        to: email,
        subject: '[no-reply]-Activate Account at Radconnext.info',
        //text: 'That was easy!'
        html: '<p><a href="https://radconnext.info/form/activatetask.html?taskId=' + email + '&username=' + username + '">คลิกที่นี่</a>เพื่อ Active บัญขีใช้งานของคุณ</p>'
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          reject(error);
        } else {
          resolve(info.response);
        }
      });
    });
}

sendActivateAccountEmail('oudsoft@gmail.com', 'test').then((sendRes)=>{
	console.log(sendRes);
});
