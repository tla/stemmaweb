#!/usr/bin/env perl
use strict;
use warnings;
use File::Temp;
use Test::More;
use Text::Tradition::Directory;

use Catalyst::Test 'stemmaweb';

use vars qw( $orig_db, $was_link );
my $textids;
my $dbfile = 'db/traditions.db';
( $orig_db, $was_link, $textids ) = _make_testing_database();

ok( request('/')->is_success, 'Got root HTML' );
ok( request('/directory')->is_success, 'Got the text directory' );
ok( request('/text/' . $textids->{'public'} . '/info')->is_success,
	'Got information listing for public text' );
is( request('/text/' . $textids->{'public'} . '/info')->code, 403,
	'Denied information listing for public text' );


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
	$textids->{'public'} = $dir->store( $pubtrad );
		
	# Create a user
	my $userobj = $dir->add_user( { username => 'swtest', password => 'swtestpass' } );
	# Create a tradition for the user
	my $privtrad = Text::Tradition->new( input => 'Tabular', sep_char => ','
		file => 't/data/florilegium.csv', user => $userobj );
	$privtrad->add_stemma( dotfile => 't/data/florilegium.dot' );
	$textids->{'private'} = $dir->store( $privtrad );
	
	## Now replace the existing traditions database with the test one
	my( $orig, $was_link );
	if( -l $dbfile ) {
		$was_link = 1;
		$orig = readlink( $dbfile );
		unlink( $dbfile ) or die "Could not replace database file $dbfile";
	} else {
		my $suffix = '.backup.' . time();
		$orig = $dbfile.$suffix;
		rename( $dbfile, $orig ) or die "Could not move database file $dbfile";
	}
	link( $file, $dbfile );
	return( $orig, $was_link, $textids );
}

END {
	# Restore the original database
	unlink( readlink( $dbfile ) );
	unlink( $dbfile );
	if( $was_link ) {
		link( $orig_db, $dbfile );
	} else {
		rename( $orig_db, $dbfile );
	}
}
