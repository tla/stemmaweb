#!/usr/bin/env perl

use feature 'say';
use strict;
use warnings;
use utf8;
use Text::Tradition::Directory;
use Text::Tradition::Collation::Reading;
use TryCatch;

binmode STDOUT, ':utf8';
binmode STDERR, ':utf8';
eval { no warnings; binmode $DB::OUT, ':utf8'; $DB::deep = 1000 };

my $dir = Text::Tradition::Directory->new(
    'dsn' => 'dbi:SQLite:dbname=db/traditions.db'
    );

my $scope = $dir->new_scope();
my $lookfor = $ARGV[0] || '';

my @trads;
foreach my $tinfo ( $dir->traditionlist() ) {
    next unless $tinfo->{'name'} =~ /$lookfor/ || $tinfo->{'id'} eq $lookfor;
    say "Found tradition " . $tinfo->{'name'};
    # Make the changes
    my $tradition = $dir->lookup( $tinfo->{'id'} );
    my $c = $tradition->collation;
    say( "Continue to save, quit to discard" );
    $DB::single = 1;
    $dir->store( $tradition );
}

sub split_reading {
	my( $c, $r, $pre, $main, $post, @join ) = @_;
	unless( ref($r) ) {
		$r = $c->reading( $r );
	}   
    $r->alter_text( $main );
    if( grep { $_ eq 'jmain' } @join ) {
    	$r->_set_join_prior(1);
    } elsif( grep { $_ eq 'mainj' } @join ) {
    	$r->_set_join_next(1);
    }
    my( $rf, $rl );
    my @rwits = $c->reading_witnesses( $r );

    if( $pre ) {
    	my $jn = grep { $_ eq 'pre' } @join;
        $rf = $c->add_reading( { 'id' => $r->id . 'f',
                                 'text' => $pre,
                                 'join_next' => $jn,
                                 'is_common' => $r->is_common } );
        # All incoming edges to $r get reassigned to $rf
        foreach my $e ( $c->sequence->edges_to( $r->id ) ) {
            my $from = $e->[0];
            my $attrs = $c->sequence->get_edge_attributes( $from, $r->id );
            $c->sequence->delete_edge( $from, $r->id );
            $c->sequence->add_edge( $from, $rf->id );
            $c->sequence->set_edge_attributes( $from, $rf->id, $attrs );
        }
    }
    
    if( $post ) {
    	my $jp = grep { $_ eq 'post' } @join;
        $rl = $c->add_reading( { 'id' => $r->id . 'l',
                                 'text' => $post,
                                 'join_prior' => $jp,
                                 'is_common' => $r->is_common } );
        # All outgoing edges from $r get reassigned to $rl
        foreach my $e ( $c->sequence->edges_from( $r->id ) ) {
            my $to = $e->[1];
            my $attrs = $c->sequence->get_edge_attributes( $r->id, $to );
            $c->sequence->delete_edge( $r->id, $to );
            $c->sequence->add_edge( $rl->id, $to );
            $c->sequence->set_edge_attributes( $rl->id, $to, $attrs );
        }
    }
    
    # All reading witnesses for $r get linked as edges to $rn
    foreach my $wit ( @rwits ) {
        $c->add_path( $rf->id, $r->id, $wit ) if $rf;
        $c->add_path( $r->id, $rl->id, $wit ) if $rl;
    }
    # Recalculate the equivalence graph from scratch
    $c->relations->rebuild_equivalence();
}
