#!/usr/bin/env perl
use strict;
use warnings;
use HTTP::Request::Common;
use JSON qw/ decode_json /;
use Test::More;
use Test::WWW::Mechanize::Catalyst;

use Catalyst::Test 'stemmaweb';

use FindBin;
use lib ("$FindBin::Bin/lib");

use stemmaweb::Test::DB;
my $textids = stemmaweb::Test::DB::new_db("$FindBin::Bin/data");

## Tests that do not require being logged in
# Test /directory
my $publicdir = request('/directory');
ok( $publicdir->is_success, 'Got the text directory' );
my $listing = $publicdir->decoded_content;
like( $listing, qr/Public texts/, "Got directory listing HTML" );
unlike( $listing, qr/User texts/, "Got no user texts when we are not logged in" );
my @listinglines = grep { $_ =~ /traditionname/ } split( /\n/, $listing );
is( scalar @listinglines, 3, "Got three listings in the directory" );

# Test /newtradition POST
my $newtradpost = request POST '/newtradition',
	'Content-Type' => 'form-data',
	'Content' => [
		name => 'new tradition',
		file => [ 't/data/besoin.xml' ]
	];
like( $newtradpost->header('Content-Type'), qr/application\/json/,
	"Returned JSON answer for newtradition" );
is( $newtradpost->code, 403, "Permission denied trying to upload new tradition" );

# Test /textinfo GET, POST
my $dneinfo = request( '/textinfo/doesnotexist' );
is( $dneinfo->code, 404, "Returned 404 on nonexistent text" );
like( $dneinfo->header('Content-Type'), qr/application\/json/,
	"Returned JSON answer for nonexistent textinfo" );
is( request( '/textinfo/' . $textids->{private}->[0] )->code, 403,
	'Denied information listing for private text' );
my $pubinfourl = '/textinfo/' . $textids->{public}->[0];
my $infoget = request( $pubinfourl );
ok( $infoget->is_success, 'Got information listing for public text' );
my $pubtextinfo = decode_json( $infoget->content );
is( $pubtextinfo->{id}, $textids->{public}->[0], 
	'Information listing has correct text ID' );
my $infopost = request POST $pubinfourl, [ name => 'Changed name' ];
is( $infopost->code, 403, "Permission denied on POST to public text" );

# Test /variantgraph GET

# Test /download GET
	

### Now we need a user login
my $mech = Test::WWW::Mechanize::Catalyst->new( catalyst_app => 'stemmaweb' );
$mech->get_ok( '/login', "Requested the login page successfully" );
$mech->submit_form(
	form_id => 'login_local_form',
	fields => {  username => 'user@example.org', password => 'UserPass' } );
$mech->get_ok( '/' );
$mech->content_contains( 'Hello! user@example.org', "Successfully logged in" );
$mech->get_ok( '/directory', "Loaded the directory page as local user" );
$mech->content_contains( 'User texts', "Directory page has our own text" );

# Test /newtradition POST

# Test /textinfo POST

# Test /delete POST

done_testing();
