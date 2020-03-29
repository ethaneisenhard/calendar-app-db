#!/bin/sh
###############

sleep 20

echo Creating metro table
aws dynamodb create-table \
--attribute-definitions AttributeName=id,AttributeType=S \
--table-name Calendar-Metro \
--key-schema AttributeName=id,KeyType=HASH \
--provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10 \
--endpoint-url http://dynamodb:8000

echo Creating azure table
aws dynamodb create-table \
--attribute-definitions AttributeName=id,AttributeType=S \
--table-name Calendar-Azure \
--key-schema AttributeName=id,KeyType=HASH \
--provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10 \
--endpoint-url http://dynamodb:8000

echo Loading data into metro table
aws dynamodb batch-write-item \
--request-items file:///root/data/metro.json \
--endpoint-url http://dynamodb:8000

echo Loading data into azure table
aws dynamodb batch-write-item \
--request-items file:///root/data/azure.json \
--endpoint-url http://dynamodb:8000


sleep 60000000