#!/usr/bin/env perl
#
# Tests for stemmaweb::Model::Analysis, using a stand-in for the Stexaminer
# service and a small hand-made alignment in the shape that Stemmarest serves
# at /tradition/$id/section/$id/json.

use strict;
use warnings;
use utf8;
use Test::More;

use stemmaweb::Model::Stemma;

BEGIN { use_ok('stemmaweb::Model::Analysis', qw/ run_analysis /) }

my $stemma = stemmaweb::Model::Stemma->new(dot => <<'DOT');
digraph "test" {
    "α" [class=hypothetical];
    A [class=extant]; B [class=extant]; C [class=extant]; D [class=extant];
    "α" -> A; "α" -> B; "α" -> C; "α" -> D;
}
DOT
is(scalar $stemma->witnesses, 4, 'Test stemma has four witnesses');

# Readings are plain hashes in the alignment; make them compactly.
my %R;
sub rdg {
    my ($id, $rank, $text, @wits) = @_;
    return $R{$id} ||= { id => $id, rank => $rank, text => $text, witnesses => \@wits };
}
my $lac = { id => 'lac', rank => 4, text => '#LACUNA#', is_lacuna => 1 };

#  rank  A       B       C       D       D (a.c.)  X (not in stemma)
#  1     the     the     the     the     the       the
#  2     cat     cat     dog     dog     dog       cat
#  3     sat     (gap)   sat     sat     sit       sat
#  4     down    down    LACUNA  up      up        down
#  5     Dog     dog     Dog     dog     dog       dog   (spelling relation)
my %tok = (
    A => [ rdg(1, 1, 'the'), rdg(2, 2, 'cat'), rdg(3, 3, 'sat'), rdg(4, 4, 'down'), rdg(5, 5, 'Dog') ],
    B => [ rdg(1, 1, 'the'), rdg(2, 2, 'cat'), undef,            rdg(4, 4, 'down'), rdg(6, 5, 'dog') ],
    C => [ rdg(1, 1, 'the'), rdg(7, 2, 'dog'), rdg(3, 3, 'sat'), $lac,              rdg(5, 5, 'Dog') ],
    D => [ rdg(1, 1, 'the'), rdg(7, 2, 'dog'), rdg(3, 3, 'sat'), rdg(8, 4, 'up'),   rdg(6, 5, 'dog') ],
    'D.ac' => [ rdg(1, 1, 'the'), rdg(7, 2, 'dog'), rdg(9, 3, 'sit'), rdg(8, 4, 'up'), rdg(6, 5, 'dog') ],
    X => [ rdg(1, 1, 'the'), rdg(2, 2, 'cat'), rdg(3, 3, 'sat'), rdg(4, 4, 'down'), rdg(6, 5, 'dog') ],
);
my $alignment = {
    length    => 5,
    alignment => [
        { witness => 'A', tokens => $tok{A} },
        { witness => 'B', tokens => $tok{B} },
        { witness => 'C', tokens => $tok{C} },
        { witness => 'D', tokens => $tok{D} },
        { witness => 'D', layer => 'a.c.', tokens => $tok{'D.ac'} },
        { witness => 'X', tokens => $tok{X} },
    ],
};
my $relations = [
    { source => 5, target => 6, type => 'spelling', annotation => '', non_independent => JSON::false, is_significant => 'no' },
    { source => 3, target => 9, type => 'collated' },
];
my $section = { id => 1, name => 'S', alignment => $alignment, relations => $relations };

# A stand-in for the Stexaminer: everything is genealogical, the first witness
# of each group is its source, and the stemma's hypothetical node joins the
# first group.
my @calls;
my $solver = sub {
    my ($command, $dot, $groupings) = @_;
    push(@calls, { command => $command, dot => $dot, groupings => $groupings });
    if ($command eq 'findGroupings') {
        return [ map { [ [ @$_ ], JSON::true ] } @$groupings ];
    }
    return [ map {
        my @groups = map { [@$_] } @$_;
        push(@{ $groups[0] }, 'α');
        [ \@groups, { source => [ map { $_->[0] } @$_ ], copy => [ map { @{$_}[1 .. $#$_] } @$_ ] } ]
    } @$groupings ];
};

# ---------------------------------------------------------------------------
# Grouping the alignment
# ---------------------------------------------------------------------------

my $t = run_analysis($stemma, [$section], solver => $solver, max_parallel => 1);
ok(!$t->{error}, 'No error from the analysis') or diag($t->{error});

# Rank 1 has no variation. Rank 3 (A,C,D vs B gap vs D a.c.) is the only place
# where a.c. matters, and ranks 2, 4 and 5 vary.
is_deeply([ map { $_->{id} } @{ $t->{variants} } ], [ 2, 3, 4, 5 ],
    'Only the ranks with variation are analyzed');
is($t->{variant_count}, 4, 'Variant count matches');

# Two problems: one with the D a.c. layer in the graph and one without.
my %by_graph;
push(@{ $by_graph{ $_->{command} }->{ $_->{dot} } }, @{ $_->{groupings} }) for @calls;
is(scalar keys %{ $by_graph{findGroupings} }, 2, 'Locations with and without the a.c. layer get their own graph');
is(scalar @calls, 4, 'Each problem is asked both findGroupings and findClasses');
my ($withac) = grep { $_ =~ /\bw2\b/ } keys %{ $by_graph{findGroupings} };
ok($withac, 'The a.c. witness has a plain name in the graph sent to the service');
unlike($withac, qr/class=|α|\(a\.c\.\)/, 'The graph sent is stripped to ASCII names and edges');
is_deeply($by_graph{findGroupings}->{$withac}, [ [ [ 'A', 'C', 'D' ], ['B'], ['w1'] ] ],
    'The a.c. location has D and D a.c. in different groups, and a gap group')
  or diag(explain($by_graph{findGroupings}));

my %loc = map { $_->{id} => $_ } @{ $t->{variants} };

is_deeply([ map { $_->{group} } @{ $loc{2}->{readings} } ], [ [ 'A', 'B' ], [ 'C', 'D' ] ],
    'Rank 2 groups; the hypothetical the stand-in service added to one group is dropped again')
  or diag(explain($loc{2}));
is_deeply([ sort @{ $loc{2}->{missing} } ], [ 'α' ], 'Hypotheticals are recorded as missing');

# Rank 4: C is in a lacuna so it is missing, and X is not in the stemma
is_deeply([ sort @{ $loc{4}->{missing} } ], [ 'C', 'α' ], 'Lacunose witnesses are missing at their rank');
is_deeply([ map { $_->{group} } @{ $loc{4}->{readings} } ], [ [ 'A', 'B' ], ['D'] ],
    'Rank 4 groups leave out the lacuna and the witness that is not in the stemma');
is($loc{4}->{readings}->[0]->{text}, 'down', 'Reading text is carried through');

# Rank 3: the a.c. layer is only listed where it differs from its main text
is_deeply([ map { $_->{group} } @{ $loc{3}->{readings} } ],
    [ [ 'A', 'C', 'D' ], ['B'], ['D (a.c.)'] ],
    'Rank 3 groups, with a.c. witness and omission group');
is_deeply($loc{3}->{layerwits}, ['D'], 'Layered witnesses are noted');
is($loc{3}->{readings}->[1]->{text}, '(omitted)', 'Omission group text');
ok(exists $loc{3}->{readings}->[0]->{followed}, 'Reading statistics were worked out');
ok(!exists $loc{4}->{layerwits}, 'Layer notes are only present where there is a layer');

# ---------------------------------------------------------------------------
# Options
# ---------------------------------------------------------------------------

# A location where only one leaf witness has its own reading is type-1 variation.
{
    my @same = map { rdg(20, 1, 'cat') } 1 .. 3;
    my $type1 = { id => 3, name => 'U', relations => [], alignment => { length => 1, alignment => [
        { witness => 'A', tokens => [ rdg(21, 1, 'cut') ] },
        { witness => 'B', tokens => [ $same[0] ] },
        { witness => 'C', tokens => [ $same[1] ] },
        { witness => 'D', tokens => [ $same[2] ] },
    ] } };
    my $all  = run_analysis($stemma, [$type1], solver => $solver, max_parallel => 1);
    my $some = run_analysis($stemma, [$type1], solver => $solver, max_parallel => 1, exclude_type1 => 1);
    is($all->{variant_count}, 1, 'Type-1 variation is analyzed by default');
    is($some->{variant_count}, 0, 'Type-1 variation is left out when asked');
}

# ---------------------------------------------------------------------------
# Talking to the service
# ---------------------------------------------------------------------------

# Batching: ask for two locations at a time.
@calls = ();
$t = run_analysis($stemma, [$section], solver => $solver, max_parallel => 1, max_batch => 1);
is(scalar @calls, 8, 'One request per location and command with a batch size of one');
is($t->{variant_count}, 4, 'The same locations came out');

# The same answers should come out when the requests run in other processes.
my $par = run_analysis($stemma, [$section], solver => $solver, max_parallel => 3, max_batch => 1);
is_deeply($par, $t, 'Requests made in parallel give the same analysis');

# ---------------------------------------------------------------------------
# Calculations that are still running
# ---------------------------------------------------------------------------

# Nothing has finished: the locations are listed, unsolved but not in error.
$t = run_analysis($stemma, [$section], solver => sub { { pending => 1 } }, max_parallel => 1);
ok(!$t->{error}, 'A calculation that is still running is not an error');
is($t->{incomplete}, 4, 'All the locations are incomplete');
is($t->{genealogical_count}, 0, 'and none are counted as genealogical');
is_deeply([ map { $_->{unsolved} } @{ $t->{variants} } ], [ ('pending') x 4 ],
    'The locations are marked as pending');
is_deeply([ map { $_->{group} } @{ $t->{variants}->[0]->{readings} } ], [ [ 'A', 'B' ], [ 'C', 'D' ] ],
    'and keep their groups');

# One slow batch among quick ones: only its locations are incomplete
{
    my $slow_one = sub {
        my ($command, $dot, $groupings) = @_;
        return { pending => 1 } if grep { @$_ == 3 } @$groupings;    # the location with the omission
        return $solver->(@_);
    };
    $t = run_analysis($stemma, [$section], solver => $slow_one, max_parallel => 1, max_batch => 1);
    ok(!$t->{error}, 'No error with one slow location');
    is($t->{incomplete}, 1, 'Only the slow location is incomplete');
    is_deeply([ map { $_->{id} } grep { $_->{unsolved} } @{ $t->{variants} } ], [3],
        'and it is the right one');
    is($t->{genealogical_count}, 3, 'The rest are analyzed as usual');
}

# The client for the service, against a stand-in for it
{
    require LWP::Protocol::PSGI;

    # mode: 'quick' answers at once; 'slow' needs $polls status checks before it
    # is finished; 'fail' is a job that ends in failure.
    my ($mode, $polls, %job, $next, $posts) = ('quick', 3, (), 0, 0);
    my $reply = sub { [ $_[0], [ 'Content-Type' => 'application/json' ], [ JSON::encode_json($_[1]) ] ] };
    LWP::Protocol::PSGI->register(sub {
        my $env = shift;
        if ($env->{PATH_INFO} eq '/calc-items/') {
            $posts++;
            my $id = ++$next;
            return $reply->(201, { jobid => $id, result => [ ['quick'] ], result_source => 'algorithm' })
                if $mode eq 'quick';
            $job{$id} = { polls_left => $polls, fail => $mode eq 'fail' };
            return $reply->(201, { 'Feedback ' => "The calculation is ongoing, please request the result/status later via the jobid $id" });
        }
        if ($env->{PATH_INFO} =~ m!^/jobstatus/(\d+)/$!) {
            my $this = $job{$1} or return [ 400, [], ["There was no calculation with id $1"] ];
            return $reply->(200, { jobid => $1, status => 2, result => 'idp fell over' }) if $this->{fail};
            return $reply->(200, { jobid => $1, status => 1, result => 'The calculation is ongoing' })
                if $this->{polls_left}-- > 0;
            return $reply->(200, { jobid => $1, status => 0, result => [ ['slow'] ] });
        }
        return [ 404, [], ['nope'] ];
    }, host => 'stex.test');

    my @request = ('findGroupings', 'digraph {}', [ [ ['A'], ['B'] ] ]);
    my $call = sub {
        stemmaweb::Model::Analysis::_call_stexaminer({ stexaminer_url => 'http://stex.test',
            poll_interval => 0.01, @_ }, @request);
    };

    is_deeply($call->(deadline => time + 30), [ ['quick'] ], 'A quick answer comes straight back');
    is($posts, 1, 'after a single request');

    # A job that outlasts the wait is reported as pending, not as an error...
    ($mode, $posts) = ('slow', 0);
    my $answer = $call->(deadline => time - 1);
    is_deeply([ @{$answer}{qw/ pending jobid /} ], [ 1, 2 ], 'A slow calculation is reported as pending, with its job');

    # ...but is waited for if there is time
    is_deeply($call->(deadline => time + 30), [ ['slow'] ], 'A calculation that finishes within the wait gives its result');

    # A failed job is a failure, and not a pending calculation
    ($mode, $posts) = ('fail', 0);
    eval { $call->(deadline => time + 30) };
    like($@, qr/failed: idp fell over/, 'A job that ended in failure is an error');

    # A job the service has lost track of while we wait is an error too
    ($mode, $polls) = ('slow', 1);
    %job = ();
    {
        no warnings 'redefine';
        local *stemmaweb::Model::Analysis::_job_status = sub { undef };
        eval { $call->(deadline => time + 30) };
        like($@, qr/lost track of job/, 'A job the service no longer knows is an error');
    }
}

# Failure of the service leaves the table in place, marked as unsolved.
$t = run_analysis($stemma, [$section], solver => sub { die "no service here\n" }, max_parallel => 1);
like($t->{error}, qr/no service here/, 'Solver failure is reported');
is($t->{variant_count}, 4, 'The locations are still listed after a solver failure');
ok((!grep { !$_->{unsolved} } @{ $t->{variants} }), 'and are marked unsolved');
is_deeply([ map { $_->{group} } @{ $t->{variants}->[0]->{readings} } ], [ [ 'A', 'B' ], [ 'C', 'D' ] ],
    'Unsolved locations keep their groups');

$t = run_analysis($stemma, [$section], solver => sub { [] }, max_parallel => 1);
like($t->{error}, qr/returned 0 results for \d+ locations/, 'A short answer is an error');

# Undirected stemmata cannot be analyzed.
{
    my $undirected = stemmaweb::Model::Stemma->new(dot => 'graph "u" { A -- B; B -- C; }');
    eval { run_analysis($undirected, [$section], solver => $solver) };
    like($@, qr/no root/, 'An undirected stemma is refused');
}

# Several sections are labelled by section.
$t = run_analysis($stemma, [ $section, { %$section, id => 2, name => 'T' } ],
    solver => $solver, max_parallel => 1);
is($t->{variants}->[0]->{id}, 'S:2', 'Locations are labelled by section when there is more than one');
is(scalar @{ $t->{variants} }, 8, 'Both sections were analyzed');

done_testing();
