package stemmaweb::Test::DB;

use warnings;
use strict;

use FindBin;

sub new_db {
    my $DBDIR = "$FindBin::Bin/db";
    my $DBNAME = 'traditions.db';
    my $DBEXT = 'test';

    # Make the directory on the filesystem if necessary
    unless( -d $DBDIR ) {
        mkdir $DBDIR
            or die "Could not make database director $DBDIR";
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

    # Create users
    my $user = $dir->add_user({ username => 'user@example.org', password => 'UserPass' });


    my $t2 = Text::Tradition->new( input => 'Tabular', sep_char => ',', 
    file => 't/data/florilegium.csv' );
    $t2->add_stemma( dotfile => 't/data/florilegium.dot' );

    $user->add_tradition($t2);
}

1;
