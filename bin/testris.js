const request = require('request-promise');

const proxyRequest = function(rqParam) {
	return new Promise(function(resolve, reject) {
		let rqBody = JSON.stringify(rqParam.body);
		let proxyParams = {
			method: rqParam.method,
			url: rqParam.uri,
			auth: rqParam.auth,
			headers: {
				'Content-Type': 'application/json'
			},
			body: rqBody
		};
		if (rqParam.Authorization) {
			proxyParams.headers.Authorization = rqParam.Authorization;
		}
		console.log('proxyParams=>' + JSON.stringify(proxyParams));
		request(proxyParams, (err, res, body) => {
			if (!err) {
				resolve({status: {code: 200}, res: res});
			} else {
				console.log('your Request Error=>' + JSON.stringify(err));
				reject({status: {code: 500}, err: err});
			}
		});
	});
}


let rqParams = {
  method: 'post',
  auth:  {user: 'demo', pass: 'demo'},
  uri: 'https://radconnext.info/api/ris/add',
  Authorization: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJyaXN1c2VyIiwiaWF0IjoxNjA4ODc5NzIxMTg0fQ.HM3ADA9p7Mtv0nAR47hKYSHhogsZoImSG3OAPuKnGMI',
  body: {
    "ID": "5805dddb-63c0c233-ab1a767c-0a32d58c-846ee015",
    "Type": "Study",
    "Series": [
        "31595d16-7ea5e77e-0ceaebdc-50009645-a02c9911"
    ],
    "IsStable": false,
    "LastUpdate": "20210305T074737",
    "MainDicomTags": {
        "StudyID": "200",
        "StudyDate": "20210304",
        "StudyTime": "174432.000",
        "AccessionNumber": "AC622102429",
        "InstitutionName": "VIRAJSILP HOSPITAL",
        "StudyInstanceUID": "1.2.392.200036.9116.2.6.1.44063.1805205289.1614847427.671795",
        "ReferringPhysicianName": ""
    },
    "ParentPatient": "3b8393c9-68c99422-d0f2a7e9-1546c3b4-286f69b2",
    "SamplingSeries": {
        "ID": "31595d16-7ea5e77e-0ceaebdc-50009645-a02c9911",
        "Type": "Series",
        "Status": "Unknown",
        "IsStable": false,
        "Instances": [
            "8dea63db-0fb4be30-c63d8ed5-eeacaf65-fe23bd18"
        ],
        "LastUpdate": "20210305T074737",
        "ParentStudy": "5805dddb-63c0c233-ab1a767c-0a32d58c-846ee015",
        "MainDicomTags": {
            "Modality": "CT",
            "SeriesDate": "20210304",
            "SeriesTime": "174452.709",
            "StationName": "ID_STATION",
            "Manufacturer": "TOSHIBA",
            "ProtocolName": "Brain   ( TRAUMA )",
            "SeriesNumber": "1",
            "BodyPartExamined": "HEAD",
            "SeriesDescription": "  2.0",
            "SeriesInstanceUID": "1.2.392.200036.9116.2.6.1.44063.1805205289.1614847492.709723",
            "ImageOrientationPatient": "0.00000\\0.00000\\-1.00000\\0.00000\\1.00000\\0.00000"
        },
        "ExpectedNumberOfInstances": null
    },
    "PatientMainDicomTags": {
        "PatientID": "62-20-138266",
        "PatientSex": "F",
        "PatientName": "CHALIAO KAEOKRUT",
        "PatientBirthDate": "19610122"
    }
  }
};

proxyRequest(rqParams).then((proxyRes)=>{


});
