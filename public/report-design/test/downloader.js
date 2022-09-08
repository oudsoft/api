self.requestFileSystemSync = self.webkitRequestFileSystemSync || self.requestFileSystemSync;

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

function onError(e) {
  postMessage('ERROR: ' + e.toString());
}

onmessage = function(e) {
  var data = e.data;
  // Make sure we have the right parameters.
  if (!data.fileName || !data.url || !data.type) {
    return;
  }

  try {
    var fs = requestFileSystemSync(TEMPORARY, 1024 * 1024 /*1MB*/);
    //postMessage('Got file system.');

    /****************************************/
    /*
    var testEntry = fs.root.getFile('log.txt', {create: true});
    console.log(testEntry);
    var dirEntry = fs.root.getDirectory('mydir', {create: true});
    console.log(dirEntry);
    */
    /****************************************/



    var fileEntry = fs.root.getFile(data.fileName, {create: true});
    //postMessage('Got file entry.');

    var arrayBuffer = makeRequest(data.url);
    var blob = new Blob([new Uint8Array(arrayBuffer)], {type: data.type});

    /****************************************/
    /*
    var reader = new FileReader();
    reader.onload = function(e) {
      console.log(this.result); // this.result is the read file as an ArrayBuffer.
      //URL.createObjectURL(this.result);
    };
    reader.onerror = function(e) {
      console.log(e);
    };
    reader.readAsArrayBuffer(blob);
    */
    /****************************************/

    try {
      //postMessage('Begin writing');
      fileEntry.createWriter().write(blob);
      //postMessage('Writing complete');
      var fileEntryURL = fileEntry.toURL();
      console.log(fileEntryURL);
      postMessage(fileEntryURL);
      //postMessage(blob);
    } catch (e) {
      onError(e);
    }

  } catch (e) {
    onError(e);
  }
};
