/*imagestamper.js*/
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const publicDir = path.normalize(__dirname + '/../../../public');
const qrcodePath = process.env.USRQRCODE_PATH;

const pdfFileExName = '.pdf';
const pngFileExName = '.png';
const outputDir = process.env.AIDOWNLOAD_DIR;
const outputPath = process.env.AIDOWNLOAD_PATH;

var log;

const genUniqueID = function () {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return s4() + s4() + '-' + s4();
}

/*
context.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
img = the image element
sx = source x
sy = source y
sw = source width
sh = source height
dx = destination x
dy = destination y
dw = destination width
dh = destination height

Crop using sx, sy, sw, sh
Resize using dw, dh
*/

const resizeImageToPDF = function(imageSrcDir){
	return new Promise(async function(resolve, reject) {
		const srcCanvas = require('canvas');
		const srcImage = new srcCanvas.Image;
		srcImage.src = imageSrcDir;

		const imageWidth = srcImage.width;
		const imageHeight = srcImage.height;

		const newWidth = imageWidth * 0.5;
		const newHeight = imageHeight * 0.5;

		const {registerFont, createCanvas, createImageData} = require('canvas');
		const pdfCanvas = createCanvas(newWidth, newHeight, 'pdf');

		const ctx = pdfCanvas.getContext('2d');
		ctx.drawImage(srcImage, 0, 0, imageWidth, imageHeight, 0, 0, newWidth, newHeight);

		var pdfFileName = genUniqueID() + pdfFileExName;
    var pdfOutputPath = publicDir + outputPath + '/' + pdfFileName;
		const out = fs.createWriteStream(pdfOutputPath);
    const stream = pdfCanvas.createPDFStream();
		stream.pipe(out);
		out.on('finish', () =>  {
			resolve(outputPath + '/' + pdfFileName);
		});
	});
}

const imageStamperPDF = function(imageBgPath, stampTextJSON){
  return new Promise(async function(resolve, reject) {
    /* output control */
    var pdfFileName = genUniqueID() + pdfFileExName;
    var pdfOutputPath = publicDir + outputPath + '/' + pdfFileName;

    const bgCanvas = require('canvas');
    const {registerFont, createCanvas, createImageData} = require('canvas');
    const bgImage = new bgCanvas.Image;
		bgImage.src = imageBgPath;

		const imageWidth = bgImage.width;
		const imageHeight = bgImage.height;

    const pdfCanvas = createCanvas(imageWidth, imageHeight, 'pdf');

    const ctx = pdfCanvas.getContext('2d');

		ctx.drawImage(bgImage, 0, 0, imageWidth, imageHeight);

		registerFont(publicDir + '/font/THSarabunNew.ttf', { family: 'THSarabunNew' });
    registerFont(publicDir + '/font/EkkamaiStandard-Light.ttf', { family: 'EkkamaiStandard' });

    await stampTextJSON.forEach((stampElem, i) => {
      if (!stampElem.font) {
        ctx.font = 'bold 40px "THSarabunNew"'
      } else {
        ctx.font = stampElem.font
      }
      if (!stampElem.color) {
    		ctx.fillStyle = 'red';
      } else {
        ctx.fillStyle = stampElem.color
      }
      if (!stampElem.align) {
    		ctx.textAlign = 'left';
      } else {
        ctx.textAlign = stampElem.align
      }
      ctx.fillText(stampElem.text, stampElem.x, stampElem.y);
    });

    const out = fs.createWriteStream(pdfOutputPath);
    const stream = pdfCanvas.createPDFStream();
		stream.pipe(out);
		out.on('finish', () =>  {
			resolve(outputPath + '/' + pdfFileName);
		});
  });
}

const imageStamperPNG = function(imageBgPath, stampTextJSON){
  return new Promise(async function(resolve, reject) {
    /* output control */
    var pngFileName = genUniqueID() + pngFileExName;
    var pngOutputPath = publicDir + outputPath + '/' + pngFileName;

    const bgCanvas = require('canvas');
    const {registerFont, createCanvas, createImageData} = require('canvas');
    const bgImage = new bgCanvas.Image;
		bgImage.src = imageBgPath;

		const imageWidth = bgImage.width;
		const imageHeight = bgImage.height;

    const imageCanvas = createCanvas(imageWidth, imageHeight);
		const ctx = imageCanvas.getContext('2d');

		ctx.drawImage(bgImage, 0, 0, imageWidth, imageHeight);

		registerFont(publicDir + '/font/THSarabunNew.ttf', { family: 'THSarabunNew' });
    registerFont(publicDir + '/font/EkkamaiStandard-Light.ttf', { family: 'EkkamaiStandard' });

    await stampTextJSON.forEach((stampElem, i) => {
      if (!stampElem.font) {
        ctx.font = 'bold 40px "THSarabunNew"'
      } else {
        ctx.font = stampElem.font
      }
      if (!stampElem.color) {
    		ctx.fillStyle = 'red';
      } else {
        ctx.fillStyle = stampElem.color
      }
      if (!stampElem.align) {
    		ctx.textAlign = 'left';
      } else {
        ctx.textAlign = stampElem.align
      }
      ctx.fillText(stampElem.text, stampElem.x, stampElem.y);
    });

    const out = fs.createWriteStream(pngOutputPath);
		const stream = imageCanvas.createPNGStream();
		stream.pipe(out);
		out.on('finish', () =>  {
			resolve(outputPath + '/' + pngFileName);
		});
  });
}

const multiImagesToPDF = function(imageCodeList, pdfName){
	return new Promise(async function(resolve, reject) {
		//https://github.com/Automattic/node-canvas
		const bgCanvas = require('canvas');
		const imageBgDir = publicDir  + outputPath + '/' + imageCodeList[0] + '.png';
		log.info('imageBgDir=>' + imageBgDir);
		const bgImage = new bgCanvas.Image;
		bgImage.src = imageBgDir;

		const imageWidth = bgImage.width;
		const imageHeight = bgImage.height;

		const {registerFont, createCanvas, createImageData} = require('canvas');
		const pdfCanvas = createCanvas(imageWidth, imageHeight, 'pdf');

		const ctx = pdfCanvas.getContext('2d');
		ctx.drawImage(bgImage, 0, 0, imageWidth, imageHeight);

		for (let i=1; i < imageCodeList.length; i++){
			let newImage = new bgCanvas.Image;
			newImage.src = publicDir  + outputPath + '/' + imageCodeList[i] + '.png';
			ctx.addPage(imageWidth, imageHeight);
			ctx.drawImage(newImage, 0, 0, imageWidth, imageHeight);
		}

		var pdfFileName = pdfName + pdfFileExName;
		var pdfOutputPath = publicDir + outputPath + '/' + pdfFileName;

		const out = fs.createWriteStream(pdfOutputPath);
		const stream = pdfCanvas.createPDFStream();
		stream.pipe(out);
		out.on('finish', () =>  {
			resolve(outputPath + '/' + pdfFileName);
		});
	});
}

module.exports = function(monitor) {
  log = monitor;
  return {
		resizeImageToPDF,
    imageStamperPDF,
    imageStamperPNG,
		multiImagesToPDF
  }
}
