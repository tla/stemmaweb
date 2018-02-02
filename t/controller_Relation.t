use strict;
use warnings;
use Test::More;
use HTTP::Request::Common qw/ GET POST DELETE /;
use JSON qw/from_json/;

use Catalyst::Test 'stemmaweb';
use stemmaweb::Controller::Relation;

use FindBin;
use lib ("$FindBin::Bin/lib");

use stemmaweb::Test::DB;
my $textids = stemmaweb::Test::DB::new_db("$FindBin::Bin/data");

# Traditions used to test
my $pubrelurl = '/relation/' . $textids->{public}->[2];
my $privrelurl = '/relation/' . $textids->{private}->[0];
my $multisecturl = '/relation/' . $textids->{private}->[2];

### While not logged in:

# test GET public text
my $attempt = request GET $pubrelurl;
ok($attempt->is_redirect, "Got redirect to first section");
$pubrelurl = $attempt->header('location');
$attempt = request GET $pubrelurl;
ok($attempt->is_success, "Loaded viewer for public tradition");
like($attempt->decoded_content, qr!"readonly" === "full"!, "Viewer is in readonly mode");

# test GET private text (403)
$attempt = request GET $privrelurl;
is($attempt->code, 403, "Permission denied for private tradition");

# test GET, POST, DELETE relationships

$attempt = request GET $pubrelurl . "/relationships";
ok($attempt->is_success, "Requested relationships on public tradition section");
like( $attempt->header('Content-Type'), qr/application\/json/, "Got a JSON response");
my $rels = from_json($attempt->decoded_content);
is(scalar @$rels, 96, "Found the correct number of relationships");

$attempt = request POST $pubrelurl . "/relationships",
	[source_id => $rels->[0]->{source}, target_id => $rels->[0]->{target}];
is($attempt->code, 403, "Permission denied for relationship push");

$attempt = request DELETE $pubrelurl . "/relationships", 
	[ source_id => $rels->[0]->{source}, target_id => $rels->[0]->{target} ];
is($attempt->code, 403, "Permission denied for relationship deletion");

# test GET readings

# test GET, POST reading

# test POST compress/merge/duplicate/split (403)

### While logged in:

# test GET private text / first section

# test GET, POST, DELETE relationships

# test GET, POST reading

# test POST compress

# test POST merge

# test POST duplicate

# test POST split


done_testing();
