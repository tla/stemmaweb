#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Based on https://github.com/DHUniWien/Stemweb/blob/ba236bddb3b869d6d7ff3d7ff9c0d894a2c9a6cb/docker/config/local_settings.py

import os

# Alias for quick access
env = os.environ

# First copy this file as local_settings.py (into same folder)
# then add information of your own local database and
# other settings here.

# These are locally relevant database and other settings
# strings for settings.py.

# IMPORTANT: DO NOT COMMIT lstrings.py INTO REPOSITORY
# NOR DO NOT REMOVE lstring.py FROM .gitignore IN ANY
# CIRCUMSTANCES.

# Hostnames that Stemweb should be serving from
STEMWEB_HOST = env['STEMWEB_HOST']
allowed_hosts = [STEMWEB_HOST, 'localhost', '127.0.0.1']

# Location of the Redis server for Stemweb
REDIS_HOST = env['REDIS_HOST']
REDIS_PORT = env['REDIS_PORT']
redis_server = f'redis://{REDIS_HOST}:{REDIS_PORT}'

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
# db_engine = 'django.db.backends.sqlite3'
db_engine = 'django.db.backends.mysql'

# Name of your db. In sqlite3 this is absolute path for
# your database-file.
# db_name = '/home/stemweb/sqlite3db/stemweb_v1.db'
MYSQL_DATABASE = env['MYSQL_DATABASE']
db_name = MYSQL_DATABASE

MYSQL_USER = env['MYSQL_USER']
db_user = MYSQL_USER                   # Your db user. Not needed in sqlite3

MYSQL_PASSWORD = env['MYSQL_PASSWORD']
db_pwd = MYSQL_PASSWORD                # Your db password. Not needed in sqlite3

MYSQL_HOST = env['MYSQL_HOST']
db_host = MYSQL_HOST                   # Host, leave blank if db is on local computer.

MYSQL_PORT = env['MYSQL_PORT']
db_port = MYSQL_PORT                   # Port to your db. Can be left blank

# name of your ROOT_URLCONF. Needs to be in here, because
# of some inconsisties in package naming on linux vs. mac.
# This is most likely stemweb.urls or Stemweb.urls.
root_urls = 'Stemweb.urls'

# Secret key. Cannot be empty string.
STEMWEB_SECRET_KEY = env['STEMWEB_SECRET_KEY']
secret_key = STEMWEB_SECRET_KEY

# Default email backend. For private use console will suffice, but for public use either
# dummy or smtp.
email_backend = 'django.core.mail.backends.console.EmailBackend'

                                                           # On Univ. of Helsinki cs-department
email_host = ''         # Smtp email server.               mail.cs.helsinki.fi
email_host_user = ''    # Username on email server         cs-account@cs.helsinki.fi
email_host_pwd = ''     # Password on email server         your cs-account pwd
email_port = ''         # Port of the email server         587
email_tls = ''          # Does the email server use tls.   True

recaptcha_public_key = ''
recaptcha_private_key = ''

