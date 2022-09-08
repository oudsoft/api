
self.addEventListener("message", function(event) {
  // `event.data` contains the value or object sent from main
  //console.log("Message from parent:", event.data); // "Sample message"
  let evtData = JSON.parse(event.data);
  console.log(evtData);
  let msgtype = evtData.type;
  //localStorage.setItem('dicom', JSON.stringify(evtData.dicom));
  let openRequest = indexedDB.open("dicomdb", 2);
  // create/upgrade the database without version checks
  openRequest.onupgradeneeded = function() {
    let db = openRequest.result;
    if (!db.objectStoreNames.contains('dicoms')) { // if there's no "books" store
      db.createObjectStore('dicoms', {keyPath: 'ID'});
    } else {
      db.deleteObjectStore('dicoms');
      db.createObjectStore('dicoms', {keyPath: 'ID'});
    }
  };
  openRequest.onsuccess = async function() {
    let db = openRequest.result;
    let transaction = db.transaction("dicoms", "readwrite"); // (1)
    let dicoms = transaction.objectStore("dicoms"); // (2)

    if (msgtype === 'sync'){
      let countRow = 0;
      await evtData.dicoms.forEach((dicom, i) => {
        let request = dicoms.add(dicom); // (3)
        request.onsuccess = function() { // (4)
          //console.log("Dicom added to the store", request.result);
          countRow += 1;
          if (countRow == evtData.dicoms.length) {
            self.postMessage(JSON.stringify({type: 'syncsuccess', row: countRow}));
          }
        };
        request.onerror = function() {
          self.postMessage(JSON.stringify({type: 'error', error: request.error, row: countRow}));
        };
      });
    } else if (msgtype === 'save'){
      let dicom = evtData.dicom;
      let request = dicoms.add(dicom);
      request.onsuccess = function() {
        self.postMessage(JSON.stringify({type: 'savesuccess'}));
      };
      request.onerror = function() {
        self.postMessage(JSON.stringify({type: 'error', error: request.error}));
      };
    }
  };
});
