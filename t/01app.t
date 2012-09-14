#!/usr/bin/env perl
use strict;
use warnings;
use Test::More;

use Catalyst::Test 'stemmaweb';

ok( request('/')->is_success, 'Got root HTML' );
ok( request('/about')->is_success, 'Got about page HTML' );

done_testing();
