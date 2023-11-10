const fs = require('fs');

const { convertToGeoJSON } = require('./index');

const properties = {};
const filename = process.argv[2];
if (process.argv[3]) {
  properties.deployment = process.argv[3];
}
if (process.argv[3]) {
  properties.platform_name = process.argv[4];
}

const geojson = convertToGeoJSON(filename, properties)
const geoJsonFilename = filename.endsWith('.csv')
  ? filename.replace('.csv', '.geojson')
  : filename.replace('.ict', '.geojson');

fs.writeFileSync(
  geoJsonFilename,
  JSON.stringify(geojson)
);
console.log(`Converted ${filename} to ${geoJsonFilename}.`);
