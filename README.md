Stemmaweb - a web application for text tradition analysis
=========================================================

Stemmaweb is a web application for viewing and manipulating text traditions based on
the [Stemmarest](http://dhuniwien.github.io/tradition_repo/) data model.

Trying it out (eventually)
------------
A `docker-compose.yml` file is included in this directory, which will launch Stemmaweb behind an nginx proxy listening
on port 5000. It may be necessary to obtain your own development API keys for Google and reCAPTcha authentication, in
order to create user accounts.

Development / installation
------------

You will need an instance of Stemmarest running somewhere. The easiest is to run it from Docker:

    docker run -d --name stemmarest -p 8080:8080 dhuniwien/stemmarest:latest

Once that is done, you should create a `.env` file in this directory that indicates in the `STEMMAREST_ENDPOINT`
variable where the Stemmarest server can be reached; for example, after running the Docker command above, the contents
of the file should be

    STEMMAREST_ENDPOINT=http://localhost:8080/stemmarest

Now you can add test data to your Stemmarest instance using the script `t/init_test_data.sh`; please note that this
script depends on the presence of the [`jq`](https://stedolan.github.io/jq/) program to parse JSON responses from
Stemmarest.

To install the necessary dependencies for the Stemmaweb server, run

    yarn install

from this directory, and

    yarn start

to start the server. You can then access it at http://localhost:3000/. 
