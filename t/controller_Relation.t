use strict;
use warnings;
use Test::More;
use HTTP::Request::Common qw/ GET POST DELETE /;
use JSON qw/from_json/;

use Catalyst::Test 'stemmaweb';
use Test::WWW::Mechanize::Catalyst;
use stemmaweb::Controller::Relation;

use FindBin;
use lib ("$FindBin::Bin/lib");

use stemmaweb::Test::DB;
my $textids = stemmaweb::Test::DB::new_db("$FindBin::Bin/data");

# Traditions used to test
my $pubrelurl = '/relation/' . $textids->{public}->[2];
my $privrelurl = '/relation/' . $textids->{private}->[2];

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
$attempt = request GET $pubrelurl . "/readings";
ok($attempt->is_success, "Requested reading list for public tradition section");
like( $attempt->header('Content-Type'), qr/application\/json/, "Got a JSON response");
my $rdgs = from_json($attempt->decoded_content);
is(scalar keys %$rdgs, 990, "Found the correct number of readings");

# test GET, POST reading
my @rdgsearch = grep { $_->{rank} == 7 && $_->{text} eq 'uirginem'} values %$rdgs;
my $virginem = shift(@rdgsearch);
ok($virginem, "Found test reading in list");
$attempt = request GET $pubrelurl . "/reading/" . $virginem->{id};
ok($attempt->is_success, "Got reading information");
my $rdgdata = from_json($attempt->decoded_content);
is($rdgdata->{normal_form}, 'uirginem', "Reading information look right");

$attempt = request POST $pubrelurl . "/reading/" . $virginem->{id},
	[id => $virginem->{id}, normal_form => 'wirginem'];
is($attempt->code, 403, "Permission denied trying to change reading");

# test POST compress/merge/duplicate/split (403)

### While logged in:

my $mech = Test::WWW::Mechanize::Catalyst->new( catalyst_app => 'stemmaweb' );
$mech->get_ok( '/login', "Requested the login page successfully" );
$mech->submit_form(
	form_id => 'login_local_form',
	fields => {  username => 'user@example.org', password => 'UserPass' } );
$mech->get_ok( '/' );
$mech->content_contains( 'Hello! user@example.org', "Successfully logged in" );

# test GET private text / next section
$attempt = $mech->get($privrelurl);
ok($attempt->is_success, "Loaded viewer for private tradition");
ok($attempt->previous, "We got here via a redirection");
like($attempt->decoded_content, qr!"full" === "full"!, "Viewer is in editing mode");
# Get the section URL for all remaining requests
$privrelurl = $mech->uri;

$attempt = $mech->follow_link(text => 'section test');
ok($attempt->is_success, "Loaded second section of the text");
my $privsection2 = $attempt->header('content-base');

# test GET, DELETE, POST relationships

$attempt = $mech->get($privrelurl . "/relationships");
ok($attempt->is_success, "Requested relationships on public tradition section");
like($mech->ct, qr/application\/json/, "Got a JSON response");
my $rels = from_json($attempt->decoded_content);
is(scalar @$rels, 13, "Found the correct number of relationships");

$attempt = $mech->delete()

$DB::single = 1;

# test GET, POST reading

# test POST compress

# test POST merge

# test POST duplicate

# test POST split

### Log out and try a few things with known data

# test GET second section (403)

# test GET private relationships (403)

# test GET private reading(s) (403)


done_testing();
