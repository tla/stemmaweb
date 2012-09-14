#!/usr/bin/env perl
use strict;
use warnings;
use File::Temp;
use HTTP::Request::Common;
use JSON qw/ decode_json /;
use Test::More;
use Test::WWW::Mechanize::Catalyst;
use Text::Tradition::Directory;

use Catalyst::Test 'stemmaweb';

use vars qw( $orig_db $was_link );
my $textids;
my $dbfile = 'db/traditions.db';
( $orig_db, $was_link, $textids ) = _make_testing_database();

## Tests that do not require being logged in
# Test /directory
my $publicdir = request('/directory');
ok( $publicdir->is_success, 'Got the text directory' );
my $listing = $publicdir->decoded_content;
like( $listing, qr/Public texts/, "Got directory listing HTML" );
unlike( $listing, qr/User texts/, "Got no user texts when we are not logged in" );
my @listinglines = grep { $_ =~ /traditionname/ } split( /\n/, $listing );
is( scalar @listinglines, 1, "Got a single listing in the directory" );

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
my $pubinfourl = '/textinfo/' . $textids->{public};
is( request( '/textinfo/' . $textids->{private} )->code, 403,
	'Denied information listing for private text' );
my $infoget = request( $pubinfourl );
ok( $infoget->is_success, 'Got information listing for public text' );
my $pubtextinfo = decode_json( $infoget->content );
is( $pubtextinfo->{textid}, $textids->{public}, 
	'Information listing has correct text ID' );
my $infopost = request POST $pubinfourl, [ name => 'Changed name' ];
is( $infopost->code, 403, "Permission denied on POST to public text" );
	
# Test /stemma GET, POST/0, POST/n
my $dnestemma = request( '/stemma/doesnotexist' );
is( $dnestemma->code, 404, "Returned 404 on nonexistent text" );
TODO: {
	local $TODO = "Need to investigate";
	like( $dnestemma->header('Content-Type'), qr/application\/json/,
		"Returned JSON answer for newtradition" );
}
is( request( '/stemma/' . $textids->{private} . '/2' )->code, 403, 
	"Permission denied to view stemma on private tradition" );
my $pubstemurl = '/stemma/' . $textids->{public};
my $psreq = request( "$pubstemurl/0" );
ok( $psreq->is_success, "Got OK even on nonexistent stemma" );
like( $psreq->header('Content-Type'), qr/xml/,
	"Returned SVG answer for stemma by default" );
is( $psreq->content, '', "Got empty svg for nonexistent stemma" );
my $pspost = request POST "$pubstemurl/n", [
	dot => 'digraph stemma { A -> B; A -> C }'];
is( $pspost->code, 403, "Permission denied trying to create new stemma" );

### Now we need a user login
my $mech = Test::WWW::Mechanize::Catalyst->new( catalyst_app => 'stemmaweb' );
$mech->get_ok( '/login', "Requested the login page successfully" );
$mech->submit_form(
	form_id => 'login_local_form',
	fields => {  username => 'swtest', password => 'swtestpass' } );
$mech->get_ok( '/' );
$mech->content_contains( 'Hello! swtest', "Successfully logged in" );
$mech->get_ok( '/directory', "Loaded the directory page as local user" );
$mech->content_contains( 'User texts', "Directory page has our own text" );


# Test /stemmadot GET/0

done_testing();


sub _make_testing_database {
	my $fh = File::Temp->new();
	my $file = $fh->filename;
	$fh->unlink_on_destroy( 0 );
	$fh->close;
	my $dsn = 'dbi:SQLite:dbname=' . $file;
	my $dir = Text::Tradition::Directory->new( 'dsn' => $dsn,
		'extra_args' => { 'create' => 1 } );
	my $scope = $dir->new_scope;
	
	my $textids = {};
	# Create a (public) tradition
	my $pubtrad = Text::Tradition->new( input => 'Self', file => 't/data/john.xml' );
	$pubtrad->public( 1 );
	$textids->{'public'} = $dir->store( $pubtrad );
		
	# Create a user
	my $adminobj = $dir->add_user( { username => 'stadmin', password => 'stadminpass', role => 'admin' } );
	my $userobj = $dir->add_user( { username => 'swtest', password => 'swtestpass' } );
	# Create a tradition for the normal user
	my $privtrad = Text::Tradition->new( input => 'Tabular', sep_char => ',',
		file => 't/data/florilegium.csv' );
	$userobj->add_tradition( $privtrad );
	$privtrad->add_stemma( dotfile => 't/data/florilegium.dot' );
	$textids->{'private'} = $dir->store( $privtrad );
	$dir->store( $userobj );
	
	## Now replace the existing traditions database with the test one
	my( $orig, $was_link );
	if( -l $dbfile ) {
		$was_link = 1;
		$orig = readlink( $dbfile );
		unlink( $dbfile ) or die "Could not replace database file $dbfile";
	} elsif( -e $dbfile ) {
		my $suffix = '.backup.' . time();
		$orig = $dbfile.$suffix;
		rename( $dbfile, $orig ) or die "Could not move database file $dbfile";
	}
	symlink( $file, $dbfile );
	return( $orig, $was_link, $textids );
}

END {
	# Restore the original database
	unlink( readlink( $dbfile ) );
	unlink( $dbfile );
	if( $was_link ) {
		symlink( $orig_db, $dbfile );
	} elsif( $orig_db ) {
		rename( $orig_db, $dbfile );
	}
}
