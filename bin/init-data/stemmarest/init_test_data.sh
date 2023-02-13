#!/bin/bash

DIR_OF_THIS_SCRIPT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR_OF_THIS_SCRIPT" || exit 1

# Look for a `.env` file recursively up the directory tree for 3 levels and source it if found
for _ in {1..3}; do
    if [ -f .env ]; then
        source .env
        break
    fi
    cd ..
done
cd "$DIR_OF_THIS_SCRIPT" || exit 1


EXPECTED_ENV_VARS=("STEMMAREST_ENDPOINT")
for ENV_VAR in "${EXPECTED_ENV_VARS[@]}"; do
    if [ -z "${!ENV_VAR}" ]; then
        echo "ERROR: Environment variable $ENV_VAR is not set."
        exit 1
    fi
done

if [ -n $STEMMAREST_AUTH_USER ]; then
    CURL="curl --silent -u $STEMMAREST_AUTH_USER:$STEMMAREST_AUTH_PASS"
else
    CURL="curl --silent"
fi

echo Creating test user
$CURL --request PUT --header 'Content-Type: application/json' --data '{ "role":"user", "id":"user@example.org", "email":"user@example.org", "passphrase":"0NT3bCujDh6wvf5UTfXsjmlRhyEG6xvT1/kgiZPyjGk"}' $STEMMAREST_ENDPOINT/user/user@example.org
#if [ $? -ne 0 ]; then
#  echo Failed to create test user
#  exit 1
#fi
echo; echo Creating test admin user
$CURL --request PUT --header 'Content-Type: application/json' --data '{ "role":"admin", "id":"admin@example.org", "email":"admin@example.org", "passphrase":"AWHhPzEkrjRVdHsanteKojElOuXFQ80ouaZgWDUUgpk"}' $STEMMAREST_ENDPOINT/user/admin@example.org
#if [ $? -ne 0 ]; then
#  echo Failed to create test user
#  exit 1
#fi

echo; echo Uploading Notre besoin
$CURL --request POST --form name="Notre besoin" --form file=@data/besoin.xml --form filetype=stemmaweb --form userId=user@example.org --form language=French --form public=yes $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
BESOIN_ID=`jq -e -r ".tradId" /tmp/stemmarest.response`
if [ -z $BESOIN_ID ]; then
  echo Failed to create Notre besoin
  exit 1
else
  echo Created tradition $BESOIN_ID
fi

echo ...and its stemma
$CURL --request POST --header 'Content-Type: application/json' --data @data/besoin_stemma.json $STEMMAREST_ENDPOINT/tradition/$BESOIN_ID/stemma
if [ $? -ne 0 ]; then
  echo Failed to add Notre besoin stemma
  exit 1
fi

echo ...and its other stemma
$CURL --request POST --header 'Content-Type: application/json' --data @data/besoin_stemma_2.json $STEMMAREST_ENDPOINT/tradition/$BESOIN_ID/stemma
if [ $? -ne 0 ]; then
  echo Failed to add other Notre besoin stemma
  exit 1
fi

echo; echo Creating Florilegium
$CURL --request POST --form name="Florilegium Coislinianum B" --form empty=yes --form filetype=csv --form userId=user@example.org --form language=Greek --form public=no $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
FLOR_ID=`jq -r -e ".tradId" /tmp/stemmarest.response`
if [ -z $FLOR_ID ]; then
  echo Failed to create Florilegium
  exit 1
else
  echo Created tradition $FLOR_ID
fi
echo Uploading three sections
for e in w x y; do 
  $CURL --request POST --form name="section $e" --form file=@data/florilegium_${e}.csv --form filetype=csv $STEMMAREST_ENDPOINT/tradition/$FLOR_ID/section > /tmp/stemmarest.response
  SECTID=`jq -r -e ".sectionId" /tmp/stemmarest.response`
  if [ -z $SECTID ]; then
    echo Failed to create section $e
    exit 1
  else
    echo ...added section $SECTID
  fi
done
echo ...and its stemma
$CURL --request POST --header 'Content-Type: application/json' --data @data/florilegium_stemma.json $STEMMAREST_ENDPOINT/tradition/$FLOR_ID/stemma
if [ $? -ne 0 ]; then
  echo Failed to add Florilegium stemma
  exit 1
fi

echo; echo Creating Matthew 401
$CURL --request POST --form name="Matthew 401" --form file=@data/milestone-401.zip --form filetype=graphml --form userId=user@example.org --form language=Armenian --form public=yes $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
MATTHEW_ID=`jq -e -r ".tradId" /tmp/stemmarest.response`
if [ -z $MATTHEW_ID ]; then
  echo Failed to create Matthew 401
  exit 1
else
  echo Created tradition $MATTHEW_ID
fi