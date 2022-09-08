/*ai-critiria.js*/
const fs = require('fs');
const util = require("util");
const path = require('path');

var log;

const critiriaChart = [
  {type: 'NoFinding', threshold: 80, name: 'Normal'},
  {type: 'SuspectedActiveTB', threshold: 70, name: 'TB'},
  {type: 'SuspectedLungMalignancy', threshold: 70/*5*/, name: 'Mass'},
  {type: 'AbnormalHeartAndGreatVessels', threshold: 70, name: 'Abnormal Heart and GreatVessels'},
  {type: 'ExtrathoracicAbnormalFindings', threshold: 80/*10*/, name: 'Abnormal Extrathoracic Finding'},
  {type: 'IntrathoracicAbnormalFindings', threshold: 90, name: 'Abnormal Intrathoracic Findings'}
];

const doFindCritiriaNameByType = function(type){
  let crit = critiriaChart.find((item)=>{
    if (type === item.type){
      return item;
    }
  });
  return crit.name;
}

const doFindCritiriaThresholdByType = function(type){
  let crit = critiriaChart.find((item)=>{
    if (type === item.type){
      return item;
    }
  });
  return crit.threshold;
}

const doProveCritiria = function(type, threshold){
  let critThreshold = doFindCritiriaThresholdByType(type);
  let prove = false;
  if (parseFloat(threshold) >= critThreshold) {
    prove = true;
  }
  return prove;
}

const doFindMaxThreshold = function(aiResultJson){
  return new Promise(function(resolve, reject) {
    const promiseList = new Promise(async function(resolve2, reject2) {
      let resultTags = Object.keys(aiResultJson);
      let maxProbability = 0;
      let findTag = undefined;
      await resultTags.forEach((tag, i) => {
        let tagObject = Object.values(aiResultJson)[i];
        let probability = parseFloat(tagObject.probability);
        if (probability > maxProbability){
          maxProbability = probability;
          findTag = {tag: tag, probability: probability};
        }
      });
      setTimeout(()=> {
        resolve2(findTag);
      },500);
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
    });
  });
}

module.exports = (monitor) => {
	log = monitor;
  return {
    critiriaChart,
    doFindCritiriaNameByType,
    doFindCritiriaThresholdByType,
    doProveCritiria,
    doFindMaxThreshold
  }
}
