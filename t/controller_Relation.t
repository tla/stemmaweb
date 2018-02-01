use strict;
use warnings;
use Test::More;


use Catalyst::Test 'stemmaweb';
use stemmaweb::Controller::Relation;

ok( request('/relation')->is_success, 'Request should succeed' );
done_testing();
