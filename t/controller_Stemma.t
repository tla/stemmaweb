use strict;
use warnings;
use Test::More;
use HTTP::Request::Common;


use Catalyst::Test 'stemmaweb';
use stemmaweb::Controller::Stemma;

use FindBin;
use lib ("$FindBin::Bin/lib");

use stemmaweb::Test::DB;
my $textids = stemmaweb::Test::DB::new_db("$FindBin::Bin/data");

# Test /stemma GET, POST/0, POST/n
my $dnestemma = request('/stemma/' . $textids->{public}->[0] . '/doesnotexist');
is( $dnestemma->code, 404, "Returned 404 on nonexistent stemma" );
like( $dnestemma->header('Content-Type'), qr/application\/json/,
    "Returned JSON answer for missing stemma" );

is( request( '/stemma/' . $textids->{private}->[0] . '/stemma' )->code, 403,
    "Permission denied to view stemma on private tradition" );
my $pubstemurl = '/stemma/' . $textids->{public}->[0];
my $psreq = request( "$pubstemurl/0" );
TODO: {
    local $TODO = "Is this correct?";
    ok( $psreq->is_success, "Got OK even on nonexistent stemma" );
    like( $psreq->header('Content-Type'), qr/xml/,
        "Returned SVG answer for stemma by default" );
    is( $psreq->content, '', "Got empty svg for nonexistent stemma" );
}
my $pspost = request POST "$pubstemurl/n", [
    dot => 'digraph stemma { A -> B; A -> C }'];
is( $pspost->code, 403, "Permission denied trying to create new stemma" );

# Test /stemmadot GET/0

done_testing();
