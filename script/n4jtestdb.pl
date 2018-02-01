#!/usr/bin/env perl

use strict;
use warnings;

use FindBin;
use lib ("$FindBin::Bin/../t/lib");

use stemmaweb::Test::DB;
stemmaweb::Test::DB::new_db("$FindBin::Bin/../t/data");