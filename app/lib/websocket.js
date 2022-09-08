/* websocket.js */
const fs = require('fs');
const path = require('path');
const splitFile = require('split-file');

let usrUploadDir = path.join(__dirname, '../../', process.env.USRUPLOAD_DIR);
let tempDicomDir = usrUploadDir + '/temp';

function RadconWebSocketServer (arg, db, log) {
	const $this = this;
	const lineApi = require('./mod/lineapi.js')(db, log);
	const uti = require('./mod/util.js')(db, log);
	this.httpsServer = arg;
	const WebSocketServer = require('ws').Server;
	const wss = new WebSocketServer({server: this.httpsServer, /*path: '/' + roomname */ maxPayload: 502560039});
	this.socket = wss;
	this.clients = [];
	this.db = db;
	this.unSendDatas = [];

	wss.on('connection', async function (ws, req) {
		log.info(ws._socket.remoteAddress);
		log.info(ws._socket._peername);
		log.info(req.connection.remoteAddress);
		log.info(`WS Conn Url : ${req.url} Connected.`);
		let fullReqPaths = req.url.split('?');
		let wssPath = fullReqPaths[0];
		let wssQuery = fullReqPaths[1];
		log.info(wssPath);
		//wssPath = wssPath.substring(1);
		wssPath = wssPath.split('/');
		log.info(wssPath);
		let clientId = wssPath[(wssPath.length -2)];
		/*
		//-> แบบนี้ user 1 account ใช้งานมากกว่า 1 เครื่องไม่ได้
		let anotherSockets = await $this.clients.filter((client) =>{
			if (client.id !== clientId) return ws;
		});
		anotherSockets.push(ws);
		$this.clients = anotherSockets;
		*/

		ws.id = clientId;
		ws.hospitalId = wssPath[(wssPath.length -1)];
		ws.counterping = 0;
		ws.screenstate = 0;
		let connectType;
		if (wssQuery) {
			let queries = wssQuery.split('&');
			connectType = queries[0].split('=');
			ws.connectType = connectType[1];
		}

		if (ws.id === 'orthanc') {
			let allSocket = await $this.listClient();
			log.info('allSocket before orthanc connect=> ' + JSON.stringify(allSocket));
			let localSocket = await $this.findOrthancLocalSocket(ws.hospitalId);
			if (!localSocket){
				$this.clients.push(ws);
			} else {
				if ((localSocket.readyState != 0) && (localSocket.readyState != 1)) {
					await $this.removeNoneActiveSocket(localSocket.id, localSocket.hospitalId);
					$this.clients.push(ws);
				}
			}
			allSocket = await $this.listClient();
			log.info('allSocket after orthanc connect=> ' + JSON.stringify(allSocket));
		} else {
			let allClient = await $this.listClient();
			log.info('allClient before one connect=> ' + JSON.stringify(allClient));
			$this.clients.push(ws);
			allClient = await $this.listClient();
			log.info('allClient after one connect=> ' + JSON.stringify(allClient));

			let unSendMes = await $this.unSendDatas.filter((item)=>{
				if (ws.id === item.sendTo) {
					return item;
				}
			});
			if (unSendMes.length > 0){
				await unSendMes.forEach(async(item, i) => {
					await $this.selfSendMessage(ws, item.callData, item.sendTo);
				});
				let unSendOthers = await $this.unSendDatas.filter((item)=>{
					if (ws.id !== item.sendTo) {
						return item;
					}
				});
				$this.unSendDatas = unSendOthers;
			}
		}

		ws.send(JSON.stringify({type: 'test', message: ws.id + '[' + ws.hospitalId +'], You have Connected master websocket success.'}));

		ws.on('message', async function (message) {
			var data;

			//accepting only JSON messages
			try {
				data = JSON.parse(message);
			} catch (e) {
				log.info("Invalid JSON of Socket data.");
				data = {};
			}

			log.info('socket data => ' + JSON.stringify(data));
			let hospitalId, owner, localSocket;
			if (data.type) {
				switch (data.type) {
					case "trigger":
						let command = 'curl -X POST --user demo:demo http://localhost:8042/tools/execute-script -d "doLocalStore(\'' + data.dcmname + '\')"';
						$this.runCommand(command).then((result) => {
							ws.send(JSON.stringify({type: 'result', message: result}));
						});
          break;
					case "notify":
						if (data.sendto === ws.id) {
							ws.send(JSON.stringify({type: 'notify', message: data.notify, statusId: data.statusId, caseId: data.caseId}));
						}
					break;
					case "clientrun":
						if (data.commands) {
							let localSocket = await $this.findHospitalLocalSocket(ws, data.hospitalId);
							if (localSocket) {
								if ((localSocket.readyState == 0) || (localSocket.readyState == 1)) {
									localSocket.send(JSON.stringify({type: 'run', commands: data.commands, sender: data.sender, hospitalId: data.hospitalId}));
									ws.send(JSON.stringify({type: 'notify', message: 'your command will process.'}));
								} else {
									await $this.removeNoneActiveSocket(localSocket.id, localSocket.hospitalId);
									ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Inactive!!'}));
								}
							} else {
								ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Connected!!'}));
							}
						} else {
							ws.send(JSON.stringify({type: 'notify', message: 'not found your commands.'}));
						}
					break;
					case "clientresult":
						let hospitalId = data.hospitalId;
						let sender = data.sender;
						let result = data.results;
						let resultMsg = {type: 'clientresult', result: result, hospitalId: hospitalId, owner: sender};
						$this.sendMessage(resultMsg, sender);
					break;
					case "clientlog":
						localSocket = await $this.findHospitalLocalSocket(ws, data.hospitalId);
						if (localSocket) {
							if ((localSocket.readyState == 0) || (localSocket.readyState == 1)) {
								localSocket.send(JSON.stringify({type: 'log', sender: data.sender}));
								ws.send(JSON.stringify({type: 'notify', message: 'your request log will be transfer.'}));
							} else {
								await $this.removeNoneActiveSocket(localSocket.id, localSocket.hospitalId);
								ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Inactive!!'}));
							}
						} else {
							ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Connected!!'}));
						}
					break;
					case "clientreportlog":
						localSocket = await $this.findHospitalLocalSocket(ws, data.hospitalId);
						if (localSocket) {
							if ((localSocket.readyState == 0) || (localSocket.readyState == 1)) {
								localSocket.send(JSON.stringify({type: 'reportlog', sender: data.sender}));
								ws.send(JSON.stringify({type: 'notify', message: 'your request log will be transfer.'}));
							} else {
								await $this.removeNoneActiveSocket(localSocket.id, localSocket.hospitalId);
								ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Inactive!!'}));
							}
						} else {
							ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Connected!!'}));
						}
					break;
					case "clientdicomlog":
						localSocket = await $this.findHospitalLocalSocket(ws, data.hospitalId);
						if (localSocket) {
							if ((localSocket.readyState == 0) || (localSocket.readyState == 1)) {
								localSocket.send(JSON.stringify({type: 'dicomlog', sender: data.sender}));
								ws.send(JSON.stringify({type: 'notify', message: 'your request log will be transfer.'}));
							} else {
								await $this.removeNoneActiveSocket(localSocket.id, localSocket.hospitalId);
								ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Inactive!!'}));
							}
						} else {
							ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Connected!!'}));
						}
					break;
					case "logreturn":
						let logReturn = {type: 'logreturn', log: data.result.log, sender: data.sender};
						await $this.selfSendMessage(ws, logReturn, data.sender);
					break;
					case "reportlogreturn":
						let reportLogReturn = {type: 'reportlogreturn', log: data.result.log, sender: data.sender};
						await $this.selfSendMessage(ws, reportLogReturn, data.sender);
					break;
					case "dicomlogreturn":
						let dicomLogReturn = {type: 'dicomlogreturn', log: data.result.log, sender: data.sender};
						await $this.selfSendMessage(ws, dicomLogReturn, data.sender);
					break;

					case "runresult":
						owner = data.owner;
						let runResult = {type: "runresult", result: data.data, owner: owner};
						await $this.selfSendMessage(ws, runResult, owner);
					break;
					case "clientrestart":
						let clientSocket = await $this.findHospitalLocalSocket(ws, data.hospitalId);
						if (clientSocket) {
							if ((clientSocket.readyState == 0) || (clientSocket.readyState == 1)) {
								clientSocket.send(JSON.stringify({type: 'restart', sender: data.sender}));
								ws.send(JSON.stringify({type: 'notify', message: 'your command will process.'}));
							} else {
								await $this.removeNoneActiveSocket(clientSocket.id, clientSocket.hospitalId);
								ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Inactive!!'}));
							}
						} else {
							ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Connected!!'}));
						}
					break;
					case "callzoom":
						let canSendRadio = await $this.doControlZoomCall(data, ws);
					break;
					case "callzoomback":
						let sendBackTo = data.sendTo;
						let resultData = {type: 'callzoomback', result: data.result};
						let canSendCallZommBack = await $this.selfSendMessage(ws, resultData, sendBackTo);
					break;
					case "reset":
						ws.counterping = 0;
					break;
					case "set":
						ws.screenstate = data.value;
					break;
					case "message":
						let chatRes = await $this.doControlChatMessage(data);
					break;
					case "closetopic":
						await $this.closeTopic(data.topicId);
					break;
					case "logout":
						let socketUsername = data.username;
						let anotherSockets = await $this.clients.filter((client) =>{
							if (client.id !== socketUsername) return ws;
						});
						$this.clients = anotherSockets
					break;
					case "clientecho":
						let echoHospitalId = data.hospitalId;
						let echoSender = data.sender;
						let localOrthanc = await $this.findHospitalLocalSocket(ws, echoHospitalId);
						if (localOrthanc) {
							if ((localOrthanc.readyState == 0) || (localOrthanc.readyState == 1)) {
								localOrthanc.send(JSON.stringify({type: 'echo', hospitalId: echoHospitalId, sender: echoSender}));
								ws.send(JSON.stringify({type: 'notify', message: 'your request echo will be process.'}));
							} else {
								await $this.removeNoneActiveSocket(localOrthanc.id, localOrthanc.hospitalId);
								ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Inactive!!'}));
							}
						} else {
							ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Connected!!'}));
						}
					break;
					case "echoreturn":
						let returnHospitalId = data.hospitalId;
						let returnSender = data.sender;
						let returnMsg = {type: 'echoreturn', message: data.myconnection};
						$this.sendMessage(returnMsg, returnSender);
					break;
					case "clientupdate":

					break;
					case "casemisstake":
						let sendtoCasemisstake = data.sendto;
						let fromCasemisstake = data.from;
						let msgCasemisstake = data.msg;
						let msgCasemisstakeSend = {type: 'casemisstake', msg: msgCasemisstake, from: fromCasemisstake};
						let sendCasemisstakeResult = await $this.sendMessage(msgCasemisstakeSend, sendtoCasemisstake);
					break;
					case "wrtc":
						let controlRes = await $this.doControlWrtcMessage(data);
					break;
					case "dicombinary":
						let zipFilename = data.filename;
						let outputFile = tempDicomDir + '/' + zipFilename;
						let binaryContents = Buffer.from(data.binary, 'base64');
						fs.writeFile(outputFile, binaryContents, (err) => {
  						if (err) return console.error(err)
  						console.log('file saved to ', outputFile);
							let dicomZipPath = process.env.USRUPLOAD_PATH + '/' + zipFilename;
							ws.send(JSON.stringify({type: 'dicombinary-result', name: zipFilename, path: data.path, size: binaryContents.length, link: dicomZipPath}));
						});
					break;
					case "dicombinary-merge":
						let originName = tempDicomDir + '/' + data.originname;
						let multiParts = [];
						await data.names.forEach((item, i) => {
							let part = tempDicomDir + '/' + item;
							multiParts.push(part);
						});
						console.log('multiParts=>' + multiParts);
						splitFile.mergeFiles(multiParts, originName).then(() => {
							ws.send(JSON.stringify({type: 'merge-result', name: data.originname, link: originName}));
						})
					break;
					case "call-server-api":
						//data.hospitalId;
						//data.username;
						let apiOptions = {
							strictSSL: false,
							method: data.method,
							uri: 'https://localhost' + data.url,
							headers: {'Content-Type': 'application/json'}
						};
						if ((data.method).toUpperCase() == 'POST') {
							apiOptions.body = data.params;
						}
						if (data.auth) {
							apiOptions.auth = data.auth;
						}
						if (data.Authorization) {
							apiOptions.headers.Authorization = data.Authorization;
						}
						let apiRes = await uti.proxyRequest(apiOptions);
						ws.send(JSON.stringify({type: 'server-api-result', result: apiRes}));
					break;
				}
			} else {
				ws.send(JSON.stringify({type: 'error', message: 'Your command invalid type.'}));
			}
		});

		ws.isAlive = true;

		ws.on('pong', () => {
			ws.counterping += 1;
			ws.isAlive = true;
			ws.send(JSON.stringify({type: 'ping', counterping: ws.counterping, datetime: new Date()}));
		});

		ws.on('close', async function(client, req) {
			//log.info('client id => ' + client.id + ' closed.');
			log.info('ws=> ' + ws.id + '/' + ws.hospitalId + ' closed.');
			await $this.removeNoneActiveSocket(ws.id, ws.hospitalId);
			let allSocket = await $this.listClient();
			log.info('allSocket after one close=> ' + JSON.stringify(allSocket));
		});

	});

	setInterval(() => {
		wss.clients.forEach((ws) => {
			if (!ws.isAlive) return ws.terminate();
			ws.ping(null, false, true);
		});
	}, 60000);

	this.findUserSocket = function(username) {
		return new Promise(async function(resolve, reject) {
			let yourSocket = await $this.clients.find((ws) =>{
				if ((ws.id == username) && ((ws.readyState == 0) || (ws.readyState == 1))) return ws;
			});
			resolve(yourSocket);
		});
	}

	this.filterUserSocket = function(username) {
		return new Promise(async function(resolve, reject) {
			let targetSocket =await $this.clients.filter((ws) =>{
				if ((ws.id == username) && ((ws.readyState == 0) || (ws.readyState == 1))) {
					return ws;
				}
			});
			resolve(targetSocket);
		});
	}

	this.findHospitalLocalSocket = function(fromWs, hospitalId) {
		return new Promise(async function(resolve, reject) {
			let yourSocket = await $this.clients.find((ws) =>{
				if ((ws.hospitalId == hospitalId)  && (ws !== fromWs) && (ws.connectType === 'local') && ((ws.readyState == 0) || (ws.readyState == 1))) return ws;
			});
			resolve(yourSocket);
		});
	}

	this.selfSendMessage = function(fromWs, message, sendto) {
		return new Promise(async function(resolve, reject) {
			let userSocket = await $this.findUserSocket(sendto);
			if (userSocket) {
				userSocket.send(JSON.stringify(message));
				resolve(true);
			} else {
				log.error('selfSendMessage::Can not find socket of ' + sendto);
				resolve(false);
			}
		});
	}

	this.sendMessage = function(message, sendto) {
		return new Promise(async function(resolve, reject) {
			let userSockets = await $this.filterUserSocket(sendto);
			let canSend = false;
			if (userSockets.length > 0) {
				await userSockets.forEach((socket, i) => {
					socket.send(JSON.stringify(message));
					socket.counterping = 0;
				});
				canSend = true;
			}
			resolve(canSend);
		});
	}

	this.sendLocalGateway = function(message, hospitalId) {
		return new Promise(async function(resolve, reject) {
			let gatewaySockets = await $this.clients.filter((ws) =>{
				//if ((ws.hospitalId == hospitalId)  && (ws.id === 'orthanc')) return ws;
				if (ws.hospitalId == hospitalId) return ws;
			});

			let sendingTo = [];
			if (gatewaySockets.length > 0) {
				const promiseList = new Promise(async function(resolve2, reject2) {
					await gatewaySockets.forEach(async (ws, i) => {
						if ((ws.readyState == 0) || (ws.readyState == 1)) {
							ws.send(JSON.stringify(message));
							sendingTo.push({user: ws.id, sent: 'yes'});
						} else {
							await $this.removeNoneActiveSocket(ws.id, ws.hospitalId);
							sendingTo.push({user: ws.id, sent: 'no'});
						}
					});
					setTimeout(()=> {
            resolve2(sendingTo);
          },500);
        });
        Promise.all([promiseList]).then((ob)=> {
					resolve({sent: {sataus: 'OK'}, items: ob[0]});
				});
			} else {
				resolve({sent: {sataus: 'NOT FOUND HOSPITAL CLIENT'}, items: sendingTo});
			}
		});
	}

	this.getPingCounter = function(username){
		return new Promise(async function(resolve, reject) {
			let userSockets = await $this.filterUserSocket(username);
			if (userSockets.length > 0) {
				resolve(userSockets[0].counterping);
			} else {
				log.error('getPingCounter::Can not find socket of ' + username);
				resolve(false);
			}
		});
	}

	this.getScreenState = function(username){
		return new Promise(async function(resolve, reject) {
			let userScreenState = await $this.filterUserSocket(username);
			//log.info('filterUserSocket=> ' + username + ' => userScreenState=>' + JSON.stringify(userScreenState));
			if (userScreenState.length > 0) {
				resolve(userScreenState[0].screenstate);
			} else {
				log.error('getScreenState::Can not find socket of ' + username);
				resolve(false);
			}
		});
	}

	this.unlockScreenUser = function(username){
		return new Promise(async function(resolve, reject) {
			let userScreenStates = await $this.filterUserSocket(username);
			if (userScreenStates.length > 0) {
				let result = await $this.sendMessage(JSON.stringify({type: 'unlockscreen'}), userScreenStates[0].id);
				resolve(result);
			} else {
				log.error('getScreenState::Can not find socket of ' + username);
				resolve(false);
			}
		});
	}
	//$this.db.radchatlogs
	this.saveChatLog = function(topicId, topicType, msgSend){
		return new Promise(async function(resolve, reject) {
			$this.db.radchatlogs.findAll({ attributes: ['Log', 'topicStatus'],
				where: {caseId: topicId, topicType: topicType}
			}).then(async (caseLog)=>{
				if (caseLog.length > 0) {
					let currentStatus = caseLog[0].topicStatus;
					let newCaseLog = caseLog[0].Log;
					newCaseLog.push(msgSend);
					$this.db.radchatlogs.update({
				    Log: newCaseLog,
						topicStatus: 1
				  },{
				    where: {
				      caseId: topicId
				    }
				  }).then((caseLog) => resolve({currentStatus: currentStatus}));
				} else {
					let newCaseLog = [msgSend];
					let newLog = await $this.db.radchatlogs.create({Log: newCaseLog});
					$this.db.radchatlogs.update({caseId: topicId, topicType: topicType, topicStatus: 1}, {where: {id: newLog.id}});
					resolve({currentStatus: 0});
				}
			});
		});
	}

	this.closeTopic = function(topicId){
		return new Promise(async function(resolve, reject) {
			let updateTopicRes = await $this.db.radchatlogs.update({topicStatus: 0},{where: {caseId: topicId}});
			let updateCaseRes = await $this.db.cases.update({casestatusId: 5, Case_DESC: "Radio chat succes."}, {where: {id: topicId}});
			resolve(updateCaseRes);
		});
	}

	this.listClient = function(){
		return new Promise(async function(resolve, reject) {
			let clientConns = [];
			await $this.clients.forEach((item, i) => {
				clientConns.push({id: item.id, hospitalId: item.hospitalId, state: item.readyState});
			});
			resolve(clientConns);
		});
	}

	this.doControlZoomCall = function(data, ws) {
		return new Promise(async function(resolve, reject) {
			let sendTo = data.sendTo;
			let callData = {type: 'callzoom', openurl: data.openurl, password: data.password, topic: data.topic, sender: data.sender};
			let canSendCallZomm = await $this.selfSendMessage(ws, callData, sendTo);
			if (!canSendCallZomm) {
				$this.unSendDatas.push({sendTo: sendTo, callData: callData});
			} else {
				let radioCaseUserLines = await db.lineusers.findAll({ attributes: ['id', 'UserId'], where: {userId: data.radioId}});
				let radioLineUserId = radioCaseUserLines[0].UserId;
				if ((radioLineUserId) && (radioLineUserId !== '')) {
					let vdoCallReqFmt = 'มี Video Call หัวข้อ %s โดย %s เป็นผู้ขอ โปรดล็อกอินเข้าระบบ เพื่อเปิด Video Call หัวข้อดังกล่าว'
					let lineVdoCallMsg = uti.fmtStr(vdoCallReqFmt, data.topic, data.senderInfo);
					let vdoCallMenuQuickReply = lineApi.createBotMenu(lineVdoCallMsg, 'quick', lineApi.radioMainMenu);
					let vdoCallBotResponse = await lineApi.pushConnect(radioLineUserId, vdoCallMenuQuickReply);
				}
			}
			resolve(canSendCallZomm);
		});
	}

	this.findOrthancLocalSocket = function(hospitalId) {
		return new Promise(async function(resolve, reject) {
			let allSocket = await $this.listClient();
			log.info('allSocket before find orthanc=> ' + JSON.stringify(allSocket));
			log.info('find orthanc of hospitalId=>' + hospitalId);
			let orthancSocket = await $this.clients.find((ws) =>{
				if ((ws.hospitalId == hospitalId) && (ws.id === 'orthanc') && ((ws.readyState == 0) || (ws.readyState == 1))) return ws;
			});
			if (orthancSocket) {
				log.info('orthanc found=> ' + orthancSocket.id + '/' + orthancSocket.hospitalId + '/' + orthancSocket.readyState);
			}
			resolve(orthancSocket);
		});
	}

	this.removeNoneActiveSocket = function(wsId, hospitalId){
		return new Promise(async function(resolve, reject) {
			let anotherActiveSockets = await $this.clients.filter((client) =>{
				if (client.id !== wsId) {
					if ((client.readyState == 0) || (client.readyState == 1)) {
						return client;
					}
				} else {
					if (client.hospitalId != hospitalId){
						if ((client.readyState == 0) || (client.readyState == 1)) {
							return client;
						}
					}
				}
			});
			$this.clients = anotherActiveSockets;
			resolve($this.clients);
		});
	}

	this.doSendNotifyOnNewMessage = function(message, sendto, radioState){
		return new Promise(async function(resolve, reject) {
			if ((message.sendtotype) && (message.sendtotype == 4)) {
				if ((message.context) && (message.context.audienceUserId)) {
					let radioId = message.context.audienceUserId;
					if (radioId) {
						let radioUserProfiles = await db.userprofiles.findAll({ attributes: ['Profile'], where: {userId: radioId}});
						if (radioUserProfiles.length > 0) {
							const action = 'quick';
							const radioMsgFmt = 'มีข้อความใหม่ส่งมาจาก %s\n\n%s\n\nในห้องสนทนาของตุณ';

							let radioActiveLineNotify = radioUserProfiles[0].Profile.activeState.lineNotify;
							let radioLockLineNotify = radioUserProfiles[0].Profile.lockState.lineNotify;
							let radioOfflineLineNotify = radioUserProfiles[0].Profile.offlineState.lineNotify;

							if (radioState == 0) {
								if ((radioActiveLineNotify) && (radioActiveLineNotify == 1)) {
									let radioLineUserId = message.context.audienceContact.lineuserId;
									if ((radioLineUserId) && (radioLineUserId != '')){
										let lineCaseMsg = uti.fmtStr(radioMsgFmt, message.context.myName, message.msg);
										let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, action, lineApi.radioMainMenu);
										let botResponse = await lineApi.pushConnect(radioLineUserId, menuQuickReply);
										resolve(botResponse);
									} else {
										resolve();
									}
								} else {
									resolve();
								}
							} else if (radioState == 1) {
								if ((radioLockLineNotify) && (radioLockLineNotify == 1)) {
									let radioLineUserId = message.context.audienceContact.lineuserId;
									if ((radioLineUserId) && (radioLineUserId != '')){
										let lineCaseMsg = uti.fmtStr(radioMsgFmt, message.context.myName, message.msg);
										let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, action, lineApi.radioMainMenu);
										let botResponse = await lineApi.pushConnect(radioLineUserId, menuQuickReply);
										resolve(botResponse);
									} else {
										resolve();
									}
								} else {
									resolve();
								}
							} else {
								if ((radioOfflineLineNotify) && (radioOfflineLineNotify == 1)) {
									let radioLineUserId = message.context.audienceContact.lineuserId;
									if ((radioLineUserId) && (radioLineUserId != '')){
										let lineCaseMsg = uti.fmtStr(radioMsgFmt, message.context.myName, message.msg);
										let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, action, lineApi.radioMainMenu);
										let botResponse = await lineApi.pushConnect(radioLineUserId, menuQuickReply);
										resolve(botResponse);
									} else {
										resolve();
									}
								} else {
									resolve();
								}
							}
						} else {
							resolve();
						}
					} else {
						resolve();
					}
				} else {
					resolve();
				}
			} else {
				resolve();
			}
		});
	}

	this.doControlChatMessage = function(data){
	  return new Promise(async function(resolve, reject) {
			let sendto = data.sendto;
			let from = data.from;
			let context = data.context;
			let sendtotype = data.sendtotype;
			let fromtype = data.fromtype;
			let sendDate = new Date();
			let msgSend = {type: 'message', msg: data.msg, topicId: context.topicId, from: from, context: context, datetime: sendDate, sendtotype: sendtotype, fromtype: fromtype};
			let sendResult = await $this.sendMessage(msgSend, sendto);
			if (data.context.topicId) {
				let topicId = data.context.topicId;
				let topicType = data.context.topicType;
				let saveResult = await $this.saveChatLog(topicId, topicType, msgSend);
				if (saveResult.currentStatus == 0){
					let userSockets = await $this.filterUserSocket(sendto);
					if (userSockets.length > 0){
						let radioScreenState = userSockets[0].screenstate;
						await $this.doSendNotifyOnNewMessage(msgSend, sendto, radioScreenState);
					}
				}
			}
	    resolve(sendResult);
	  });
	}

	this.doControlWrtcMessage = function(data){
	  return new Promise(async function(resolve, reject) {
	    let sendto = data.sendto;
	    let sendResult = await $this.sendMessage(data, sendto);
	    resolve(sendResult);
	  });
	}

	this.runCommand = function (command) {
		return new Promise(function(resolve, reject) {
			const exec = require('child_process').exec;
			exec(command, (error, stdout, stderr) => {
				if(error === null) {
					resolve(`${stdout}`);
				} else {
					reject(`${stderr}`);
				}
	    });
		});
	}

}

module.exports = ( arg, relation, monitor ) => {
	const webSocketServer = new RadconWebSocketServer(arg, relation, monitor);
	return webSocketServer;
}
