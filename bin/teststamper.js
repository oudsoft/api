const stamper = require(__dirname + '/../app/lib/imagestamper.js');
console.log(stamper);

var imageBgPath = '../public/img/usr/upload/7dcea12f-727f.jpg';
var stampText = 'TEST';
var imageOutPath = '';

stamper.imageStamper(imageBgPath, stampText, imageOutPath).then((out)=>{
  console.log(out);
});
