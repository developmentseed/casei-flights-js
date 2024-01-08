const fs = require('fs');
const path = require('path');
const dsv = require('d3-dsv');
const csv2geojson = require('csv2geojson');
const simplify = require('simplify-geojson');
const { XMLParser } = require('fast-xml-parser');
const geojsonMerge = require('@mapbox/geojson-merge');
const dist = require('@turf/distance');
const splitGeoJSON = require('geojson-antimeridian-cut');

const { getStats } = require('./stats');

/**
* Read a XML file and get the headers information.
* @param {String} filename - path to the XML file
* @return {Array} headers array
*/
const getHeaders = (filename) => {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '$' });
  const file = fs.readFileSync(filename);
  const data = parser.parse(file.toString());
  const headers = data.config.parameter
    .map((i) => (i.$id ? 'timestamp' : i['$xml:id']))
    .map((i) => i.toLowerCase());
  return ['product', ...headers];
};

/**
* Inspect a platform data directory and find the header file.
* @param {String} dir - Directory containing the platform data
* @return {String} header filename
*/
const findHeaderFile = (dir) => {
  const files = fs.readdirSync(dir);
  return files.filter((f) => f.endsWith('.xml'))[0];
};

/**
* Reads a XML file and export the headers to a new CSV file.
* @param {String} filePath - XML file path
*/
const exportHeaders = (filePath) => {
  const headers = getHeaders(filePath);
  const headersFile = path.join(path.dirname(filePath), 'headers.csv');
  fs.writeFile(headersFile, headers.join(','), (error) => {
    if (error) throw error;
    console.log(`headers file ${headersFile} created successfully.`);
  });
};

/**
* Read a directory structure and return the properties metadata that needs to be added to a GeoJSON
file.
* @param {String} dir - Directory path
* @return {Object} platformName, deployment and campaign information
*/
const getPropertiesFromPath = (dir) => {
  const platformName = path.basename(dir);
  const deployment = path.basename(path.dirname(dir));
  const campaign = path.basename(path.dirname(path.dirname(dir)));
  return { platformName, deployment, campaign };
};

/**
* Reads an ICT file and creates a CSV file, containing only the relevant data.
* @param {String} filePath - XML file path
*/
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

/**
* Reads a CSV file and returns an object with the properties that needs to be added to the
GeoJSON feature. The metadata can be composed of some predefined metadata, and stats calculated
from the CSV lines.
* @summary Reads a CSV file and returns an object with the properties that needs to be added to the
GeoJSON feature.
* @param {String} data - CSV content
* @param {Object} extraProperties - predefined properties
* @param {Array} columnsStats - an array containing the columns that will have the stats computed.
Stats include the average, minimum and maximum values.
* @return {Object} properties object
*/
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

/**
* Iterates over an array of coordinates and remove the ones that are further away than X
kilometers from the previous valid coordinate.
* @param {Array} coords - geojson feature coordinates array
* @param {Number} maxDistance - maximum acceptable distance from the previous coordinate in
kilometers
* @return {Array} coordinates that pass the maximum distance check
*/
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

/**
* Reads a CSV file containing a set of static locations and returns the data in GeoJSON format.
* @param {String} filePath - path to a comma delimited CSV file
* @return {Object} resulting GeoJSON object
*/
const makeStaticLocationsGeoJSON = (filePath) => {
  const file = fs.readFileSync(filePath);
  const content = file.toString();
  let geojson;
  csv2geojson.csv2geojson(
    content,
    { latfield: 'latitude', lonfield: 'longitude', delimiter: ',' },
    (err, data) => geojson = data
  );
  return geojson;
};

/**
* Reads a CSV file containing flight data and returns the data in GeoJSON format.
* @param {String} filePath - path to a comma delimited CSV file
* @param {Object} extraProperties - predefined properties
* @param {Array} columnsStats - an array containing the columns that will have the stats computed.
Stats include the average, minimum and maximum values.
* @param {Boolean} fixCoords - if true, coordinates that seems to be wrong will be removed.
See cleanCoords function.
* @return {Object} resulting GeoJSON object
*/
const makeGeoJSON = (filePath, extraProperties = {}, columnsStats = [], fixCoords = true) => {
  const file = fs.readFileSync(filePath);
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
  if (fixCoords) {
    const newCoords = cleanCoords(geojson.features[0].geometry.coordinates, 300);
    geojson.features[0].geometry.coordinates = newCoords;
  }
  geojson.features[0].properties = getPropertiesFromCSV(content, extraProperties, columnsStats);
  return geojson;
};

/**
* Reads a CSV file containing flight data and returns the data in GeoJSON format,
with the geometries simplified and filtering out the invalid LineStrings.
* @param {String} filePath - path to a comma delimited CSV file
* @param {Object} extraProperties - predefined properties
* @param {Array} columnsStats - an array containing the columns that will have the stats computed.
Stats include the average, minimum and maximum values.
* @return {Object} resulting GeoJSON object
*/
const convertToGeoJSON = (
  filePath,
  extraProperties = {},
  columnsStats = ['gps_altitude', 'pressure_altitude']
) => {
  const geojson = simplify(
    makeGeoJSON(filePath, extraProperties, columnsStats),
    0.001
  );
  // some files have the same pair coordinates repeated in all rows, what generates
  // an invalid LineString starting and ending in the same location, so we need to
  // exclude those items from the final GeoJSON
  geojson.features = geojson.features.filter((i) => i.geometry.coordinates.length > 2);
  // split features if it crosses the antimeridian
  return splitGeoJSON(geojson);
};

/**
* Merge in a single file a GeoJSON feature collection.
* @param {Array} collection - collection of GeoJSON features
* @param {String} outputFilename - name of the output file
*/
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
