use strict;
use warnings;
use Test::More;


use Catalyst::Test 'stemmaweb';
use stemmaweb::Controller::Util;

ok( request('/util')->is_success, 'Request should succeed' );
done_testing();
