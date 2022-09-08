const downloadZipURL = 'https://radconnext.info/img/usr/zip/';
function makeRequest(url) {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false); // Note: synchronous
    xhr.responseType = 'arraybuffer';
    xhr.send();
    return xhr.response;
  } catch(e) {
    return "XHR Error " + e.toString();
  }
}

function onError(err) {
  postMessage({error: 'ERROR: ' + err.toString()});
}

function genUniqueID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return s4() + s4() + '-' + s4();
}

self.requestFileSystemSync = self.webkitRequestFileSystemSync || self.requestFileSystemSync;

self.addEventListener("message", function(event) {
  let evtData = event.data;
  if (evtData.studyID){
    try {
      const fs = requestFileSystemSync(TEMPORARY, 1024 * 1024 /*1MB*/);
      let zipFileName = evtData.studyID + '.zip';
      let downloadDicomZipURL = downloadZipURL + zipFileName + '?t=' + genUniqueID();
      let fileEntry = fs.root.getFile(zipFileName, {create: true});
      let arrayBuffer = makeRequest(downloadDicomZipURL);
      let blob = new Blob([new Uint8Array(arrayBuffer)], {type: evtData.type});
      try {
        fileEntry.createWriter().write(blob);
        let fileEntryURL = fileEntry.toURL();
        console.log(fileEntryURL);
        let mainNotifyData = {studyID: evtData.studyID, fileEntryURL: fileEntryURL};
        postMessage(mainNotifyData);
      } catch (e) {
        onError(e);
      }
    } catch (e) {
      onError(e);
    }
  } else {
    return;
  }
});
