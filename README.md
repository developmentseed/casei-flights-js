# casei-flights-js

Process flights data files from NASA CMR portal and convert it to GeoJSON format.

## Installing

Use `yarn install` to install this library in your environment.

## Usage

### Process a plaftorm file collection

After downloading the files and storing it in a directory, execute the following command to process all the files in a directory:

```
yarn process <DIR>
```

It's expected that the directory structure is `./<campaign>/<deployment>/<platform_name>`, so the metadata that will be associated with the features will be get from the folder structure.

All the data files will be converted and merged into a single GeoJSON file.
