const fs = require('fs');
const path = require('path');
const dsv = require('d3-dsv');
const csv2geojson = require('csv2geojson');
const simplify = require('simplify-geojson');
const { XMLParser } = require('fast-xml-parser');
const geojsonMerge = require('@mapbox/geojson-merge');
const dist = require('@turf/distance');

const { getStats } = require('./stats');

const getHeaders = (filename) => {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '$' });
  const file = fs.readFileSync(filename);
  const data = parser.parse(file.toString());
  const headers = data.config.parameter
    .map((i) => (i.$id ? 'timestamp' : i['$xml:id']))
    .map((i) => i.toLowerCase());
  return ['product', ...headers];
};

const findHeaderFile = (dir) => {
  const files = fs.readdirSync(dir);
  return files.filter((f) => f.endsWith('.xml'))[0]
};

const exportHeaders = (filename) => {
  const headers = getHeaders(filename);
  const headersFile = path.join(path.dirname(filename), 'headers.csv');
  fs.writeFile(headersFile, headers.join(','), (error) => {
    if (error) throw error;
    console.log(`headers file ${headersFile} created successfully.`);
  });
};

const getPropertiesFromPath = (dir) => {
  const platformName = path.basename(dir);
  const deployment = path.basename(path.dirname(dir));
  const campaign = path.basename(path.dirname(path.dirname(dir)));
  return { platformName, deployment, campaign };
};

const splitICTFile = (filename) => {
  const file = fs.readFileSync(filename);
  let content = file.toString();
  if (content.indexOf('Time_Start') !== -1) {
    content = content.substr(content.lastIndexOf('Time_Start,'));
  }
  if (content.indexOf('Time_mid') !== -1) {
    content = content.substr(content.lastIndexOf('Time_mid,'));
  }
  // some files have Lat and Long as column headers
  content = content.replace(',Lat,', ',latitude,');
  content = content.replace(',Long,', ',longitude,');
  fs.writeFile(
    filename.replace('.ict', '.csv'),
    content.toLowerCase(),
    (error) => {
      if (error) throw error;
      console.log(`${filename.replace('.ict', '.csv')} created successfully.`);
    }
  );
};

const getPropertiesFromCSV = (data, extraProperties = {}, columnsStats = []) => {
  const properties = { ...extraProperties };
  const csvContent = dsv.dsvFormat(',').parse(data, (r) => r);
  properties.product = csvContent[0].product;
  properties.start = csvContent[0].timestamp;
  properties.end = csvContent[csvContent.length - 1].timestamp;
  columnsStats.forEach(
    (p) => {
      properties[p] = getStats(
        csvContent.filter((i) => Number(i[p]) !== NaN).map((i) => Number(i[p]))
      );
    }
  );
  return properties;
};

const cleanCoords = (coords, maxDistance) => {
  let lastValidCoord;
  return coords.filter(
    (c, i) => {
      if (i > 0) {
        // maxDistance unit is kilometers
        const isValid = dist.default(c, lastValidCoord) < maxDistance;
        if (isValid) lastValidCoord = c;
        return isValid;
      }
      lastValidCoord = c;
      return true;
    }
  );
};

const makeStaticLocationsGeoJSON = (filename) => {
  const file = fs.readFileSync(filename);
  const content = file.toString();
  let geojson;
  csv2geojson.csv2geojson(
    content,
    { latfield: 'latitude', lonfield: 'longitude', delimiter: ',' },
    (err, data) => geojson = data
  );
  return geojson;
};

const makeGeoJSON = (filename, extraProperties = {}, columnsStats = []) => {
  const file = fs.readFileSync(filename);
  const content = file.toString();
  let geojson;
  csv2geojson.csv2geojson(
    content,
    { latfield: 'latitude', lonfield: 'longitude', delimiter: ',' },
    (err, data) => geojson = data
  );
  geojson.features = geojson.features.filter((i) => (
    i.geometry.coordinates[0] >= -180 && i.geometry.coordinates[1] >= -90
    && i.geometry.coordinates[0] <= 180 && i.geometry.coordinates[1] <= 90
  ));
  geojson = csv2geojson.toLine(geojson);
  geojson.features[0].properties = getPropertiesFromCSV(content, extraProperties, columnsStats);
  return geojson;
};

const convertToGeoJSON = (
  filename,
  extraProperties = {},
  columnsStats = ['gps_altitude', 'pressure_altitude']
) => {
  const geojson = simplify(
    makeGeoJSON(filename, extraProperties, columnsStats),
    0.001
  );
  // some files have the same pair coordinates repeated in all rows, what generates
  // an invalid LineString starting and ending in the same location, so we need to
  // exclude those items from the final GeoJSON
  geojson.features = geojson.features.filter((i) => i.geometry.coordinates.length > 2);
  return geojson;
};

const mergeGeoJSONCollection = (collection, outputFilename) => {
  const mergedStream = geojsonMerge.merge(collection);

  fs.writeFile(
    outputFilename,
    JSON.stringify(mergedStream),
    (error) => {
      if (error) throw error;
      console.log(`${outputFilename} created successfully.`);
    }
  );
};

module.exports = {
  getPropertiesFromCSV,
  makeGeoJSON,
  makeStaticLocationsGeoJSON,
  convertToGeoJSON,
  getHeaders,
  exportHeaders,
  findHeaderFile,
  splitICTFile,
  getPropertiesFromPath,
  mergeGeoJSONCollection,
  cleanCoords,
};
