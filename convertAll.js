const fs = require('fs');
const path = require('path');
const geojsonMerge = require('@mapbox/geojson-merge');
const slugify = require('slugify');

const { convertToGeoJSON } = require('./index');

const dir = process.argv[2];
const properties = {};
if (process.argv[3]) {
  properties.deployment = process.argv[3];
}
if (process.argv[3]) {
  properties.platform_name = process.argv[4];
}

const files = fs.readdirSync(dir);
const collection = files
  .filter((f) => f.endsWith('.csv') && !f.endsWith('headers.csv'))
  .map((f) => path.join(dir, f))
  .map((f) => convertToGeoJSON(f, properties));

const mergedStream = geojsonMerge.merge(collection);
const resultFile = path.join(
  dir,
  slugify(`${process.argv[3]}-${process.argv[4]}.geojson`)
);

fs.writeFile(
  resultFile,
  JSON.stringify(mergedStream),
  (error) => {
    if (error) throw error;
    console.log(`${resultFile} created successfully.`);
  }
);
