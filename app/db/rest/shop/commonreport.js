const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const requester = require('request');
const PDFParser = require('pdf2json');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const cheerio = require('cheerio');
const exec = require('child_process').exec;
const THBText = require('thai-baht-text');

var log, db, ppQRgen;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const runcommand = function (command) {
	return new Promise(function(resolve, reject) {
		exec(command, (error, stdout, stderr) => {
			if(error === null) {
				resolve(`${stdout}`);
			} else {
				reject(`${stderr}`);
			}
    });
	});
}

const billFieldOptions = [
  {name_en: 'shop_name', name_th: 'ชื่อร้านค้า'},
  {name_en: 'shop_address', name_th: 'ที่อยู่ร้านค้า'},
  {name_en: 'shop_tel', name_th: 'เบอร์โทรศัพท์ร้านค้า'},
  {name_en: 'shop_mail', name_th: 'อีเมล์ร้านค้า'},
  {name_en: 'shop_vatno', name_th: 'หมายเลขผู้เสียภาษีร้านค้า'},

  {name_en: 'customer_name', name_th: 'ชื่อลูกค้า'},
  {name_en: 'customer_address', name_th: 'ที่อยู่ลูกค้า'},
  {name_en: 'customer_tel', name_th: 'เบอร์โทรศัพท์ลูกค้า'},

  {name_en: 'order_no', name_th: 'หมายเลขออร์เดอร์'},
  {name_en: 'order_by', name_th: 'ผู้สั่งออร์เดอร์'},
  {name_en: 'order_datetime', name_th: 'วันเวลาสั่งออร์เดอร์'},

  {name_en: 'print_no', name_th: 'หมายเลขใบแจ้งหนี้/ใบเสร็จ/ใบกำกับภาษี'},
  {name_en: 'print_by', name_th: 'ผู้ออกเอกสาร'},
  {name_en: 'print_datetime', name_th: 'วันที่เวลาออกเอกสาร'},
	{name_en: 'print_date', name_th: 'วันที่ออกเอกสาร'},
	{name_en: 'print_time', name_th: 'เวลาออกเอกสาร'},

  {name_en: 'gooditem_no', name_th: 'เลขลำดับที่'},
  {name_en: 'gooditem_name', name_th: 'ชื่อสินค้า'},
  {name_en: 'gooditem_unit', name_th: 'หน่วยขายสินค้า'},
  {name_en: 'gooditem_price', name_th: 'ราคาสินค้าต่อหน่วย'},
  {name_en: 'gooditem_qty', name_th: 'จำนวนสินค้า'},
  {name_en: 'gooditem_total', name_th: 'จำนวนเงินของรายการสินค้า'},

  {name_en: 'total', name_th: 'รวมค่าสินค้า'},
  {name_en: 'discount', name_th: 'ส่วนลด'},
  {name_en: 'vat', name_th: 'ภาษีมูลค่าเพิ่ม 7%'},
  {name_en: 'grandtotal', name_th: 'รวมทั้งหมด'},

  {name_en: 'paytype', name_th: 'ชำระโดย'},
  {name_en: 'payamount', name_th: 'จำนวนเงินที่ชำระ'},
  {name_en: 'cashchange', name_th: 'เงินทอน'},

	{name_en: 'baht_word', name_th: 'จำนวนบาทตัวอักษร'}
]

const monthTHNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const fmtStr = function (str) {
  var args = [].slice.call(arguments, 1);
  var i = 0;
  return str.replace(/%s/g, () => args[i++]);
}

const formatDateTimeStr = function(dt){
	const offset = 7;
	let d = new Date(dt);
	//สำหรับ timezone = Etc/UTC
	let utc = d.getTime();
	d = new Date(utc + (3600000 * offset));
	//สำหรับ timezone = Asia/Bangkok
	//d.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
	var yy, mm, dd, hh, mn, ss;
	yy = d.getFullYear();
	if (d.getMonth() + 1 < 10) {
		mm = '0' + (d.getMonth() + 1);
	} else {
		mm = '' + (d.getMonth() + 1);
	}
	if (d.getDate() < 10) {
		dd = '0' + d.getDate();
	} else {
		dd = '' + d.getDate();
	}
	if (d.getHours() < 10) {
		hh = '0' + d.getHours();
	} else {
		 hh = '' + d.getHours();
	}
	if (d.getMinutes() < 10){
		 mn = '0' + d.getMinutes();
	} else {
		mn = '' + d.getMinutes();
	}
	if (d.getSeconds() < 10) {
		 ss = '0' + d.getSeconds();
	} else {
		ss = '' + d.getSeconds();
	}
	var td = `${yy}-${mm}-${dd}T${hh}:${mn}:${ss}`;
	return td;
}

const doFormateDateTimeThaiZone = function(unFormatDateTime){
	let fmtDate = formatDateTimeStr(unFormatDateTime);
	let datetime = fmtDate.split('T');
	let dateSegment = datetime[0].split('-');
	dateSegment = dateSegment.join('');
	let date = formatStudyDate(dateSegment);
	let time = formatStudyTime(datetime[1].split(':').join(''));
	return fmtStr('%s %s', date, time);
}

const doFormateDateThaiZone = function(unFormatDateTime){
	let fmtDate = formatDateTimeStr(unFormatDateTime);
	let datetime = fmtDate.split('T');
	let dateSegment = datetime[0].split('-');
	dateSegment = dateSegment.join('');
	let date = formatStudyDate(dateSegment);
	return date;
	/*
	let time = formatStudyTime(datetime[1].split(':').join(''));
	return fmtStr('%s %s', date, time);
	*/
}

const doFormateTimeThaiZone = function(unFormatDateTime){
	let fmtDate = formatDateTimeStr(unFormatDateTime);
	let datetime = fmtDate.split('T');
	/*
	let dateSegment = datetime[0].split('-');
	dateSegment = dateSegment.join('');
	let date = formatStudyDate(dateSegment);
	*/
	let time = formatStudyTime(datetime[1].split(':').join(''));
	return time;
	/*
	return fmtStr('%s %s', date, time);
	*/
}

const formatStudyDate = function(studydateStr){
	if (studydateStr.length >= 8) {
		var yy = studydateStr.substr(0, 4);
		var mo = studydateStr.substr(4, 2);
		var dd = studydateStr.substr(6, 2);
		var stddf = yy + '-' + mo + '-' + dd;
		var stdDate = new Date(stddf);
		//var month = stdDate.toLocaleString('default', { month: 'short' });
		var month = monthTHNames[Number(mo)-1];
		return Number(dd) + ' ' + month + ' ' + yy;
	} else {
		return studydateStr;
	}
}

const formatStudyTime = function(studytimeStr){
	if (studytimeStr.length >= 4) {
		var hh = studytimeStr.substr(0, 2);
		var mn = studytimeStr.substr(2, 2);
		return hh + '.' + mn;
	} else {
		return studytimeStr;
	}
}

const doCountPagePdf = function(pdfFile){
  return new Promise(function(resolve, reject) {
    let pdfParser = new PDFParser();
    pdfParser.on('pdfParser_dataReady', function(data) {
      let pageCount = data && data.Pages && data.Pages.length ? data.Pages.length : 0;
      resolve(pageCount);
    });
    pdfParser.loadPDF(pdfFile);
  });
}

const doFindGooditemTableHight = function(shopId, docType, googItems){
  return new Promise(async function(resolve, reject) {
    const templates = await db.templates.findAll({ attributes: ['TypeId', 'Content', 'PaperSize'], where: {shopId: shopId, TypeId: docType}});
    const reportElements = templates[0].Content;
    const gooditemsTable = await reportElements.find((element)=>{
      if (element.elementType == 'table'){
        return element;
      }
    });
		const tableTop = gooditemsTable.y;
    const compensatValue = 6;
    const gooditemRows = gooditemsTable.rows;
		let tableHeight = 0;
    let totalHeight = 0;
    const promiseList = new Promise(async function(resolve2, reject2) {
      for (let i=0; i < gooditemRows.length; i++){
        if (gooditemRows[i].id == 'dataRow') {
					tableHeight += Number(gooditemRows[i].fields[0].height);
          totalHeight += (Number(gooditemRows[i].fields[0].fontsize) + compensatValue) * googItems.length;
        } else {
					tableHeight += Number(gooditemRows[i].fields[0].height);
          totalHeight += (Number(gooditemRows[i].fields[0].fontsize) + compensatValue);
        }
      }
      setTimeout(()=> {
        resolve2({top: tableTop, height: {real: totalHeight, template: tableHeight}});
      },1800);
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
    });
  });
}

const doLoadVariable = function(docType, orderId, docNo){
  return new Promise(async function(resolve, reject) {
    /*
      docType
      1=invoices
      2=bill
      3=taxinvoice
    */
    const userInfoModel = {model: db.userinfoes, attributes: ['id', 'User_NameEN', 'User_LastNameEN', 'User_NameTH', 'User_LastNameTH']};
    const shopModel = {model: db.shops, attributes: ['id', 'Shop_Name', 'Shop_Address', 'Shop_Tel', 'Shop_Mail', 'Shop_LogoFilename', 'Shop_VatNo']};
    const customerModel = {model: db.customers, attributes: ['id', 'Name', 'Address', 'Tel']};
    const paytypeModel = {model: db.paytypes, attributes: ['id', 'NameTH']};
    const orderInclude = [shopModel, userInfoModel, customerModel];
    const docInclude = [userInfoModel];
    const paymentInclude = [paytypeModel];
    try {
      const orders = await db.orders.findAll({include: orderInclude, where: {id: orderId}});
      let docs = undefined;
      if (docType == 1) {
        docs = await db.invoices.findAll({include: docInclude, where: {orderId: orderId}});
      } else if (docType == 2) {
        docs = await db.bills.findAll({include: docInclude, where: {orderId: orderId}});
      } else if (docType == 3) {
        docs = await db.taxinvoices.findAll({include: docInclude, where: {orderId: orderId}});
      }
      let payments = await db.payments.findAll({include: paymentInclude, where: {orderId: orderId}});
      let total = 0;
      await orders[0].Items.forEach((item, i) => {
        total += Number(item.Price) * Number(item.Qty);
      });

      let grandtotal = (total - Number(docs[0].Discount)) + Number(docs[0].Vat)
      let rs = await doFindGooditemTableHight(orders[0].shopId, docType, orders[0].Items);

      const variable = {
        shop_name: orders[0].shop.Shop_Name,
        shop_address: orders[0].shop.Shop_Address,
        shop_tel: orders[0].shop.Shop_Tel,
        shop_mail: orders[0].shop.Shop_Mail,
        shop_vatno: orders[0].shop.Shop_VatNo,
        customer_name: orders[0].customer.Name,
        customer_address: ((orders[0].customer.Address) && (orders[0].customer.Address != ''))?orders[0].customer.Address:'-',
        customer_tel: ((orders[0].customer.Tel) && (orders[0].customer.Tel != ''))?orders[0].customer.Tel:'-',
        order_no: orderId,
        order_by: orders[0].userinfo.User_NameTH + ' ' + orders[0].userinfo.User_LastNameTH,
        order_datetime: doFormateDateTimeThaiZone(orders[0].createdAt),

        print_no: docs[0].No,
        print_by: docs[0].userinfo.User_NameTH + ' ' + docs[0].userinfo.User_LastNameTH,
        print_datetime: doFormateDateTimeThaiZone(docs[0].createdAt),
				print_date: doFormateDateThaiZone(docs[0].createdAt),
				print_time: doFormateTimeThaiZone(docs[0].createdAt),
				print_filename: docs[0].Filename,
				print_status: orders[0].Status,
        /*
        gooditem_no', name_th: 'เลขลำดับที่'},
        gooditem_name', name_th: 'ชื่อสินค้า'},
        gooditem_unit', name_th: 'หน่วยขายสินค้า'},
        gooditem_price', name_th: 'ราคาสินค้าต่อหน่วย'},
        gooditem_qty', name_th: 'จำนวนสินค้า'},
        gooditem_total', name_th: 'จำนวนเงินของรายการสินค้า'},
        */
        gooditems: orders[0].Items,

        total: total,
        discount: docs[0].Discount,
        vat: docs[0].Vat,
        grandtotal: grandtotal,

				baht_word: THBText(grandtotal),

        rsDimension: rs
      };

      if ((payments) && (payments.length > 0)) {
        variable.paytype = payments[0].paytype.NameTH;
        variable.payamount = payments[0].Amount;
        variable.cashchange =  Number(payments[0].Amount) - grandtotal;
      }

      resolve(variable);
    } catch(error) {
      log.error('doLoadVariable error => ' + error);
      reject({error: error});
    }
  });
}

const reportCreator = function(elements, variable, pdfFileName, orderId, rsH, rsT, paperSize){
	return new Promise(async function(resolve, reject) {
		const publicDir = path.normalize(__dirname + '/../../../../public');
    const shopDir = path.normalize(__dirname + '/../../../../shop');
		//const fs = require("fs");
		const fileNames = pdfFileName.split('.');
		const filecode = fileNames[0];
		const qrgenerator = require('../../../lib/shop/qrcodegenerator.js');
		const qrcontent = 'https://radconnext.tech/shop/img/usr/pdf/' + pdfFileName;

    const qrcodeFullPath = shopDir + process.env.USRQRCODE_PATH + '/' + filecode + '.png';
    if (fs.existsSync(qrcodeFullPath)) {
      await fs.unlinkSync(qrcodeFullPath);
    }
    log.info('qrcodeFullPath=>' + qrcodeFullPath);

		let qrcode = await qrgenerator(qrcontent, filecode);
		let qrlink = qrcode.qrlink;


		let usrPdfPath = shopDir + process.env.USRPDF_PATH;
		let htmlFileName = fileNames[0] + '.html';
		let reportHtmlLinkPath = process.env.USRPDF_PATH + '/' + htmlFileName;

		if (fs.existsSync(usrPdfPath + '/' + htmlFileName)) {
	    //await runcommand('rm ' + usrPdfPath + '/' + htmlFileName);
			await fs.unlinkSync(usrPdfPath + '/' + htmlFileName);
	  }
		if (fs.existsSync(usrPdfPath + '/' + pdfFileName)) {
			//await runcommand('rm ' + usrPdfPath + '/' + pdfFileName);
			await fs.unlinkSync(usrPdfPath + '/' + pdfFileName);
		}

		var html = '<!DOCTYPE html><head></head><body><div id="report-wrapper"></div></body>';
		var _window = new JSDOM(html, { runScripts: "dangerously", resources: "usable" }).window;
		/* ************************************************************************* */
		/* Add scripts to head ***************************************************** */
		var jsFiles = [
					shopDir + '/lib/jquery.js',
					shopDir + '/lib/jquery-ui.min.js',
					shopDir + '/lib/plugin/jquery-report-element-plugin.js',
					shopDir + '/lib/report-generator.js'
				];
		var scriptsContent = ``;
		for(var i =0; i< jsFiles.length;i++){
			let scriptContent = fs.readFileSync( jsFiles[i], 'utf8');
			scriptsContent = scriptsContent + `
			/* ******************************************************************************************* */
			/* `+jsFiles[i]+` **************************************************************************** */
			`+scriptContent;
		};
		let scriptElement = _window.document.createElement('script');
		scriptElement.textContent = scriptsContent;
		_window.document.head.appendChild(scriptElement);

		/* ************************************************************************* */
		/* Run page **************************************************************** */
		_window.document.addEventListener('DOMContentLoaded', () => {
			log.info('main says: DOMContentLoaded');
			// We need to delay one extra turn because we are the first DOMContentLoaded listener,
			// but we want to execute this code only after the second DOMContentLoaded listener
			// (added by external.js) fires.
			//_window.sayBye('OK Boy'); // prints "say-hello.js says: Good bye!"
			//_window.doSetReportParams(hospitalId, caseId, userId);
			log.info("Start Create Html Report.");
			_window.doCreateReportDOM(elements, variable, qrlink, orderId, paperSize, async (reportHTML, maxTop) =>{
				/******/
        let htmlFilePath = usrPdfPath + '/' + htmlFileName;
				let writerStream = fs.createWriteStream(htmlFilePath);
				let wrapperWidth = undefined;
				if (paperSize == 1){
					wrapperWidth = 1004;
				} else if (paperSize = 2) {
					wrapperWidth = 374;
				}
				let reportContent = '<!DOCTYPE html>\n<html>\n<head>\n<link href="../../../stylesheets/report.css" rel="stylesheet">\n<style>body {font-family: "Kanit", sans-serif;}\n#report-wrapper {width: ' + wrapperWidth + 'px; height: auto;}\n</style>\n</head>\n<body>\n<div id="report-wrapper">\n' + reportHTML + '\n</div>\n</body>\n</html>';
				writerStream.write(reportContent,'UTF8');
				writerStream.end();
				writerStream.on('finish', function() {
          log.info("Write HTML Report file completed.");
          //_window.doCheckContent();

          log.info("Start Create Pdf Report.");

          const shopPdfPath = shopDir + process.env.USRPDF_PATH;
					const reportPdfFilePath = shopPdfPath + '/' + pdfFileName;
					const reportPdfLinkPath = '/shop' + process.env.USRPDF_PATH + '/' + pdfFileName;

					let creatReportCommand = undefined;
					if (paperSize == 1){
						creatReportCommand = fmtStr('wkhtmltopdf -s A4 -T 10 -B 5 -L 10 -R 10 http://localhost:8088/shop%s %s', reportHtmlLinkPath, reportPdfFilePath);
					} else if (paperSize = 2) {
						let paperWidth = 80;
						let paperHeight = (paperWidth/wrapperWidth) * maxTop;
						creatReportCommand = fmtStr('wkhtmltopdf --page-width %s --page-height %s -T 10 -B 10 -L 10 -R 10 http://localhost:8088/shop%s %s', paperWidth, paperHeight, reportHtmlLinkPath, reportPdfFilePath);
					}
					log.info('Create pdf report file with command => ' + creatReportCommand);
					runcommand(creatReportCommand).then(async (cmdout) => {
            let pdfPage = await doCountPagePdf(reportPdfFilePath);
            log.info('pdfPage=> ' + pdfPage);
						log.info("Create Pdf Report file Success.");
						let htmlFilePath = usrPdfPath + '/' + htmlFileName;
						let pngFileName = fileNames[0] + '.png';
						let reportPNGFilePath = usrPdfPath + '/' + pngFileName;
						//let createReportPNGCommnand = fmtStr('convert -density 288 %s -resize 25% %s', reportPdfFilePath, reportPNGFilePath);
						let createReportPNGCommnand = fmtStr('convert -density 288 %s %s', reportPdfFilePath, reportPNGFilePath);
						await runcommand(createReportPNGCommnand);
						reportHtmlLinkPath = '/shop' + reportHtmlLinkPath;
						let reportPNGLinkPath = '/shop' + process.env.USRPDF_PATH + '/' + pngFileName;
						resolve({reportPdfLinkPath: reportPdfLinkPath, reportHtmlLinkPath: reportHtmlLinkPath, reportPNGLinkPath: reportPNGLinkPath, reportPages: pdfPage, qrLink: qrlink});
					}).catch((cmderr) => {
						log.error('cmderr: 500 >>', cmderr);
						reject(cmderr);
					});

        });
				writerStream.on('error', function(err){ log.error(err.stack); });
			});
		});
	});
}

const doCanUpdateOrederStatus = function(from, docType){
	if (from == 1) {
		return true;
	} else if (from == 2) {
		if (docType == 1) {
			return false
		} else {
			return true;
		}
	} else if (from == 3) {
		if (docType == 3) {
			return true
		} else {
			return false;
		}
	} else if (from == 4) {
		return false;
	}
}

const doFindNewOrderStatus = function(docType){
	let orderNewStatus = 1;
	if (docType == 1) {
		orderNewStatus = 2;
	} else if (docType == 2) {
		orderNewStatus = 3;
	} else if (docType == 3) {
		orderNewStatus = 4;
	}
	return orderNewStatus;
}

const doCreateReport = function(orderId, docType, shopId){
  return new Promise(async function(resolve, reject) {
		const reportVar = await doLoadVariable(docType, orderId);
		const rsH = parseFloat(reportVar.rsDimension.height.real);
		const rsT = parseFloat(reportVar.rsDimension.top);
		const pdfFileName = reportVar.print_filename;
		const shops = await db.shops.findAll({ attributes: ['Shop_PromptPayNo', 'Shop_PromptPayName'], where: {id: shopId}});
		let qr = undefined;
		if ((docType == 1) || (docType == 2)) {
			if ((shops.length > 0) && (shops[0].Shop_PromptPayNo !== '') && (shops[0].Shop_PromptPayName !== '')) {
				let ppType = undefined;
				if (shops[0].Shop_PromptPayNo.length == 10) {
					ppType = '01';
				} else if (shops[0].Shop_PromptPayNo.length == 13) {
					ppType = '02';
				}
				if (ppType) {
					let ppNames = shops[0].Shop_PromptPayName.split(' ');
					let ppData = {
					  ppaytype: ppType,
					  ppayno: shops[0].Shop_PromptPayNo,
					  netAmount: reportVar.grandtotal,
					  fname: ppNames[0],
					  lname: ppNames[1],
					}
					qr = await ppQRgen.doCreatePPQRCode(ppData);
				}
			}
		}
		const templates = await db.templates.findAll({ attributes: ['TypeId', 'Content', 'PaperSize'], where: {shopId: shopId, TypeId: docType}});
		if (templates.length > 0) {
	    let reportElements = templates[0].Content;
	    let paperSize = templates[0].PaperSize;
			let docReport = undefined;
			if (qr) {
				let qrElem = doCreatePPQRElelment(qr.qrLink, '*', '*', '*', '*');
				reportElements.push(qrElem);
				docReport = await reportCreator(reportElements, reportVar, pdfFileName, orderId, rsH, rsT, paperSize);
			} else {
	    	docReport = await reportCreator(reportElements, reportVar, pdfFileName, orderId, rsH, rsT, paperSize);
			}

			let doc = {link: docReport.reportPdfLinkPath, pagecount: docReport.reportPages, qrLink: docReport.qrLink, pngLink: docReport.reportPNGLinkPath};
			if (qr) {
				doc.ppLink = qr.qrLink;
			}
	    resolve({status: {code: 200}, doc: doc});

			let from = reportVar.print_status;
			let canUpdateStatus = doCanUpdateOrederStatus(from, docType);
			if (canUpdateStatus) {
				let orderNewStatus = doFindNewOrderStatus(docType);
				await db.orders.update({Status: orderNewStatus}, { where: { id: orderId } });
			}
		} else {
			resolve({status: {code: 300}, doc: {}});
		}
  });
}

const doCreatePPQRElelment = function(qrUrl, top, left, width, height){
	let qrElem = {
		elementType: "image",
		type: "dynamic",
		x: left,
		y: top,
		width: width,
		height: height,
		id: "image-element-PPQR",
		url: qrUrl,
		elementselect: "",
		elementdrop: "",
		elementresizestop: "",
		refresh: ""
	};
	return qrElem;
}

module.exports = (dbconn, monitor) => {
	db = dbconn;
	log = monitor;
	ppQRgen = require('../../../lib/shop/pp-qrcode.js')(log);
  return {
    billFieldOptions,
    doLoadVariable,
    reportCreator,
    doCreateReport
  }
}
