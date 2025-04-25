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

echo Creating test user 1
$CURL --request PUT --header 'Content-Type: application/json' --data '{ "role":"user", "id":"user@example.org", "email":"user@example.org", "passphrase":"0NT3bCujDh6wvf5UTfXsjmlRhyEG6xvT1/kgiZPyjGk"}' $STEMMAREST_ENDPOINT/user/user@example.org
#if [ $? -ne 0 ]; then
#  echo Failed to create test user
#  exit 1
#fi
echo; echo Creating test user 2
$CURL --request PUT --header 'Content-Type: application/json' --data '{ "role":"user", "id":"benutzer@example.org", "email":"benutzer@example.org", "passphrase":"tVqCZ5ZTmWvxGIaqRTOkNK0ZNdnlZ+CcVfggdKEGnGI"}' $STEMMAREST_ENDPOINT/user/benutzer@example.org
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
$CURL --request POST --form name="Notre besoin" --form file=@data/besoin.xml --form filetype=stemmaweb --form userId=user@example.org --form language=French --form public=true $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
BESOIN_ID=`jq -e -r ".tradId" /tmp/stemmarest.response`
if [ -z $BESOIN_ID ]; then
  echo Failed to create Notre besoin
  exit 1
else
  echo Created tradition $BESOIN_ID
fi

echo; echo Adding stemweb_jobid 1 to Notre besoin
$CURL --request PUT --header 'Content-Type: application/json' --data '{"stemweb_jobid":1}' $STEMMAREST_ENDPOINT/tradition/$BESOIN_ID

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
$CURL --request POST --form name='Florilegium "Coislinianum B"' --form empty=yes --form filetype=csv --form userId=user@example.org --form language=Greek $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
FLOR_ID=`jq -r -e ".tradId" /tmp/stemmarest.response`
if [ -z $FLOR_ID ]; then
  echo Failed to create Florilegium
  exit 1
else
  echo Created tradition $FLOR_ID
fi
echo; echo Adding stemweb_jobid 2 to Florilegium
$CURL --request PUT --header 'Content-Type: application/json' --data '{"stemweb_jobid":2}' $STEMMAREST_ENDPOINT/tradition/$FLOR_ID
echo Uploading three sections
for e in w x y; do 
  $CURL --request POST --form name="section '$e'" --form file=@data/florilegium_${e}.csv --form filetype=csv $STEMMAREST_ENDPOINT/tradition/$FLOR_ID/section > /tmp/stemmarest.response
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

echo; echo Creating Legend fragment
$CURL --request POST --form name="Legend's fragment" --form file=@data/legendfrag.xml --form filetype=stemmaweb --form userId=user@example.org --form language=Armenian $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
LEGEND_ID=`jq -e -r ".tradId" /tmp/stemmarest.response`
if [ -z $LEGEND_ID ]; then
  echo Failed to create Legend fragment
  exit 1
else
  echo Created tradition $LEGEND_ID
fi
echo ...and its second section
$CURL --request POST --form name="section 2" --form file=@data/lf2.xml --form filetype=stemmaweb $STEMMAREST_ENDPOINT/tradition/$LEGEND_ID/section > /tmp/stemmarest.response
SECTID=`jq -r -e ".sectionId" /tmp/stemmarest.response`
if [ -z $SECTID ]; then
  echo Failed to create section 2
  exit 1
else
  echo ...added section 2
fi


echo; echo Creating Matthew 401
$CURL --request POST --form name="Matthew 401" --form file=@data/milestone-401.zip --form filetype=graphml --form userId=benutzer@example.org --form language=Armenian $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
MATTHEW_ID=`jq -e -r ".tradId" /tmp/stemmarest.response`
if [ -z $MATTHEW_ID ]; then
  echo Failed to create Matthew 401
  exit 1
else
  echo Created tradition $MATTHEW_ID
fi
# Stemma is included in zip data!

echo; echo Creating John verse
$CURL --request POST --form name="John verse" --form file=@data/john.xml --form filetype=stemmaweb --form userId=benutzer@example.org --form language=Greek --form public=true $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
JOHN_ID=`jq -e -r ".tradId" /tmp/stemmarest.response`
if [ -z $JOHN_ID ]; then
  echo Failed to create John verse
  exit 1
else
  echo Created tradition $JOHN_ID
fi
# No stemma

echo; echo Creating Arabic test snippet 
$CURL --request POST --form name="Arabic snippet" --form file=@data/arabic_snippet.csv --form filetype=csv --form userId=benutzer@example.org --form language=Arabic $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
ASNIP_ID=`jq -e -r ".tradId" /tmp/stemmarest.response`
if [ -z $ASNIP_ID ]; then
  echo Failed to create Arabic snippet
  exit 1
else
  echo Created tradition $ASNIP_ID
fi
echo; echo Adding stemweb_jobid 3 to Arabic test snippet
$CURL --request PUT --header 'Content-Type: application/json' --data '{"stemweb_jobid":3}' $STEMMAREST_ENDPOINT/tradition/$ASNIP_ID
# No stemma

echo; echo Creating admin-owned tradition 
$CURL --request POST --form name="Verbum uncorrected" --form file=@data/collatecorr.xml --form filetype=stemmaweb --form userId=admin@example.org --form language=Latin $STEMMAREST_ENDPOINT/tradition > /tmp/stemmarest.response
ASNIP_ID=`jq -e -r ".tradId" /tmp/stemmarest.response`
if [ -z $ASNIP_ID ]; then
  echo Failed to create Arabic snippet
  exit 1
else
  echo Created tradition $ASNIP_ID
fi
# No stemma
