const fs = require('fs');
const path = require('path');
const geojsonMerge = require('@mapbox/geojson-merge');
const slugify = require('slugify');

const { convertToGeoJSON, makeStaticLocationsGeoJSON } = require('./index');

const dir = process.argv[2];
const properties = {};
if (process.argv[3]) {
  properties.campaign = process.argv[3];
}
if (process.argv[4]) {
  properties.deployment = process.argv[4];
}
if (process.argv[5]) {
  properties.platform_name = process.argv[5];
}

const files = fs.readdirSync(dir);
const collection = files
  .filter((f) => f.endsWith('.csv') && !f.endsWith('headers.csv'))
  .map((f) => path.join(dir, f))
  .map((f) => convertToGeoJSON(f, properties));

const mergedStream = geojsonMerge.merge(collection);
const resultFile = path.join(
  dir,
  slugify(`${process.argv[4]}-${process.argv[5]}.geojson`)
);

fs.writeFile(
  resultFile,
  JSON.stringify(mergedStream),
  (error) => {
    if (error) throw error;
    console.log(`${resultFile} created successfully.`);
  }
);
