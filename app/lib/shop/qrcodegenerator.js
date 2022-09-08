const fs = require('fs');
const path = require('path');
const qrCode = require('qrcode');
const {registerFont, createCanvas, createImageData} = require('canvas');

const shopDir = path.normalize(__dirname + '/../../../shop');

registerFont(shopDir + '/font/THSarabunNew.ttf', { family: 'THSarabunNew' });


const qrcodePath = process.env.USRQRCODE_PATH;

const qrGen = (qrContent, filecode) => {
  return new Promise(async function(resolve, reject) {
    const qrcodeCanvas = createCanvas(400, 400);
    const imageCanvas = createCanvas(400, 400);
    const ctx = imageCanvas.getContext('2d');
    qrCode.toCanvas(qrcodeCanvas, qrContent, function (error) {
  		ctx.drawImage(qrcodeCanvas, 0, 0, 400, 400);
      const imageLink = qrcodePath + '/' + filecode + '.png'
      const imagePath = shopDir + imageLink;
      const out = fs.createWriteStream(imagePath);
  		const stream = imageCanvas.createPNGStream();
  		stream.pipe(out);
      out.on('finish', () =>  {
  			resolve({qrlink: '/shop' + imageLink});
  		});
    });
  });
};

module.exports = qrGen;
