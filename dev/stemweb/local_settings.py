#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os

# First copy this file as local_settings.py (into same folder) 
# then add information of your own local database and 
# other settings here.
 
# These are locally relevant database and other settings
# strings for settings.py. 

# IMPORTANT: DO NOT COMMIT lstrings.py INTO REPOSITORY
# NOR DO NOT REMOVE lstring.py FROM .gitignore IN ANY
# CIRCUMSTANCES. 

# Don't set this in production!
DEBUG = os.getenv("STEMWEB_DEBUG", "False").lower() == "true" 


# Hostnames that Stemweb should be serving from
allowed_hosts = ['stemweb', 'localhost', '127.0.0.1']

# Location of the Redis server for Stemweb
redis_server = 'redis://redis:6379'

# Local db admin name and email. Don't really need these
# in local testing. But it's good to fill these, since
# in some point in the future the site may try to send
# some email to admins, which may cause some error messages
# if they are not set.
db_admin = ''
db_email = ''

# Local db engine (mysql, sqlite3 or postgresql_psycopg2)
# postgresql_psycopg2 needs psycopg2-packet installed to 
# work. Add the name of the engine after already filled text.
#db_engine = 'django.db.backends.sqlite3'
db_engine = 'django.db.backends.mysql'

# Name of your db. In sqlite3 this is absolute path for
# your database-file.
#db_name = '/home/stemweb/sqlite3db/stemweb_v1.db'
db_name = os.getenv("STEMWEB_DBNAME", 'stemwebdb_v1') 

db_user = os.getenv("STEMWEB_DBUSER", 'stemweb')  # Your db user. Not needed in sqlite3
db_pwd  = os.getenv("STEMWEB_DBPASS", 'StemWeb-DevPassWord') # Your db password. Not needed in sqlite3
db_host = os.getenv("STEMWEB_DBHOST", 'mariadb')  # Host, leave blank if db is on local computer.
db_port = os.getenv("STEMWEB_DBPORT", '3306')     # Port to your db. Can be left blank

# name of your ROOT_URLCONF. Needs to be in here, because
# of some inconsisties in package naming on linux vs. mac.
# This is most likely stemweb.urls or Stemweb.urls.
root_urls = 'Stemweb.urls'

# Veeerry secret key. Cannot be empty string.
secret_key = 'ThisIsVewwySekrit'
#secret_key = os.environ['SECRET_KEY']

# Default email backend. For private use console will suffice, but for public use either
# dummy or smtp.
email_backend = 'django.core.mail.backends.console.EmailBackend'

                                                        # On Univ. of Helsinki cs-department
email_host = ''         # Smtp email server.               mail.cs.helsinki.fi
email_host_user = ''    # Username on email server         cs-account@cs.helsinki.fi
email_host_pwd = ''     # Password on email server         your cs-account pwd 
email_port = ''         # Port of the email server         587
email_tls = ''          # Does the email server use tls.   True

recaptcha_public_key  = ''
recaptcha_private_key = ''

