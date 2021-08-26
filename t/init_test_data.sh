#!/bin/bash

. .env.local

echo Creating test user
curl --silent --request PUT --header 'Content-Type: application/json' --data '{ "role":"user", "id":"user@example.org", "email":"user@example.org", "passphrase":"0NT3bCujDh6wvf5UTfXsjmlRhyEG6xvT1/kgiZPyjGk"}' $STEMMAREST_ENDPOINT/user/user@example.org
echo Creating test admin user
curl --silent --request PUT --header 'Content-Type: application/json' --data '{ "role":"admin", "id":"admin@example.org", "email":"admin@example.org", "passphrase":"AWHhPzEkrjRVdHsanteKojElOuXFQ80ouaZgWDUUgpk"}' $STEMMAREST_ENDPOINT/user/admin@example.org


echo Uploading Notre besoin
curl --silent --request POST --form name="Notre besoin" --form file=@t/data/besoin.xml --form filetype=stemmaweb --form userId=user@example.org --form language=French --form public=yes $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
BESOIN_ID=`jq ".tradId" /tmp/stemmarest.response`
if [ -z $BESOIN_ID ]; then
  echo Failed to create Notre besoin
  exit 1
else
  BESOIN_ID=`echo $BESOIN_ID | sed s/\"//g`
  echo Created tradition $BESOIN_ID
fi

echo ...and its stemma
curl --silent --request POST --header 'Content-Type: application/json' --data @t/data/besoin_stemma.json $STEMMAREST_ENDPOINT/tradition/$BESOIN_ID/stemma > /tmp/stemmarest.response
jq -e ".identifier" /tmp/stemmarest.response
if [ $? -ne 0 ]; then
  echo Failed to add Notre besoin stemma
  exit 1
fi

echo Uploading Florilegium
curl --silent --request POST --form name="Florilegium Coislinianum B" --form file=@t/data/florilegium.csv --form filetype=csv --form userId=user@example.org --form language=Greek --form public=no $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
FLOR_ID=`jq -e ".tradId" /tmp/stemmarest.response`
if [ $? -ne 0 ]; then
  echo Failed to create Florilegium
  exit 1
else
  FLOR_ID=`echo $FLOR_ID | sed s/\"//g`
  echo Created tradition $FLOR_ID
fi
echo ...and its stemma
curl --silent --request POST --header 'Content-Type: application/json' --data @t/data/florilegium_stemma.json $STEMMAREST_ENDPOINT/tradition/$FLOR_ID/stemma > /tmp/stemmarest.response
jq -e ".identifier" /tmp/stemmarest.response
if [ $? -ne 0 ]; then
  echo Failed to add Florilegium stemma
  exit 1
fi
