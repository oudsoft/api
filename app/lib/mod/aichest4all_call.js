const path = require('path');
const fetch = require('node-fetch');
const {pipeline} = require('stream');
const {promisify} = require('util');
const { createReadStream, createWriteStream } = require('fs');

const FormData = require('form-data');
const streamPipeline = promisify(pipeline);

const apiHost = 'https://drtee.b.cils.cloud'

const debug = console.log

function AIChest4allSyncCall(filepath, type="dicom") {
  var data = new FormData();
  data.append('type', type);
  data.append('film', createReadStream(filepath));
  data.append('uploadby', 'pong');

  const options = {
    method: 'POST',
    body: data,
    headers: {
      ...data.getHeaders()
    },
  }
  return fetch(apiHost + '/film', options).then(res => {
    if (res.ok) {
      return res.json()
    }
    throw new Error(res.statusText)
  })
}

function AIChest4allAsyncCall(filepath, type="dicom") {
  var data = new FormData();
  data.append('type', type);
  data.append('film', createReadStream(filepath));
  data.append('uploadby', 'pong');

  const options = {
    method: 'POST',
    body: data,
    headers: {
      ...data.getHeaders()
    },
  }
  return fetch(apiHost + '/film/async', options).then(res => {
    if (res.ok) {
      return res.json()
    }
    throw new Error(res.statusText)
  });
}

async function checkStatus(id, donecallback, errorcallback) {
  const result = await fetch(apiHost + '/film/' + id + '/status')
  const json = await result.json()
  debug("Check Status:", id , '->' , json.status)
  if (json.status == 'success') {
    donecallback(json)
  } else if (json.status == 'error') {
    errorcallback(json)
  } else {
    setTimeout(()=>checkStatus(id, donecallback, errorcallback), 1000)
  }
}

function downloadAIChestFile(id, type='pdf'){
  return new Promise(async function(resolve, reject) {
    const publicDir = path.normalize(__dirname + '/../../..');
    const aiDownloadDir = publicDir + process.env.AIDOWNLOAD_DIR;
    const aiDownloadPath = process.env.AIDOWNLOAD_PATH;

    let downloadDest = undefined;
    if (type == 'pdf'){
      let pdfFileName = id + '.pdf';
      downloadDest = await downloadFile(apiHost + '/film/' + id + '/' + type, aiDownloadDir + '/' + pdfFileName);
      resolve(aiDownloadPath + '/' + pdfFileName);
    } else {
      let pngFileName = id + '.png';
      downloadDest = await downloadFile(apiHost + '/film/' + id + '/' + type, aiDownloadDir + '/' + pngFileName);
      resolve(aiDownloadPath + '/' + pngFileName);
    }
  });
}

function downloadFile(url, dest) {
  return new Promise(async function(resolve, reject) {
    debug("Downloading: ", url)
    const response = await fetch(url);
    if (!response.ok) {
      let downloadError = new Error(`unexpected response ${response.statusText}`);
      reject(downloadError);
    }
    await streamPipeline(response.body, createWriteStream(dest));
    debug("Download Done: ", dest);
    resolve(dest);
  });
}

module.exports = {
  AIChest4allAsyncCall,
  AIChest4allSyncCall,
  downloadAIChestFile,
  downloadFile,
  checkStatus,
}
