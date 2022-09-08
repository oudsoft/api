var XLSX = require('xlsx')
var workbook = XLSX.readFile('/home/oodsoft/Downloads/ScanPart.xlsx');
var sheet_name_list = workbook.SheetNames;
console.log(sheet_name_list);
var xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[2]]);
console.log(xlData);
