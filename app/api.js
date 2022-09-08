//require('dotenv').config();
const os = require('os');
const fs = require('fs');
const path = require("path");
const express = require('express');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');
const apiApp = express();

var log;

apiApp.use(express.json({limit: '900mb', extended: true, parameterLimit: 50000}));
apiApp.use(bodyParser.urlencoded({ limit: '900mb', extended: true, parameterLimit: 50000 }));

const windowsappPath = '/home/windowsapp';

const db = require('./db/relation.js');
db.sequelize.sync({ force: false });

const shopdb = require('./db/shop-relation.js');
shopdb.sequelize.sync({ force: false });

const windowsappStatic = express.static(windowsappPath);
const windowsappIndex = serveIndex(windowsappPath, {'icons': true});

const uploader = require('./lib/uploader.js')(apiApp);
const notificator = require('./lib/notification.js')(apiApp);

apiApp.use('/windowsapp', windowsappStatic, windowsappIndex);

const doGrantAccess = function(response, granted, validity) {
	var answer = {
		granted: granted
	}

	if (typeof validity == 'number') {
		answer.validity = validity;
	}

	response.writeHead(200, { 'Content-Type' : 'application/json' });
	response.end(JSON.stringify(answer));
}

apiApp.get('/grantaccess', (req, res) => {
	log.info('GET Grant Access');
	log.info(req.headers);
	doGrantAccess(res, true, 5);
});

apiApp.post('/grantaccess', (req, res) => {
	log.info('POST Grant Access');
	log.info(req.headers);
	doGrantAccess(res, true, 5);
});

require('./lib/v2/pdfconvertor.js')(apiApp);

module.exports = ( httpsServer, monitor ) => {
	log = monitor;

	const webSocketServer = require('./lib/websocket.js')(httpsServer, db, log);

	const externalapiproxy = require('./lib/v2/apiproxy.js')(db, log);
	let orthancproxy = require('./lib/orthancproxy_new.js')(db, log, webSocketServer);
	const uploader = require('./lib/uploader.js')(apiApp);
	const geegee = require('./lib/geegee.js')(apiApp);
	const pdfconvertor = require('./lib/pdfconvertor.js')(apiApp, webSocketServer);
	const taskCase = require('./lib/casetask.js')(webSocketServer, db, log);
  const whomtask = require('./lib/whomtask.js')(webSocketServer, db, log);
	const taskWarning = require('./lib/casewarningtask.js')(webSocketServer, db, log);
	const voipTask = require('./lib/voiptask.js')( webSocketServer, db, log);
	const taskApp = require('./lib/casetaskapp.js')(taskCase, taskWarning, db, log);
	const resetPwdTask = require('./lib/resetpwdtask.js')( db, log);
	const resetPwdApp = require('./lib/resetpwdapp.js')( resetPwdTask, db, log);
	const activateAccountTask = require('./lib/activateaccounttask.js')( db, log);
	const activateAccountApp = require('./lib/activateaccountapp.js')( activateAccountTask, db, log);
	const zoomApp = require('./lib/zoom.js')(db, log);
	const botApp = require('./lib/botapp.js')(taskCase, taskWarning, voipTask, db, log, webSocketServer);
	const bugReportApp = require('./lib/bugreportapp.js')( db, log, webSocketServer);
	const voipapp = require('./lib/voipapp.js')( taskCase, taskWarning, voipTask, db, log, webSocketServer);
	const voipTaskApp = require('./lib/voiptaskapp.js')( voipTask, db, log);

	const users = require('./db/rest/users.js')(db, log);
	const user = require('./db/rest/user.js')(db, log, taskCase);
	const usertypes = require('./db/rest/usertypes.js')(db, log);
	const userstatuses = require('./db/rest/userstatuses.js')(db, log);
	const userprofile = require('./db/rest/userprofile.js')(db, log);
	const hospital = require('./db/rest/hospital.js')(db, log);
	const urgenttypes = require('./db/rest/urgenttypes.js')(db, log);
	const generalstatus = require('./db/rest/generalstatus.js')(db, log);
	const cliamerights = require('./db/rest/cliamerights.js')(db, log);
	const orthanc = require('./db/rest/orthanc.js')(db, log);
	const dicomtransferlog = require('./db/rest/dicomtransferlog.js')(webSocketServer, db, log);
	const patient = require('./db/rest/patient.js')(db, log);
	const casestatus = require('./db/rest/casestatus.js')(db, log);
	const cases = require('./db/rest/cases.js')(db, taskCase, taskWarning, voipTask, log, webSocketServer);
	const hospitalreport = require('./db/rest/hospitalreport.js')(db, log);
	const radiologist = require('./db/rest/radiologist.js')(db, taskCase, log, webSocketServer);
	const workinghour = require('./db/rest/workinghour.js')(db, log);
	const workingschedule = require('./db/rest/workingschedule.js')(db, log);
	const template = require('./db/rest/template.js')(db, log);
	const caseresponse = require('./db/rest/caseresponse.js')(db, taskCase, taskWarning, voipTask, log, webSocketServer);
	const casereport = require('./db/rest/casereport.js')(webSocketServer, db, log);
	const risinterface = require('./db/rest/risinterface.js')(db, log, taskCase);
	const scanpartref = require('./db/rest/scanpartref.js')(db, log);
	const scanpartaux = require('./db/rest/scanpartaux.js')(db, log);
	const pricechart = require('./db/rest/pricechart.js')(db, log);
	const chatlog = require('./db/rest/radchatlog.js')(db, log);
	const ailog = require('./db/rest/radailog.js')(db, log);
	const keeplog = require('./db/rest/radkeeplog.js')(db, log);
	const consult = require('./db/rest/radconsult.js')(webSocketServer, db, log, whomtask);

	const uicommon = require('./db/rest/auicommon.js')(db, taskCase, taskWarning, voipTask, log, webSocketServer);

	/* shop */
	const shopusertype = require('./db/rest/shop/usertype.js')(shopdb, log);
	const shopuser = require('./db/rest/shop/user.js')(shopdb, log);
	const shopshop = require('./db/rest/shop/shop.js')(shopdb, log);
	const shopcustomer = require('./db/rest/shop/customer.js')(shopdb, log);
	const shopmenugroup = require('./db/rest/shop/menugroup.js')(shopdb, log);
	const shopmenuitem = require('./db/rest/shop/menuitem.js')(shopdb, log);
	const shoporder = require('./db/rest/shop/order.js')(shopdb, log);
	const shopinvoice = require('./db/rest/shop/invoice.js')(shopdb, log);
	const shoppaytype = require('./db/rest/shop/paytype.js')(shopdb, log);
	const shoppayment = require('./db/rest/shop/payment.js')(shopdb, log);
	const shopbill = require('./db/rest/shop/bill.js')(shopdb, log);
	const shoptaxinvoice = require('./db/rest/shop/taxinvoice.js')(shopdb, log);
	const shoptemplate = require('./db/rest/shop/template.js')(shopdb, log);
	const shopUploader = require('./lib/shop/uploader.js')(apiApp);

	apiApp.use('/external', externalapiproxy);
	apiApp.use('/orthancproxy', orthancproxy);
	apiApp.use('/users', users);
	apiApp.use('/user', user);
	apiApp.use('/usertypes', usertypes);
	apiApp.use('/userstatuses', userstatuses);
	apiApp.use('/userprofile', userprofile);
	apiApp.use('/hospital', hospital);
	apiApp.use('/cliamerights', cliamerights);
	apiApp.use('/urgenttypes', urgenttypes);
	apiApp.use('/generalstatus', generalstatus);
	apiApp.use('/cliamerights', cliamerights);
	apiApp.use('/orthanc', orthanc);
	apiApp.use('/dicomtransferlog', dicomtransferlog);
	apiApp.use('/patient', patient);
	apiApp.use('/casestatus', casestatus);
	apiApp.use('/cases', cases);
	apiApp.use('/hospitalreport', hospitalreport);
	apiApp.use('/radiologist', radiologist);
	apiApp.use('/workinghour', workinghour);
	apiApp.use('/workingschedule', workingschedule);
	apiApp.use('/template', template);
	apiApp.use('/caseresponse', caseresponse);
	apiApp.use('/casereport', casereport);
	apiApp.use('/tasks', taskApp);
	apiApp.use('/zoom', zoomApp);
	apiApp.use('/bot', botApp);
	apiApp.use('/resettask', resetPwdApp);
	apiApp.use('/activatetask', activateAccountApp);
	apiApp.use('/ris', risinterface);
	apiApp.use('/scanpartref', scanpartref);
	apiApp.use('/scanpartaux', scanpartaux);
	apiApp.use('/pricechart', pricechart);
	apiApp.use('/chatlog', chatlog);
	apiApp.use('/ailog', ailog);
	apiApp.use('/keeplog', keeplog);
	apiApp.use('/consult', consult);
	apiApp.use('/bug', bugReportApp );

	apiApp.use('/uicommon', uicommon);
	apiApp.use('/voipapp', voipapp);
	apiApp.use('/voiptask', voipTaskApp);

	/* shop */
	apiApp.use('/shop/usertype', shopusertype);
	apiApp.use('/shop/user', shopuser);
	apiApp.use('/shop/shop', shopshop);
	apiApp.use('/shop/customer', shopcustomer);
	apiApp.use('/shop/menugroup', shopmenugroup);
	apiApp.use('/shop/menuitem', shopmenuitem);
	apiApp.use('/shop/order', shoporder);
	apiApp.use('/shop/invoice', shopinvoice);
	apiApp.use('/shop/paytype', shoppaytype);
	apiApp.use('/shop/payment', shoppayment);
	apiApp.use('/shop/bill', shopbill);
	apiApp.use('/shop/taxinvoice', shoptaxinvoice);
	apiApp.use('/shop/template', shoptemplate);

	const publicDir = path.normalize(__dirname + '/..' + '/public');
	const internalHTTP = 'http-server ' + publicDir;
	log.info('Create Internal HTTP Server with command=>' + internalHTTP);
	uploader.runcommand(internalHTTP).then(async (result)=>{
		log.info('result=>' + result);
	}).catch((err) => {
		log.error('error=>' + err);
	});
	let shopDir = path.normalize(__dirname + '/..'/* + '/shop'*/);
	let internalShopHTTP = 'http-server --port 8088 ' + shopDir;
	log.info('Create Internal Shop HTTP Server with command=>' + internalShopHTTP);
	uploader.runcommand(internalShopHTTP).then((res)=>{
		log.info('res=>' + res);
	});
	return { api: apiApp, db: db, shopdb: shopdb, taskCase: taskCase, whomtask: whomtask, voipTask: voipTask, webSocketServer: webSocketServer };
}
