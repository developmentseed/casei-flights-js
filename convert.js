const fs = require('fs');

const { convertToGeoJSON, makeStaticLocationsGeoJSON } = require('./index');

let geojson;
const properties = {};
const filename = process.argv[2];

if (process.argv[3]) {
  properties.campaign = process.argv[3];
}
if (process.argv[4]) {
  properties.deployment = process.argv[4];
}
if (process.argv[5]) {
  properties.platform_name = process.argv[5];
}

if (filename.endsWith('static.csv')) {
  geojson = makeStaticLocationsGeoJSON(filename);
} else {
  geojson = convertToGeoJSON(filename, properties);
}

const geoJsonFilename = filename.endsWith('.csv')
  ? filename.replace('.csv', '.geojson')
  : filename.replace('.ict', '.geojson');
fs.writeFileSync(
  geoJsonFilename,
  JSON.stringify(geojson)
);
console.log(`Converted ${filename} to ${geoJsonFilename}.`);
