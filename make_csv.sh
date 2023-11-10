#!/bin/bash

headers_file=$1/headers.csv
for f in `ls $1/*.txt`;
do
    new_name=${f%.txt}.csv;
    cat $headers_file $f > $new_name;
done

for f in `ls $1/*.ict`;
do
    yarn split_ict $f;
done
