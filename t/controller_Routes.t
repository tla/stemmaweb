#!/usr/bin/env perl
#
# Route inventory and dispatch coverage for the controllers.
#
# The first part of this file pins down the set of public actions belonging to
# the controllers under test, so that a route that appears or disappears is
# noticed.
#
# The second part checks that the whole suite really drove every one of them.
# It needs the action log that script/run_tests.sh produces:
#
#   STEMMAWEB_ACTION_LOG=/tmp/stemmaweb-actions.log prove -l t/controller_*.t
#
# Without that log the coverage check is skipped, because there is nothing to
# read.

use strict;
use warnings;

use FindBin;
use lib ("$FindBin::Bin/lib");

use Test::More;

use stemmaweb::Test::App qw/
  section
  public_actions
  target_controllers
/;

# ---------------------------------------------------------------------------
# The inventory
#
# Controller#action for every public action of the controllers in scope.
# Stemmaweb::Controller::Stexaminer is deliberately absent: it is out of
# commission and is not covered by this suite.
# ---------------------------------------------------------------------------

my @EXPECTED = sort +(
    'stemmaweb::Controller::Relation#compress',
    'stemmaweb::Controller::Relation#copynormal',
    'stemmaweb::Controller::Relation#download',
    'stemmaweb::Controller::Relation#duplicate',
    'stemmaweb::Controller::Relation#emend',
    'stemmaweb::Controller::Relation#emendations',
    'stemmaweb::Controller::Relation#firstsection',
    'stemmaweb::Controller::Relation#get_graph',
    'stemmaweb::Controller::Relation#help',
    'stemmaweb::Controller::Relation#lemmatext',
    'stemmaweb::Controller::Relation#main',
    'stemmaweb::Controller::Relation#merge',
    'stemmaweb::Controller::Relation#metadata',
    'stemmaweb::Controller::Relation#reading',
    'stemmaweb::Controller::Relation#readings',
    'stemmaweb::Controller::Relation#relationships',
    'stemmaweb::Controller::Relation#relationtype',
    'stemmaweb::Controller::Relation#section',
    'stemmaweb::Controller::Relation#split',
    'stemmaweb::Controller::Relation#text',
    'stemmaweb::Controller::Relation#witnesstext',
    'stemmaweb::Controller::Root#about',
    'stemmaweb::Controller::Root#api',
    'stemmaweb::Controller::Root#apiPass',
    'stemmaweb::Controller::Root#default',
    'stemmaweb::Controller::Root#deleteSection',
    'stemmaweb::Controller::Root#deleteTradition',
    'stemmaweb::Controller::Root#directory',
    'stemmaweb::Controller::Root#download',
    'stemmaweb::Controller::Root#help',
    'stemmaweb::Controller::Root#index',
    'stemmaweb::Controller::Root#newsection',
    'stemmaweb::Controller::Root#newtradition',
    'stemmaweb::Controller::Root#orderafter',
    'stemmaweb::Controller::Root#sectioninfo',
    'stemmaweb::Controller::Root#textinfo',
    'stemmaweb::Controller::Root#variantgraph',
    'stemmaweb::Controller::Stemma#delete',
    'stemmaweb::Controller::Stemma#dot',
    'stemmaweb::Controller::Stemma#index',
    'stemmaweb::Controller::Stemma#reroot',
    'stemmaweb::Controller::Stemweb#available',
    'stemmaweb::Controller::Stemweb#query',
    'stemmaweb::Controller::Stemweb#request',
    'stemmaweb::Controller::Stemweb#result',
    'stemmaweb::Controller::Users#authenticated',
    'stemmaweb::Controller::Users#base',
    'stemmaweb::Controller::Users#captcha_check',
    'stemmaweb::Controller::Users#captcha_get',
    'stemmaweb::Controller::Users#change_password',
    'stemmaweb::Controller::Users#forgot_password',
    'stemmaweb::Controller::Users#get',
    'stemmaweb::Controller::Users#index',
    'stemmaweb::Controller::Users#login',
    'stemmaweb::Controller::Users#logout',
    'stemmaweb::Controller::Users#register',
    'stemmaweb::Controller::Users#reset_password',
    'stemmaweb::Controller::Users#success',
);

# Actions that the suite cannot reach at all, with the reason.
#
# * change_password is behind the `get` capture action, which asks the
#   authentication store for a user by an "id" field that the store cannot
#   resolve; the chain croaks before change_password is ever matched.
# * authenticated is contributed by CatalystX::Controller::Auth but nothing
#   chains from it.
my %UNREACHABLE = (
    'stemmaweb::Controller::Users#change_password' => 'the users/get chain action always croaks',
    'stemmaweb::Controller::Users#authenticated'   => 'no action is chained from it',
);

my @actions = public_actions();

section('route inventory');

is_deeply(
    [ sort map { $_->{class} . '#' . $_->{name} } @actions ],
    \@EXPECTED,
    'The controller route inventory is what we expect',
) or diag( 'Actual: ' . join( "\n         ", sort map { $_->{class} . '#' . $_->{name} } @actions ) );

{
    my %by_controller;
    push( @{ $by_controller{ $_->{class} } }, $_->{name} ) for @actions;
    # The five controllers that answer URLs; Util is a toolbox, not a
    # controller, which the next check makes explicit.
    is( scalar keys %by_controller, scalar( target_controllers() ) - 1,
        'Every URL-answering controller contributes at least one action' );
    ok( !exists $by_controller{'stemmaweb::Controller::Stexaminer'},
        'Stexaminer is out of scope' );
    ok( !( grep { $_->{class} eq 'stemmaweb::Controller::Util' } @actions ),
        'Util contributes no actions' );
}

{
    my @without_route = grep { !$_->{reverse} } @actions;
    is_deeply( \@without_route, [],
        'Every action in the inventory answers a route' );
}

# ---------------------------------------------------------------------------
# Dispatch coverage
# ---------------------------------------------------------------------------

section('dispatch coverage');

my $log = $ENV{STEMMAWEB_ACTION_LOG};
if ( !$log || !-s $log ) {
    SKIP: {
        skip 'set STEMMAWEB_ACTION_LOG and run the controller tests first', 3;
    }
}
else {
    open( my $fh, '<', $log ) or die "Could not read $log: $!";
    my %hit;
    while ( my $line = <$fh> ) {
        chomp $line;
        my ( $class, $reverse ) = split /\t/, $line;
        next unless defined $class && defined $reverse;
        $hit{"$class#$reverse"} = 1;
    }
    close $fh;

    # The log records the action's reverse path, so compare on that.
    my %reverse_of;
    my %wanted;
    for my $action (@actions) {
        my $key = $action->{class} . '#' . $action->{name};
        $reverse_of{$key} = $action->{class} . '#' . $action->{reverse};
        next if $UNREACHABLE{$key};
        $wanted{ $reverse_of{$key} } = 1;
    }

    my @missing = sort grep { !$hit{$_} } keys %wanted;
    is_deeply( \@missing, [],
        'Every reachable controller action was dispatched while the suite ran' )
      or diag( 'Never dispatched: ' . join( "\n                   ", @missing ) );

    my @unreachable_hit =
      sort grep { $hit{ $reverse_of{$_} } } keys %UNREACHABLE;
    is_deeply( \@unreachable_hit, [],
        'The actions recorded as unreachable were not dispatched either' )
      or diag( 'Unexpectedly dispatched: ' . join( ', ', @unreachable_hit ) );

    diag( 'Distinct actions dispatched during the run: ' . scalar( keys %hit ) );
}

done_testing();
