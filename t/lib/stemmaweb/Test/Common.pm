package stemmaweb::Test::Common;

use strict;
use warnings;

BEGIN {
    $ENV{STEMMAWEB_CONFIG_LOCAL_SUFFIX} = 'tests';
    $ENV{STEMMAWEB_CONFIG_PATH} = '.';
}

1;
