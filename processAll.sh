#!/bin/bash

for i in `find $1 -type d  -mindepth 2`
do
    yarn process $i
done

for i in `find $1 -type f -name "*.geojson" -mindepth 2`;
do
    mv $i $1;
done;

DIR=$(echo "$1" | sed 's:/*$::')

npx geojson-merge -s $DIR/*.geojson > $DIR/${DIR##*/}.geojson
