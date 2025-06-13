#!/bin/bash

# Wait for the Stemmarest server to turn up
for ((i=1; i<=5; i++)); do
    echo "Attempt $i of 5 to set up the test DB"
    # Set up the test data
    sleep 10
    perl script/n4jtestdb.pl
    if [ $? -eq 0 ]; then
        break
    fi
    if [ $i -eq 5 ]; then
        echo "Could not set up the test data."
        exit 1
    fi
done

# Start the development server, not with the debugger
perl script/stemmaweb_server.pl -r
