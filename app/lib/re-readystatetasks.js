/* re-readystatetasks.js */
module.exports = (  dbconn, monitor, webSocketServer ) => {
  let db = dbconn;
  let log = monitor;
  let webSocket = webSocketServer;
  let uti = require('./mod/util.js')(db, log);

  const cron = require('node-cron');

  const doUpdateReadyState = function(){
    return new Promise(async function(resolve, reject) {
      const limitHourTime = 8 * 60 * 60 * 1000;
      const orderby = [['id', 'ASC']];
      const whereClous = {Profile: {readyState: 0}};
      let radioProfiles = await db.userprofiles.findAll({attributes: ['id', 'Profile', 'updatedAt'], where: whereClous, order: orderby});
      //log.info('radioProfiles Found => ' + JSON.stringify(radioProfiles));
      let updateResults = [];
      const promiseList = new Promise(function(resolve2, reject2) {
        radioProfiles.forEach(async (row, i) => {
          if (row.Profile.readyState == 0) {
            let lastUpdate = new Date(row.updatedAt);
            //log.info('lastUpdate => ' + lastUpdate);
            let lastUpdateTime = lastUpdate.getTime();
            let now = new Date();
            //log.info('now => ' + now);
            let nowTime = now.getTime();
            let diffTime = nowTime - lastUpdateTime;
            //log.info('diffTime => ' + diffTime);
            if (diffTime >= limitHourTime) {
              let updateProfile = row.Profile;
              updateProfile.readyState = 1;
              updateProfile.readyBy = 'System';
              await db.userprofiles.update({Profile: updateProfile}, { where: {id: row.id } });
              updateResults.push(row);
            }
          }
        });
        setTimeout(()=> {
          resolve2(updateResults);
        },3000);
      });
      Promise.all([promiseList]).then((ob)=> {
        resolve(ob[0]);
      });
    });
  }

  const doRun = function(){
    return new Promise(function(resolve, reject) {
      //let scheduleTrigger = endSS + ' ' + endMN + ' ' + endHH + ' ' + endDD + ' ' + endMM + ' *';
      let scheduleTrigger = '0 0 */1 * * *';
      //let scheduleTrigger = '0 */10 * * * *';
      log.info('scheduleTrigger => ' + scheduleTrigger);
  		cron.schedule(scheduleTrigger, async function(){
        let result = await doUpdateReadyState();
        resolve(result);
      });
    });
  }

  return {
    doRun
  }
}
