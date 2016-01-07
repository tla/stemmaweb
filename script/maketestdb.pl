#!/usr/bin/env perl

use strict;
use warnings;
use feature 'say';
use Text::Tradition;
use Text::Tradition::Directory;

my $DBDIR = 'db';
my $DBNAME = 'traditions.db';
my $DBEXT = 'test';
# Make the directory on the filesystem if necessary
unless( -d $DBDIR ) {
	mkdir $DBDIR
		or die "Could not make database director $DBDIR";
	say "Created directory for test database";
}
# Delete the old db if it exists
if( -f "$DBDIR/$DBNAME.$DBEXT" ) {
	unlink( "$DBDIR/$DBNAME.$DBEXT" );
}
if( -l "$DBDIR/$DBNAME" ) {
	unlink( "$DBDIR/$DBNAME" );
} elsif( -e "$DBDIR/$DBNAME" ) {
	unlink( "$DBDIR/$DBNAME.bak" ) if -f "$DBDIR/$DBNAME.bak";
	rename( "$DBDIR/$DBNAME", "$DBDIR/$DBNAME.bak" ) 
		or die "Could not rename existing $DBNAME";
} 
# Set up the test directory
symlink( "$DBNAME.$DBEXT", "$DBDIR/$DBNAME" ) or die "Could not set up testing db symlink";

my $dir = Text::Tradition::Directory->new(
	dsn => "dbi:SQLite:dbname=$DBDIR/$DBNAME",
	extra_args => { create => 1 } 
	);
my $scope = $dir->new_scope();
say "Created test database";

# Create users
my $user = $dir->add_user({ username => 'user@example.org', password => 'UserPass' });
my $admin = $dir->add_user({ username => 'admin@example.org', 
	password => 'AdminPass', role => 'admin' });
my $openid_user = $dir->create_user({
        url      => 'https://www.google.com/accounts/o8/id?id=AItOawlFTlpuHGcI67tqahtw7xOod9VNWffB-Qg',
        extensions => {'http://openid.net/srv/ax/1.0' => { 'value.email' =>'openid@example.org' } },
    });
die "Failed to create test users" unless $user && $admin && $openid_user;
say "Created users";

exit if @ARGV && $ARGV[0] =~ /-u/;

my $t1 = Text::Tradition->new( input => 'Self', file => 't/data/besoin.xml' );
die "Failed to create test tradition #1" unless $t1;
$t1->add_stemma( dotfile => 't/data/besoin_stemweb.dot' );
$user->add_tradition( $t1 );
my $t1b = Text::Tradition->new( input => 'Self', file => 't/data/besoin.xml' );
$t1b->add_stemma( dotfile => 't/data/besoin_stemweb.dot' );
$openid_user->add_tradition($t1b);
$dir->store( $user );
$dir->store( $openid_user );
say "Created test user tradition";

my $t2 = Text::Tradition->new( input => 'Tabular', sep_char => ',', 
	file => 't/data/florilegium.csv', language => 'Greek' );
$t2->add_stemma( dotfile => 't/data/florilegium.dot' );
die "Failed to create test tradition #2" unless $t2;
$t2->public( 1 );
$dir->store( $t2 );
my $t3 = Text::Tradition->new( input => 'Self', file => 't/data/john.xml', language => 'Greek' );
$t3->collation->change_direction('BI');
$t3->public( 1 );
$t3->name( 'John verse' );
$user->add_tradition( $t3 );
$dir->store( $t3 );
my $t4 = Text::Tradition->new( input => 'Self', file => 't/data/collatecorr.xml' );
$t4->public( 1 );
$user->add_tradition( $t4 );
$dir->store( $t4 );
my $t5 = Text::Tradition->new( input => 'Tabular', file => 't/data/arabic_snippet.csv', sep_char => ',', direction => 'RL', name => 'RTL test', language => 'Arabic' );
$user->add_tradition( $t5 );
$dir->store( $t5 );
$dir->store( $user );

say "Created test public traditions";

