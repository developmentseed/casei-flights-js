# casei-flights-js

Process flights data files from NASA CMR portal and convert it to GeoJSON format.

## Installing

Use `yarn install` to install this library in your environment.

## Usage

### .txt files

After downloading the files and storing it in a directory, execute the following command to process all the files in a directory:

```
yarn process <DIR> <Deployment> <Platform Name>
```

All the data files will be converted and merged into a single GeoJSON file.

### .ict files

Case the files have the .ict extension, the process is a bit different. Use the following commands:

```
yarn make_csv <DIR>
yarn convert_all <DIR> <Deployment> <Platform Name>
```