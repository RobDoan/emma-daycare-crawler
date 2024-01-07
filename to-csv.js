const { Parser } = require('@json2csv/plainjs');
const fs = require('fs');
const path = require('path');

const exportToCsv = (data, fields) => {
  const json2csv = new Parser({ fields });
  const csv = json2csv.parse(data);
  return csv;
}

const writeCsvToFile = (csv, filename) => {
  fs.writeFileSync(filename, csv);
}

const writeDataToFile = (data, filename) => {
  const filePath = path.join(__dirname, 'exported-data', filename);
  const csv = exportToCsv(data, Object.keys(data[0]));
  writeCsvToFile(csv, filePath);
}

module.exports = {
  exportToCsv,
  writeCsvToFile,
  writeDataToFile
}