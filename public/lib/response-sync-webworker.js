/*response-sync-webworker.js*/

const ajax = function(url, data, callback, type, token) {
  var data_array, data_string, idx, req, value;
  if (data == null) {
    data = {};
  }
  if (callback == null) {
    callback = function() {};
  }
  if (type == null) {
    //default to a GET request
    type = 'GET';
  }
  if (type === 'GET') {
    data_array = [];
    for (idx in data) {
      value = data[idx];
      data_array.push("" + idx + "=" + value);
    }
    data_string = data_array.join("&");
  } else if (type === 'POST'){
    data_string = data;
  }
  req = new XMLHttpRequest();
  req.open(type, url, false);
  //req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  req.setRequestHeader("Content-type", "application/json");
  req.setRequestHeader("Authorization", token);
  req.onreadystatechange = function() {
    if (req.readyState === 4 && req.status === 200) {
      return callback(req.responseText);
    }
  };
  if (type === 'GET') {
    req.send(data_string);
  } else if (type === 'POST'){
    req.send(JSON.stringify(data_string));
  }
  return req;
};

let lastResponseUpdate = '';

self.addEventListener("message", function(event) {
  // `event.data` contains the value or object sent from main
  //console.log("Message from parent:", event.data); // "Sample message"
  let evtData = event.data;
  console.log(evtData);
  let msgtype = evtData.type;

  if (msgtype === 'startsync'){
    let canUpdate = lastResponseUpdate.length !== evtData.params.data.Response_HTML.length;
    if (canUpdate){
      var apiUri = undefined;
      if (evtData.params.responseId){
        apiUri = '/api/caseresponse/update';
      } else {
        apiUri = '/api/caseresponse/add';
      }
      let testData = {test: 'foo', op: 'bar'};
      var responseData = {data: evtData.params.data, responseId: evtData.params.responseId};
      ajax(apiUri, responseData, function(data) {
         //do something with the data like:
         let resultSyncMsg = {type: 'syncsuccess', data: data};
         self.postMessage(resultSyncMsg);
         lastResponseUpdate = evtData.params.data.Response_HTML;
      }, 'POST', evtData.token);
    } else {
      let resultSyncMsg = {type: 'notsync'};
      self.postMessage(resultSyncMsg);
    }
  } else if (msgtype === 'stopsync'){


  }
});
