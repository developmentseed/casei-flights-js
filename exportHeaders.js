const { join } = require('path');

const { exportHeaders, findHeaderFile } = require('./index');

const xml = findHeaderFile(process.argv[2]);

if (xml) {
  exportHeaders(join(process.argv[2], xml));
}
