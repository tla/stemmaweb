
Stemmaweb - a Catalyst webservice for text tradition analysis
=============================================================

Stemmaweb is a web application, developed in Perl (using the Catalyst framework) and Javascript (using JQuery), 


Installation 
------------

To run Stemmaweb you need a working Perl installation (5.12 or above)
and, preferably, a working webserver. The following steps will get you
set up to run the standalone service:

* Ensure that the following software is installed (the list given is that of the relevant Ubuntu packages):
  * gcc
  * make
  * libxml2-dev
  * zlib1g-dev
  * libexpat1-dev
  * graphviz
  * libssl-dev
  * libgmp-dev
* Install the following Perl modules:
  * App::cpanminus
  * Module::Install::Catalyst
* Create a database for the storage of text tradition data. This can be anything supported by Perl's DBI.
* Install the dependencies for Stemmaweb from this directory: 

		cd /PATH/TO/stemmaweb && cpanm -S --installdeps .
* Make a test directory and test the installation at http://localhost:3000/ :

		script/maketestdb.pl
		script/stemmaweb_server.pl
* Replace the database settings in stemmaweb.conf with the settings for your database. If you are using MySQL, for example, the settings might look like this:

		<model_args>
		dsn dbi:mysql:dbname=stemmaweb
		<extra_args>
			user STEMMAWEB_USER
			password STEMMAWEB_PASS
		</extra_args>
		</model_args>
* (Optionally) configure Stemmaweb to run under FastCGI, Plack, or any other Catalyst-compatible application framework. See http://www.catalystframework.org for more information.