/*lk-qrcode.js*/

const fs = require('fs');
const util = require("util");
const path = require("path");
const qrCode = require('qrcode');
const {createCanvas, createImageData} = require('canvas');

const shopDir = path.normalize(__dirname + '/../../../shop');

var log;

const genUniqueID = function () {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return s4() + s4() + s4() + s4();
}

const doCreateLKQRCode = function(lkText) {
  return new Promise(async function(resolve, reject) {
    const maxH = 220;
		const maxW = 220;
		const imageCanvas = createCanvas(maxW, maxH);
		const ctx = imageCanvas.getContext('2d');
		//ctx.globalAlpha = 0.8;
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, maxW, maxH);
		ctx.fill();
    const qrcodeCanvas = createCanvas(200, 200);
    qrCode.toCanvas(qrcodeCanvas, lkText, function (error) {
      ctx.drawImage(qrcodeCanvas, 10, 10, 200, 200);
      let imageFileName = "LKQR-" + genUniqueID();
			let imageFileExName = '.png';
      let imageLink = '/img/usr/qrcode/' + imageFileName + imageFileExName;
			let imagePath =  shopDir + imageLink;
			log.info('imagePath ==> ' + imagePath);
      const out = fs.createWriteStream(imagePath);
			const stream = imageCanvas.createPNGStream();
			stream.pipe(out);
			out.on('finish', () =>  {
				resolve({qrLink: '/shop' + imageLink, qrName: imageFileName});
			});
    });
  });
}

module.exports = (monitor) => {
  log = monitor;
  return {
    doCreateLKQRCode
  }
}
