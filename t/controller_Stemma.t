use strict;
use warnings;
use Test::More;


use Catalyst::Test 'stemmaweb';
use stemmaweb::Controller::Stemma;

ok( request('/stemma')->is_success, 'Request should succeed' );
done_testing();
