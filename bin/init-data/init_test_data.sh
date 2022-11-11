#!/bin/bash

DIR_OF_THIS_SCRIPT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR_OF_THIS_SCRIPT" || exit 1

. .env

echo Creating test user
curl --silent --request PUT --header 'Content-Type: application/json' --data '{ "role":"user", "id":"user@example.org", "email":"user@example.org", "passphrase":"0NT3bCujDh6wvf5UTfXsjmlRhyEG6xvT1/kgiZPyjGk"}' $STEMMAREST_ENDPOINT/user/user@example.org
echo Creating test admin user
curl --silent --request PUT --header 'Content-Type: application/json' --data '{ "role":"admin", "id":"admin@example.org", "email":"admin@example.org", "passphrase":"AWHhPzEkrjRVdHsanteKojElOuXFQ80ouaZgWDUUgpk"}' $STEMMAREST_ENDPOINT/user/admin@example.org

echo Uploading Notre besoin
curl --silent --request POST --form name="Notre besoin" --form file=@data/besoin.xml --form filetype=stemmaweb --form userId=user@example.org --form language=French --form public=yes $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
BESOIN_ID=`jq -e -r ".tradId" /tmp/stemmarest.response`
if [ $? -ne 0 ]; then
  echo Failed to create Notre besoin
  exit 1
else
  echo Created tradition $BESOIN_ID
fi

echo ...and its stemma
curl --silent --request POST --header 'Content-Type: application/json' --data @data/besoin_stemma.json $STEMMAREST_ENDPOINT/tradition/$BESOIN_ID/stemma > /tmp/stemmarest.response
jq -e -r ".identifier" /tmp/stemmarest.response
if [ $? -ne 0 ]; then
  echo Failed to add Notre besoin stemma
  exit 1
fi

echo ...and its stemma
curl --silent --request POST --header 'Content-Type: application/json' --data @data/besoin_stemma_2.json $STEMMAREST_ENDPOINT/tradition/$BESOIN_ID/stemma > /tmp/stemmarest.response
jq -e ".identifier" /tmp/stemmarest.response
if [ $? -ne 0 ]; then
  echo Failed to add Notre besoin stemma
  exit 1
fi

echo Creating Florilegium
curl --silent --request POST --form name="Florilegium Coislinianum B" --form empty=yes --form filetype=csv --form userId=user@example.org --form language=Greek --form public=no $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
FLOR_ID=`jq -r -e ".tradId" /tmp/stemmarest.response`
if [ $? -ne 0 ]; then
  echo Failed to create Florilegium
  exit 1
else
  echo Created tradition $FLOR_ID
fi
echo Uploading three sections
idx=1
for e in w x y; do 
  curl --silent --request POST --form name="section $idx" --form file=@data/florilegium_${e}.csv --form filetype=csv $STEMMAREST_ENDPOINT/tradition/$FLOR_ID/section > /tmp/stemmarest.response
  SECTID=`jq -r -e ".sectionId" /tmp/stemmarest.response`
  if [ $? -ne 0 ]; then
    echo Failed to create section $e
    exit 1
  else
    echo ...added section $SECTID
  fi
done
echo ...and its stemma
curl --silent --request POST --header 'Content-Type: application/json' --data @data/florilegium_stemma.json $STEMMAREST_ENDPOINT/tradition/$FLOR_ID/stemma > /tmp/stemmarest.response
jq -e ".identifier" /tmp/stemmarest.response
if [ $? -ne 0 ]; then
  echo Failed to add Florilegium stemma
  exit 1
fi
