#!/usr/bin/env perl

use strict;
use warnings;
use feature 'say';
use HTTP::Request::Common;
use JSON qw/ decode_json /;
use Test::More skip_all => "Stemweb is currently out of commission";
use Test::WWW::Mechanize::Catalyst;
use Text::Tradition::Directory;

use Catalyst::Test 'stemmaweb';
use LWP::UserAgent;

eval { no warnings; $DB::deep = 1000; };

# Set up the test data
use vars qw( $orig_db $was_link );
my $textids;
my $dbfile = 'db/traditions.db';
( $orig_db, $was_link, $textids ) = _make_testing_database();

# Here is the test data we will use
my $answer = '{"status": 0, "job_id": "4", "algorithm": "RHM", "format": "newick", "start_time": "2013-10-26 10:44:14.050263", "result": "((((((((((((F,U),V),S),T1),T2),A),J),B),L),D),M),C);\n", "end_time": "2013-10-26 10:45:55.398944"}';

# First try without a job ID in the database anywhere
my $unclaimed_request = request POST '/stemweb/result',
    'Content-Type' => 'application/json',
    'Content' => $answer;
like( $unclaimed_request->header('Content-Type'), qr/application\/json/,
    "Returned JSON answer for unclaimed request" );
is( $unclaimed_request->code, 400, "No tradition found with given job ID" );
like( $unclaimed_request->content, qr/No tradition found with Stemweb job ID/,
    "Correct error message returned" );

# Now add the relevant job ID to two traditions and test for that error
{
    my $dsn = "dbi:SQLite:dbname=$dbfile";
    my $dir = Text::Tradition::Directory->new( 'dsn' => $dsn );
    my $scope = $dir->new_scope();
    my $t1 = $dir->lookup( $textids->{'public'} );
    $t1->set_stemweb_jobid( '4' );
    $dir->save( $t1 );
    my $t2 = $dir->lookup( $textids->{'private'} );
    $t2->set_stemweb_jobid( '4' );
    $dir->save( $t2 );
}
# Now try with the job ID in more than one place in the database
my $oversubscribed_request = request POST '/stemweb/result',
    'Content-Type' => 'application/json',
    'Content' => $answer;
like( $oversubscribed_request->header('Content-Type'), qr/application\/json/,
    "Returned JSON answer for oversubscribed request" );
is( $oversubscribed_request->code, 500, "Multiple traditions found with given job ID" );
like( $oversubscribed_request->content, qr/Multiple traditions with Stemweb job ID/,
    "Correct error message returned" );

# Finally, try with the job ID on only one tradition.
{
    my $dsn = "dbi:SQLite:dbname=$dbfile";
    my $dir = Text::Tradition::Directory->new( 'dsn' => $dsn );
    my $scope = $dir->new_scope();
    my $t2 = $dir->lookup( $textids->{'private'} );
    $t2->_clear_stemweb_jobid;
    $dir->save( $t2 );
}
my $expected_request = request POST '/stemweb/result',
    'Content-Type' => 'application/json',
    'Content' => $answer;
like( $expected_request->header('Content-Type'), qr/application\/json/,
    "Returned JSON answer for expected request" );
is( $expected_request->code, 200, "Request processed successfully" );
like( $expected_request->content, qr/success/,
    "Correct success message returned" );

# Now check that the tradition in question actually has a stemma!
my $stemma_request = request('/stemmadot/' . $textids->{'public'} . '/0' );
like( $stemma_request->header('Content-Type'), qr/application\/json/,
    "Returned JSON answer for stemma request" );
my $new_stemma = decode_json( $stemma_request->content );
# It will be undirected.
like( $new_stemma->{dot}, qr/^graph .RHM 1382777054_0/,
    "Found an undirected stemma DOT file where we expected" );

# And check that the job ID was in fact removed.
my $duplicate_request = request POST '/stemweb/result',
    'Content-Type' => 'application/json',
    'Content' => $answer;
like( $duplicate_request->header('Content-Type'), qr/application\/json/,
    "Returned JSON answer for duplicate request" );
like( $duplicate_request->content, qr/No tradition found with Stemweb job ID/,
    "Job ID was removed from relevant tradition" );

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
    my $pubtrad = Text::Tradition->new( input => 'Self', file => 't/data/besoin.xml' );
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
