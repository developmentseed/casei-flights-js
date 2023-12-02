# casei-flights-js

Process flights data files from NASA CMR portal and convert it to GeoJSON format.

## Installing

Use `yarn install` to install this library in your environment.

## Usage

After downloading the files and storing it in a directory, execute the following command to process all the files in a directory:

```
yarn process <DIR> <Campaign> <Deployment> <Platform Name>
```

All the data files will be converted and merged into a single GeoJSON file.
