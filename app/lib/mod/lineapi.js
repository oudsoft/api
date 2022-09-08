const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const request = require('request-promise');

var db, log;

const mainMenu = [{id: 'x101', name: 'ลงทะเบียนใช้งาน'}, /*{id: 'x102', name: 'เคสของฉัน'},*/ {id: 'x103', name: 'อื่นๆ'}];
const techMainMenu = [/*{id: 'x101', name: 'ลงทะเบียนใช้งาน'},*/ /*{id: 'x102', name: 'เคสของฉัน'},*/ {id: 'x103', name: 'อื่นๆ'}];
const radioMainMenu = [/*{id: 'x101', name: 'ลงทะเบียนใช้งาน'},*/ {id: 'x102', name: 'ตั้งค่ารับเคส'}, {id: 'x103', name: 'อื่นๆ'}];
const registerMenu =[{id: 'x201', name: 'รังสีแพทย์'}, {id: 'x202', name: 'เจ้าหน้าที่เทคนิค'}, {id: 'x203', name: 'ผู้ดูแลระบบ'}, {id: 'x001', name: 'กลับ'}];
const otherMenu =[{id: 'x301', name: 'วิธีใช้งาน'}, {id: 'x302', name: 'แจ้งปัญหา'}, {id: 'x001', name: 'กลับ'}];
const acceptActionMenu =  [{id: 'x401', name: 'รับ'}, {id: 'x402', name: 'ไม่รับ'}];
const confirmMenu = [{id: 'x002', name: 'ตกลง'}, {id: 'x003', name: 'ยกเลิก'}];
const backMenu = [{id: 'x001', name: 'กลับ'}];
const toggleAccMenu = [{id: 'x501', name: 'เปิด'}, {id: 'x502', name: 'ปิด'}];

const getUserProfile = (userId) => {
  return new Promise(function(resolve, reject) {
    var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.LINE_API_ACCESS_TOKEN};
    request({
      method: 'GET',
      uri: "https://api.line.me/v2/bot/profile/" + userId,
      headers: lineHeader
    }, (err, res, body) => {
      if (!err) {
        resolve(body);
      } else {
        reject(err);
      }
    });
  });
}

const replyConnect = (token, messages)=>{
  return new Promise(function(resolve, reject) {
		var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.LINE_API_ACCESS_TOKEN};
		request({
			method: 'POST',
			uri: process.env.LINE_MESSAGING_API_URL + "/reply",
			headers: lineHeader,
			body: JSON.stringify({
				replyToken: token,
				messages: [messages]
			})
		}, (err, res, body) => {
			if (!err) {
				resolve({code: 200, response: body});
			} else {
				reject({code: 500, error: error});
			}
		});
	});
}

const pushConnect = (userId, messages) => {
	return new Promise(function(resolve, reject) {
		var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.LINE_API_ACCESS_TOKEN};
		request({
			method: 'POST',
			uri: process.env.LINE_MESSAGING_API_URL + "/push",
			headers: lineHeader,
			body: JSON.stringify({
				to: userId,
				messages: [messages]
			})
		}, (err, res, body) => {
			if (!err) {
				resolve({code: 200, response: body});
			} else {
				reject({code: 500, error: err});
			}
    });
	});
}

const createBotMenu = (question, action, items)=> {
  var quickreplyItems = []
	items.forEach(function(item){
		var ob = {type: "action", action: {}};
		ob.action.type = "postback";
		ob.action.label = item.name;
    if (item.data) {
      ob.action.data = "action=" + action + "&itemid=" + item.id + "&data=" + item.data;
    } else {
      ob.action.data = "action=" + action + "&itemid=" + item.id + "&data=" + item.id;
    }
		ob.action.displayText = item.name;
		quickreplyItems.push(ob);
	});
	return {
		type: "text",
		text: (question)? question : "เชิญเลือกรายการครับ",
		quickReply: {
			items: quickreplyItems
		}
	}
}

const doCreateCaseAccBubbleReply = function(data, cmdItems) {
	var bubbleItems = [];
	cmdItems.forEach(function(item){
		var ob = {type: "button", style: "primary", action: {}};
		ob.action.type = "postback";
		ob.action.label = item.name;
		ob.action.data = "action=quick&itemid=" + item.id + "&data=" + item.data;
		ob.action.displayText = item.name;
		bubbleItems.push(ob);
	});
	return {
		"type": "flex",
		"altText": "This is a Case Event Message for Reply",
		"contents": {
		  "type": "bubble",
      "direction": "ltr",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": data.headerTitle,
            "size": "lg",
            "align": "start",
            "weight": "bold",
            "color": "#009813"
          }
        ]
      },
		  "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "baseline",
            "margin": "sm",
            "contents": [
              {
                "type": "text",
                "text": "วันเวลา",
                "align": "start",
                "color": "#C3C3C3"
              },
              {
                "type": "text",
                "text": data.caseDatetime,
                "align": "start",
                "color": "#000000",
                "wrap": true,
                "flex": 3
              }
            ]
          },
          {
            "type": "box",
            "layout": "baseline",
            "margin": "sm",
            "contents": [
              {
                "type": "text",
                "text": "รพ.",
                "align": "start",
                "color": "#C3C3C3"
              },
              {
                "type": "text",
                "text": data.hospitalName,
                "align": "start",
                "color": "#000000",
                "wrap": true,
                "flex": 3
              }
            ]
          },
          {
            "type": "box",
            "layout": "baseline",
            "margin": "sm",
            "contents": [
              {
                "type": "text",
                "text": "Desc.",
                "align": "start",
                "color": "#C3C3C3"
              },
              {
                "type": "text",
                "text": data.studyDescription,
                "align": "start",
                "color": "#000000",
                "wrap": true,
                "flex": 3
              }
            ]
          },
          {
            "type": "box",
            "layout": "baseline",
            "margin": "sm",
            "contents": [
              {
                "type": "text",
                "text": data.urgentName,
                "align": "start",
                "color": "#C3C3C3"
              },
              {
                "type": "text",
                "text": data.expireDatetime,
                "align": "start",
                "color": "#000000",
                "wrap": true,
                "flex": 3
              }
            ]
          },
          {
            "type": "box",
            "layout": "baseline",
            "margin": "sm",
            "contents": [
              {
                "type": "text",
                "text": "ชื่อ",
                "align": "start",
                "color": "#C3C3C3"
              },
              {
                "type": "text",
                "text": data.patientName,
                "align": "start",
                "color": "#000000",
                "wrap": true,
                "flex": 3
              }
            ]
          }
        ]
			},
      "footer": {
        "type": "box",
  			"layout": "vertical",
  			"spacing": "md",
  			"contents": bubbleItems
      }
		}
	};
}

module.exports = (dbconn, monitor) => {
  db = dbconn;
  log = monitor;

  return {
    mainMenu,
    techMainMenu,
    radioMainMenu,
    registerMenu,
    otherMenu,
    acceptActionMenu,
    confirmMenu,
    backMenu,
    doCreateCaseAccBubbleReply,

    getUserProfile,
    replyConnect,
    pushConnect,
    createBotMenu
	}
}
