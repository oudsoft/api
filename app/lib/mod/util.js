const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const request = require('request-promise');
const fetch = require('node-fetch');
const exec = require('child_process').exec;
const cron = require('node-cron');

var log, db;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const TZ = 'Asia/Bangkok';

//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const proxyRequest = function(rqParam) {
	return new Promise(function(resolve, reject) {
		let rqBody = JSON.stringify(rqParam.body);
		let proxyParams = {
			method: rqParam.method,
			url: rqParam.uri,
			auth: rqParam.auth,
			headers: {
				'Content-Type': 'application/json'
			},
			body: rqBody
		};
		if (rqParam.Authorization) {
			proxyParams.headers.Authorization = rqParam.Authorization;
		}
		log.info('proxyParams=>' + JSON.stringify(proxyParams));
		request(proxyParams, (err, res, body) => {
			if (!err) {
				resolve({status: {code: 200}, res: res});
			} else {
				log.error('your Request Error=>' + JSON.stringify(err));
				reject({status: {code: 500}, err: err});
			}
		});
	});
}

const runcommand = function (command) {
	return new Promise(function(resolve, reject) {
		log.info(new Date()  + " Command " + command);
		exec(command, (error, stdout, stderr) => {
			if(error === null) {
				//logger().info(new Date()  + " Resolve " + `${stdout}`);
				resolve(`${stdout}`);
			} else {
				//logger().error(new Date()  + " Reject " + `${stderr}`);
				reject(`${stderr}`);
			}
    });
	});
}

const fmtStr = function (str) {
  var args = [].slice.call(arguments, 1);
  var i = 0;
  return str.replace(/%s/g, () => args[i++]);
}

const doLoadOrthancTarget = function(hospitalId, hostname){
	return new Promise(async function(resolve, reject) {
		//log.info('hostname => ' + hostname);
		if ((hostname === 'localhost') || (hostname.indexOf('192.168') >= 0)){
			const myCloud = {os: "docker-linux", ip: "150.95.26.106", httpport: "8042", user: "demo", pass: "demo", portex : "9046", ipex: "150.95.26.106", dicomportex : "9245", dbname: 'orthancvirach'};
			if (hospitalId == 2) {
				myCloud.httpport = "8043";
				myCloud.portex = "8043";
				myCloud.dicomport = "4243";
				myCloud.dicomportex = "9245";
			} else if (hospitalId == 3) {
				myCloud.httpport = "9044";
				myCloud.portex = "9044";
				myCloud.dicomport = "9244";
				myCloud.dicomportex = "9244";
			} else if (hospitalId == 4) {
				myCloud.httpport = "9042";
				myCloud.portex = "9042";
				myCloud.dicomport = "9242";
			} else if (hospitalId == 5) {
				myCloud.httpport = "9043";
				myCloud.portex = "9043";
				myCloud.dicomport = "9243";
			}
			const localOrthanc = [{id: 0, Orthanc_Local: {}, Orthanc_Cloud: JSON.stringify(myCloud)}];
			resolve(localOrthanc[0]);
		} else {
			const orthancs = await db.orthancs.findAll({ attributes: excludeColumn, where: {hospitalId: hospitalId}});
			if (orthancs.length > 0) {
				resolve(orthancs[0]);
			} else {
				reject({error: 'Not found your orthanc in database'});
			}
		}
	});
}

const doMyLoadOrthanc = function(myOrthancId, hostname){
	return new Promise(async function(resolve, reject) {
		log.info('myOrthancId=> ' + myOrthancId);
		if ((hostname === 'localhost') || (hostname.indexOf('192.168') >= 0)){
			const myCloud = {os: "docker-linux", ip: "150.95.26.106", httpport: "8042", dicomport: "4242", user: "demo", pass: "demo", portex : "8042", ipex: "119.59.98.111"};
			if (myOrthancId == 2) {
				myCloud.httpport = "8043";
				myCloud.portex = "8043";
				myCloud.dicomport = "4243";
				myCloud.dicomportex = "9245";
			} else if (myOrthancId == 3) {
				myCloud.httpport = "9044";
				myCloud.portex = "9044";
				myCloud.dicomport = "9244";
				myCloud.dicomportex = "9244";
			} else if (myOrthancId == 4) {
				myCloud.httpport = "9042";
				myCloud.portex = "9042";
				myCloud.dicomport = "9242";
			} else if (myOrthancId == 5) {
				myCloud.httpport = "9043";
				myCloud.portex = "9043";
				myCloud.dicomport = "9243";
			} else {
				log.error('Error=>' + 'Not found myOrthancId')
			}
			const localOrthanc = [{id: 0, Orthanc_Local: {}, Orthanc_Cloud: JSON.stringify(myCloud)}];
			resolve(localOrthanc[0]);
		} else {
			const orthancs = await db.orthancs.findAll({ attributes: excludeColumn, where: {id: myOrthancId}});
			if (orthancs.length > 0) {
				resolve(orthancs[0]);
			} else {
				reject({error: 'Not found your orthanc in database'});
			}
		}
	});
}

const doFormateDateTime = function(dateIn){
	let date = undefined;
	if (dateIn) {
		date = new Date(dateIn);
	} else {
		date = new Date();
	}
	//date = date.toLocaleString('en-US', { timeZone: TZ});
	let YY = date.getFullYear();
	let MM = date.getMonth() + 1;
	if (MM < 10){
		 MM = '0' + MM;
	} else {
		MM = '' + MM;
	}
	let DD = date.getDate();
	if (DD < 10){
		 DD = '0' + DD;
	} else {
		DD = '' + DD;
	}
	let HH = date.getHours();
	if (HH < 10){
		 HH = '0' + HH;
	} else {
		HH = '' + HH;
	}
	let MN = date.getMinutes();
	if (MN < 10){
		 MN = '0' + MN;
	} else {
		MN = '' + MN;
	}
	let result = {YY, MM, DD, HH, MN};
	log.info('result=> ' + JSON.stringify(result));
	return result;
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

const doCreateVoiceTranctionId = function(){
	d = new Date();
	d.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
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
	var td = `${yy}${mm}${dd}${hh}${mn}${ss}`;
	return td;
}

const formatStudyDate = function(studydateStr){
	if (studydateStr.length >= 8) {
		var yy = studydateStr.substr(0, 4);
		var mo = studydateStr.substr(4, 2);
		var dd = studydateStr.substr(6, 2);
		var stddf = yy + '-' + mo + '-' + dd;
		var stdDate = new Date(stddf);
		var month = stdDate.toLocaleString('default', { month: 'short' });
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

const contains = function(needle) {
  // Per spec, the way to identify NaN is that it is not equal to itself
  var findNaN = needle !== needle;
  var indexOf;

  if(!findNaN && typeof Array.prototype.indexOf === 'function') {
    indexOf = Array.prototype.indexOf;
  } else {
    indexOf = function(needle) {
      var i = -1, index = -1;

      for(i = 0; i < this.length; i++) {
        var item = this[i];

        if((findNaN && item !== item) || item === needle) {
          index = i;
          break;
        }
      }

      return index;
    };
  }
  return indexOf.call(this, needle) > -1;
}

const genUniqueID = function () {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return s4() + s4() + '-' + s4();
}

const preciseMathDotRound = function(value, precision = 0) {
  return parseFloat(value.toFixed(precision));
}

const doCollectInstancesFromStudy = function(studyId, orthancCloud){
  return new Promise(async function(resolve, reject){
    let orthancUrl = 'http://' + orthancCloud.ip + ':' + orthancCloud.httpport;
    let instances = [];
    let callOrthancUrl = orthancUrl + '/studies/' + studyId;
    let studyRes = await fetch(callOrthancUrl, {auth:  {user: orthancCloud.user, pass: orthancCloud.pass}});
		if (studyRes.ok){
	    let studyJson = await studyRes.json();
	    let studySeries = studyJson.Series;
	    let	promiseList = new Promise(async function(resolve2, reject2){
	      studySeries.forEach(async(series, i) => {
	        callOrthancUrl = orthancUrl + '/series/' + series;
	        let seriesRes = await fetch(callOrthancUrl, {auth:  {user: orthancCloud.user, pass: orthancCloud.pass}});
	        let seriesJson = await seriesRes.json();
	        await seriesJson.Instances.forEach((ins, i) => {
	          instances.push(ins);
	        });
	      });
	      setTimeout(()=>{
	        resolve2(instances);
	      }, 2500);
	    });
	    Promise.all([promiseList]).then((ob)=>{
	      log.info('instances >>'+ JSON.stringify(ob[0]));
	      resolve(ob[0]);
	    });
		} else {
			resolve(instances);
		}
  });
}

const removeArchiveScheduleTask = function(filePath) {
  const removeAfter = 7 * 24 * 60; /*minutes */
  const startDate = new Date();
  let endDate = new Date(startDate.getTime() + (removeAfter * 60 * 1000));
  let endMM = endDate.getMonth() + 1;
  let endDD = endDate.getDate();
  let endHH = endDate.getHours();
  let endMN = endDate.getMinutes();
  let endSS = endDate.getSeconds();
  let scheduleRemove = endSS + ' ' + endMN + ' ' + endHH + ' ' + endDD + ' ' + endMM + ' *';
	log.info('scheduleRemove=> ' + filePath + ' => ' + scheduleRemove);
	let task = cron.schedule(scheduleRemove, function(){
    var command = parseStr('rm %s', filePath);
    runcommand(command).then((stdout) => {
      console.log(stdout);
    }).catch((err) => {
      console.log('err: 500 >>', err);
	  });
  });
	return endDate;
}

const trimAsteriskKey = function(key){
	let n = key.indexOf('*');
	if (n == 0) {
		return key.substring(1);
	} else if (n == (key.length - 1)){
		return key.substring(0, (key.length - 1));
	} else {
		return key;
	}
}

const doFormateDateTimeChatbot = function(unFormatDateTime){
	//log.info('unFormatDateTime=>' + unFormatDateTime);
	let fmtDate = formatDateTimeStr(unFormatDateTime);
	//log.info('fmtDate=>' + fmtDate);
	let datetime = fmtDate.split('T');
	let dateSegment = datetime[0].split('-');
	dateSegment = dateSegment.join('');
	let date = formatStudyDate(dateSegment);
	let time = formatStudyTime(datetime[1].split(':').join(''));
	return fmtStr('%s %s น.', date, time);
}

const doFormateDateTimeThaiZone = function(unFormatDateTime){
	//log.info('unFormatDateTime=>' + unFormatDateTime);
	let fmtDate = formatDateTimeStr(unFormatDateTime);
	//log.info('fmtDate=>' + fmtDate);
	let datetime = fmtDate.split('T');
	let dateSegment = datetime[0].split('-');
	dateSegment = dateSegment.join('');
	let date = formatStudyDate(dateSegment);
	let time = formatStudyTime(datetime[1].split(':').join(''));
	return fmtStr('%s %s', date, time);
}

const doCalUrgentVoiceCall = function(mn){
  if (mn <= 0) {
    return;
  } else if ((mn > 0) && (mn < 45)) {
    return 'ct_neuro_fast_tract';
  } else if ((mn >= 45) && (mn < 120)) {
    return 'ct_neuro_emergency';
  } else if ((mn >= 120) && (mn < 240)) {
    return 'urgent';
  } else if ((mn >= 240) && (mn < 1440)) {
    return 'normal_24hr';
  } else if (mn >= 1440) {
    return 'urgent_cta_neuro_body';
  } else {
		return;
	}
}

const voipRequest = function(rqParam) {
	return new Promise(function(resolve, reject) {
		let proxyParams = {
			method: rqParam.method,
			url: rqParam.uri,
			headers: rqParam.headers,
			body: rqParam.body,
			strictSSL: false
		};
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
		request(proxyParams, (err, res, body) => {
			if (!err) {
				resolve({status: {code: 200}, res: res});
			} else {
				log.error('your voip Request Error=>' + JSON.stringify(err));
				reject({status: {code: 500}, err: err});
			}
		});
	});
}

module.exports = (dbconn, monitor) => {
	db = dbconn;
	log = monitor;
  return {
    proxyRequest,
    runcommand,
    fmtStr,
		doLoadOrthancTarget,
		doMyLoadOrthanc,
		doFormateDateTime,
		formatDateTimeStr,
		doCreateVoiceTranctionId,
		formatStudyDate,
		formatStudyTime,
		contains,
		genUniqueID,
		preciseMathDotRound,
		doCollectInstancesFromStudy,
		removeArchiveScheduleTask,
		trimAsteriskKey,
		doFormateDateTimeChatbot,
		doFormateDateTimeThaiZone,
		doCalUrgentVoiceCall,
		voipRequest
  }
}
