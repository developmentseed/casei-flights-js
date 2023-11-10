'use strict';

const fs = require('fs');
const path = require('path');
const dsv = require('d3-dsv');
const csv2geojson = require('csv2geojson');
const simplify = require('simplify-geojson');
const { XMLParser } = require('fast-xml-parser');

const { getStats } = require('./stats.js');


const getHeaders = (filename) => {
  const parser = new XMLParser({ignoreAttributes : false, attributeNamePrefix: '$'});
  const file = fs.readFileSync(filename);
  const data = parser.parse(file.toString());
  const headers = data.config.parameter
    .map( (i) => i['$id'] ? 'timestamp' : i['$xml:id'])
    .map((i) => i.toLowerCase());
  return ['product', ...headers];
};

const findHeaderFile = (dir) => {
  const files = fs.readdirSync(dir);
  return files.filter((f) => f.endsWith('.xml'))[0]
}

const exportHeaders = (filename) => {
  const headers = getHeaders(filename);
  const headers_file = path.join(path.dirname(filename), 'headers.csv');
  fs.writeFile(headers_file, headers.join(','),
    (error) => {
      if (error) throw error;
      console.log(`headers file ${headers_file} created successfully.`);
    }
  );
};

const getPropertiesFromCSV = (data, extraProperties={}, columnsStats=[]) => {
  const properties = {...extraProperties};
  const csvContent = dsv.dsvFormat(',').parse(data, (r) => r);
  properties['product'] = csvContent[0].product;
  properties['start'] = csvContent[0].timestamp;
  properties['end'] = csvContent[csvContent.length - 1].timestamp;
  columnsStats.forEach((p) =>
    properties[p] = getStats(
      csvContent.filter((i) => Number(i[p]) !== NaN).map((i) => Number(i[p]))
    )
  );
  return properties;
};

const makeGeoJSON = (filename, extraProperties={}, columnsStats=[]) => {
  const file = fs.readFileSync(filename);
  const content = file.toString();
  let geojson;
  csv2geojson.csv2geojson(
    content,
    { latfield: 'latitude', lonfield: 'longitude', delimiter: ',' },
    (err, data) => geojson = data
    );
  geojson = csv2geojson.toLine(geojson);
  geojson.features[0].properties = getPropertiesFromCSV(content, extraProperties, columnsStats);
  return geojson;
};

const convertToGeoJSON = (
  filename,
  extraProperties={},
  columnsStats=['gps_altitude', 'pressure_altitude']
) => {
  return simplify(
    makeGeoJSON(filename, extraProperties, columnsStats),
    0.001
  );
};

module.exports = {
  getPropertiesFromCSV,
  makeGeoJSON,
  convertToGeoJSON,
  getHeaders,
  exportHeaders,
  findHeaderFile,
};
