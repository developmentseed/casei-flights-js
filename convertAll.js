const fs = require('fs');
const path = require('path');
const geojsonMerge = require('@mapbox/geojson-merge');
const slugify = require('slugify');

const { convertToGeoJSON, makeStaticLocationsGeoJSON } = require('./index');

const dir = process.argv[2];
const platform_name = path.basename(dir);
const deployment = path.basename(path.dirname(dir));
const campaign = path.basename(path.dirname(path.dirname(dir)));
const properties = { platform_name, deployment, campaign };

const files = fs.readdirSync(dir);
const collection = files
  .filter((f) => f.endsWith('.csv') && !f.endsWith('headers.csv'))
  .map((f) => path.join(dir, f))
  .map((f) => convertToGeoJSON(f, properties));

const mergedStream = geojsonMerge.merge(collection);
const resultFile = path.join(
  dir,
  slugify(`${deployment}-${platform_name}.geojson`)
);

fs.writeFile(
  resultFile,
  JSON.stringify(mergedStream),
  (error) => {
    if (error) throw error;
    console.log(`${resultFile} created successfully.`);
  }
);
