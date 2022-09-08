/*unlinkidicom-worker.js*/
const pg = require('pg');
const log = require('electron-log');
const path = require('path');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file = path.join(__dirname, '/../..', '/log/unlinkdicom-log.log');

const pgConfig = {
	host: process.env.DB_SERVER_DOMAIN,
	port: process.env.DB_SERVER_PORT,
	/* database: process.env.PGDATABASE, */
	user: process.env.DB_PGUSER,
	password: process.env.DB_PGPASSWORD,
};

var pgPool = undefined;

const doCallPgPool = function(dbname){
  if (pgPool) return pgPool;
  pgConfig.database = dbname;
  pgPool = new pg.Pool(pgConfig);
  return pgPool;
}

const doFindInternalId = function(instanceId){
  return new Promise(function(resolve, reject){
    pgPool.connect().then(client => {
      client.query('BEGIN');
      var sqlCmd = "select internalid from resources where publicid=$1"; //::varchar(255)
      client.query(sqlCmd, [instanceId]).then(res => {
        if (res.rowCount > 0){
          client.query('COMMIT');
          resolve(res.rows);
        } else {
          resolve();
        }
      }).catch(err => {
        client.query('ROLLBACK');
        reject(err.stack)
      });
      client.release();
    });
  });
}

const doFindAttachedfile = function(internalId){
  return new Promise(function(resolve, reject){
    pgPool.connect().then(client => {
      client.query('BEGIN');
      var sqlCmd = "select uuid from attachedfiles where id=$1"; //::varchar(255)
      client.query(sqlCmd, [internalId]).then(res => {
        if (res.rowCount > 0){
          client.query('COMMIT');
          resolve(res.rows);
        } else {
          resolve();
        }
      }).catch(err => {
        client.query('ROLLBACK');
        reject(err.stack)
      });
      client.release();
    });
  });
}

const doFindOID = function(studyID){
  return new Promise(function(resolve, reject){
    pgPool.connect().then(client => {
			client.query('BEGIN');
			var sqlCmd = "select content from storagearea where uuid=$1"; //::varchar(255)
			client.query(sqlCmd, [studyID]).then(res => {
				if (res.rowCount > 0){
					client.query('COMMIT');
					resolve(res.rows);
				} else {
					resolve();
				}
			}).catch(err => {
				client.query('ROLLBACK');
				reject(err.stack)
			});
			client.release();
		});
  });
}

const doRunUnlink = function(oid){
  return new Promise(function(resolve, reject){
    pgPool.connect().then(client => {
			client.query('BEGIN');
			var sqlCmd = "select lo_unlink($1)";
			client.query(sqlCmd, [oid]).then(res => {
				if (res.rowCount > 0){
					client.query('COMMIT');
					resolve(res.rows);
				} else {
					resolve();
				}
			}).catch(err => {
				client.query('ROLLBACK');
				reject(err.stack)
			});
			client.release();
		});
  });
}

const doRunVacuum = function(){
  return new Promise(function(resolve, reject){
    pgPool.connect().then(client => {
			client.query('BEGIN');
			var sqlCmd = "VACUUM FULL ANALYZE pg_largeobject";
			client.query(sqlCmd, []).then(res => {
				client.query('COMMIT');
				resolve(res);
			}).catch(err => {
				client.query('ROLLBACK');
				reject(err.stack)
			});
			client.release();
		});
  });
}

const doUnlinkProcess = function(data){
  return new Promise(async function(resolve, reject){
    const dbName = data.dbName;
    const instances = data.instances;
    doCallPgPool(dbName);
    log.info('instances for unlink => ' + instances);
    await instances.forEach((instanceId, i) => {
      doFindInternalId(instanceId).then((internals)=>{
        let internalId = internals[0].internalid;
        doFindAttachedfile(internalId).then(async(uuids)=>{
          await uuids.forEach((item, i) => {
            let uuid = item.uuid;
            doFindOID(uuid).then((contents)=>{
              if (contents) {
                let oid = contents[0].content;
                doRunUnlink(oid).then((unlinkRes)=>{
                  if (unlinkRes){
                    resolve({success: true});
                  } else {
                    resolve({success: false, reason: 'can not unlink oid ' + oid});
                  }
                }).catch((err4)=>{
                  reject(err4);
                });
              } else {
                resolve({success: false, reason: 'not found instanceId ' + instanceId});
              }
            }).catch((err3)=>{
              reject(err3);
            });
          });
        }).catch((err2)=>{
          reject(err2);
        });
      }).catch((err1)=>{
        reject(err1);
      });
    });
  });
}

module.exports = (input, callback) => {
	return new Promise(async function(resolve, reject){
		let data = input; //{studyID: studyID, dbName: cloud.dbname}
    log.info('input data => ' + JSON.stringify(data));
    try {
  		let unlinkRes = await doUnlinkProcess(data);
      /*
      if (unlinkRes.success == true){
        doRunVacuum().then((vacuumRes)=>{
          callback(unlinkRes);
      		resolve(unlinkRes);
        }).catch((err5)=>{
          reject(err5);
        });
      }
      */      
      callback(unlinkRes);
      resolve(unlinkRes);
    } catch (error){
  		log.error('UnlinkError=>' + JSON.stringify(error));
      reject(error);
    }
	});
}
