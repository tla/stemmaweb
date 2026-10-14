#!/usr/bin/env perl
#
# Tests for stemmaweb::Controller::Stemweb.
#
# The Stemweb controller is a client for an external Stemweb server, so the
# tests stand a fake Stemweb in front of LWP (with LWP::Protocol::PSGI) and
# drive every branch of the client protocol against it.  Nothing else in the
# application is mocked: the resulting stemmata are really created in
# Stemmarest.
#
# The C<pars> branch of C<request> runs the real Phylip C<pars> binary, which
# the development image installs.

use strict;
use warnings;

use FindBin;
use lib ("$FindBin::Bin/lib");

use HTTP::Request::Common qw/ GET POST /;
use JSON qw/ decode_json encode_json /;
use LWP::Protocol::PSGI;
use Test::More;
use URI;

use stemmaweb::Test::App qw/
  section
  new_fixtures
  body_of
  json_of
  is_json
  login_mech
  get_req
  post_json
  post_raw
  post_form
  request
  install_action_log
/;
use stemmaweb;

install_action_log();

my $fx = new_fixtures();

my $mech = login_mech( follow => 0 );

# ---------------------------------------------------------------------------
# The fake Stemweb server
# ---------------------------------------------------------------------------

my $stemweb_url  = stemmaweb->controller('Stemweb')->stemweb_url;
my $stemweb_host = URI->new($stemweb_url)->host;
ok( $stemweb_host, "Stemweb is configured to talk to $stemweb_url" );

my $textid = $fx->{public_owned};

# Canned responses; individual tests replace these before making a request.
our $available_body =
  encode_json( [ { pk => 1, model => 'algorithms.algorithm',
                   fields => { name => 'RHM', desc => 'fake', args => [] } } ] );
our $process_body = encode_json( { jobid => 4242 } );
our $status_body  = encode_json( { status => 0, jobid => 4242, algorithm => 'RHM',
        format => 'newick', start_time => '2024-01-01 10:00:00',
        textid => $textid, result => '(Ba96,Er16);' } );

our $available_response = sub { [ 200, [ 'Content-Type' => 'application/json' ], [$available_body] ] };
our $process_response   = sub { [ 200, [ 'Content-Type' => 'application/json' ], [$process_body] ] };
our $status_response    = sub { [ 200, [ 'Content-Type' => 'application/json' ], [$status_body] ] };

my @requests_to_stemweb;
my $stemweb_app = sub {
    my $env  = shift;
    my $path = $env->{PATH_INFO};
    push @requests_to_stemweb, $path;
    if ( $path eq '/algorithms/available' ) {
        return $available_response->();
    }
    elsif ( $path =~ m{^/algorithms/process/} ) {
        return $process_response->();
    }
    elsif ( $path =~ m{^/algorithms/jobstatus/} ) {
        return $status_response->();
    }
    return [ 404, [ 'Content-Type' => 'text/plain' ], ["no fake for $path"] ];
};

# Only requests to the Stemweb host are intercepted; the application's own
# calls to Stemmarest go to the real backend.
my $guard = LWP::Protocol::PSGI->register( $stemweb_app, host => $stemweb_host );
ok( $guard, 'Fake Stemweb server is installed' );

# ---------------------------------------------------------------------------
# GET /stemweb/available
# ---------------------------------------------------------------------------

section('available');

{
    my $res = request( get_req('/stemweb/available') );
    is( $res->code, 200, 'GET /stemweb/available succeeds' );
    ok( is_json($res), 'Available algorithms are returned as JSON' );
    my $algos = json_of($res);
    ok( ref $algos eq 'ARRAY', 'Algorithms are returned as a list' );
    my ($rhm) = grep { $_->{fields}{name} eq 'RHM' } @$algos;
    ok( $rhm, 'The algorithm offered by Stemweb is passed through' );

    # The controller adds Phylip Pars as a pseudo-algorithm when pars is
    # installed.
    my ($pars) = grep { $_->{fields}{name} eq 'Pars' } @$algos;
    ok( $pars, 'Pars is offered alongside the Stemweb algorithms' );
    is( $pars->{pk}, 100, 'Pars has the reserved algorithm key 100' );
}

{
    # A Stemweb that answers with something other than JSON yields no
    # algorithms at all (but still offers Pars).
    local $available_response = sub {
        [ 500, [ 'Content-Type' => 'text/html' ], ['broken'] ];
    };
    my $res = request( get_req('/stemweb/available') );
    is( $res->code, 200, 'GET /stemweb/available survives a broken Stemweb' );
    my $algos = json_of($res);
    my ($pars) = grep { $_->{fields}{name} eq 'Pars' } @$algos;
    ok( $pars, 'Pars is still offered' );
    my ($rhm) = grep { $_->{fields}{name} eq 'RHM' } @$algos;
    ok( !$rhm, 'No algorithms come back from the broken Stemweb' );
}

# ---------------------------------------------------------------------------
# GET /stemweb/request
# ---------------------------------------------------------------------------

section('request');

{
    my $res = request( get_req("/stemweb/request?tradition=$textid&algorithm=1") );
    is( $res->code, 403, 'Submitting a job is refused without a session' );
    like( json_of($res)->{error}, qr/do not have permission to update/,
        'Permission error is reported' );
}

{
    my $res = request(
        get_req( "/stemweb/request?tradition=$fx->{public_readonly}&algorithm=1" ) );
    is( $res->code, 403,
        'Submitting a job is refused for a tradition we only may read' );
}

{
    # The conflate option names one of the tradition's own relation types.
    my $reltypes = json_of( $mech->request( get_req("/api/$textid/relationtypes") ) );
    my ($conflate) = map { $_->{name} } @$reltypes;
    ok( $conflate, 'The tradition has a relation type to conflate on' );

    my $res = $mech->request( get_req(
            "/stemweb/request?tradition=$textid&algorithm=1&conflate=$conflate" ) );
    is( $res->code, 200, 'GET /stemweb/request submits a job' );
    is( json_of($res)->{jobid}, 4242, 'The job ID from Stemweb is returned' );

    # The request that we sent to Stemweb should carry the alignment data and
    # the callback details.
    my $body = $requests_to_stemweb[-1];
    is( $body, '/algorithms/process/1/',
        'The job was submitted to the process endpoint for the algorithm' );

    # The job ID is recorded against the tradition.
    my $info = json_of( $mech->request( get_req("/textinfo/$textid") ) );
    is( $info->{stemweb_jobid}, 4242, 'The job ID is recorded on the tradition' );
}

{
    my $res = $mech->request(
        get_req("/stemweb/request?tradition=$textid&algorithm=1") );
    is( $res->code, 200, 'A second job can be submitted' );
}

{
    # Stemweb being unreachable is reported as 503.
    local $process_response = sub {
        [ 500, [ 'Content-Type' => 'text/html', 'Client-Warning' => 'Internal response' ],
            ['unreachable'] ];
    };
    my $res = $mech->request(
        get_req("/stemweb/request?tradition=$textid&algorithm=1") );
    is( $res->code, 503, 'An unreachable Stemweb is reported as 503' );
    like( json_of($res)->{error}, qr/unreachable/,
        'The error says that Stemweb is unreachable' );
}

{
    # Any other failure is passed on as a 500.
    local $process_response = sub {
        [ 400, [ 'Content-Type' => 'text/plain' ], ['bad request'] ];
    };
    my $res = $mech->request(
        get_req("/stemweb/request?tradition=$textid&algorithm=1") );
    is( $res->code, 500, 'A Stemweb error is reported as 500' );
    like( json_of($res)->{error}, qr/Stemweb error/, 'The error mentions Stemweb' );
}

{
    # Without a tradition the controller dereferences the failed tradition
    # lookup; this is recorded rather than fixed.
    my $res = $mech->request( get_req('/stemweb/request?algorithm=1') );
    is( $res->code, 500,
        'GET /stemweb/request without a tradition fails' );
}

# ---------------------------------------------------------------------------
# POST /stemweb/result
# ---------------------------------------------------------------------------

section('result - protocol');

{
    my $res = request( get_req('/stemweb/result') );
    is( $res->code, 403, 'GET /stemweb/result is refused' );
    like( json_of($res)->{error}, qr/Please use POST/, 'The refusal asks for POST' );
}

{
    my $res = request(
        post_raw( '/stemweb/result', 'this is not json', 'application/json' ) );
    is( $res->code, 400, 'Malformed JSON is rejected' );
    like( json_of($res)->{error}, qr/Could not parse/, 'The parse failure is reported' );
}

{
    my $res = request( post_json( '/stemweb/result',
        { textid => 'nosucht tradition', status => 0, jobid => 1 } ) );
    is( $res->code, 400, 'A result for an unknown tradition is rejected' );
    like( json_of($res)->{error}, qr/No tradition found/, 'The reason is reported' );
}

# ---------------------------------------------------------------------------
# POST /stemweb/result - a successful run
# ---------------------------------------------------------------------------

section('result - successful run');

{
    # Give the tradition a job ID to match against.
    my $submit = $mech->request(
        get_req("/stemweb/request?tradition=$textid&algorithm=1") );
    is( $submit->code, 200, 'A job was submitted for the owner' );

    my $res = $mech->request( post_json( '/stemweb/result', {
        status     => 0,
        jobid      => 4242,
        algorithm  => 'RHM',
        format     => 'newick',
        start_time => '2024-01-01 10:00:00',
        textid     => $textid,
        result     => '(Ba96,Er16);(Gr314,Kf133);',
    } ) );
    is( $res->code, 200, 'POST /stemweb/result accepts a finished run' );
    my $data = json_of($res);
    is( $data->{status}, 'success', 'The result is reported as a success' );
    is( scalar @{ $data->{stemmata} }, 2,
        'One stemma was created for each tree in the Newick result' );
    my ($stemma) = @{ $data->{stemmata} };
    ok( $stemma->{stemmaid}, 'The created stemma has an ID' );
    is( $stemma->{from_jobid}, 4242, 'The stemma records the job it came from' );
    like( $stemma->{name}, qr/^RHM /, 'The stemma is named after the algorithm' );
    like( $stemma->{svg}, qr/<svg/, 'The new stemma was rendered to SVG' );
}

{
    # 'Neighbour Net' results are a graph specification rather than Newick.
    my $submit = $mech->request(
        get_req("/stemweb/request?tradition=$textid&algorithm=2") );
    is( $submit->code, 200, 'A second job was submitted' );

    my $graph = encode_json( {
        directed => JSON::false,
        nodes    => [ { id => 'Ba96' }, { id => 'Er16' }, { id => '1' } ],
        links    => [ { source => 'Ba96', target => '1' },
                      { source => '1',    target => 'Er16' } ],
    } );
    my $res = $mech->request( post_json( '/stemweb/result', {
        status     => 0,
        jobid      => 4242,
        algorithm  => 'Neighbour Net',
        format     => 'json',
        start_time => '2024-01-01 10:00:00',
        textid     => $textid,
        result     => $graph,
    } ) );
    is( $res->code, 200, 'POST /stemweb/result accepts a Neighbour Net run' );
    my $data = json_of($res);
    is( $data->{status}, 'success', 'The graph was turned into a stemma' );
    my ($stemma) = @{ $data->{stemmata} };
    like( $stemma->{name}, qr/^Neighbour Net /,
        'The stemma is named after the algorithm' );
}

# ---------------------------------------------------------------------------
# POST /stemweb/result - the run is not ready
# ---------------------------------------------------------------------------

section('result - run not ready');

for my $status ( 1, -1 ) {
    my $res = $mech->request( post_json( '/stemweb/result', {
        status    => $status,
        jobid     => 4242,
        algorithm => 'RHM',
        textid    => $textid,
        result    => 'still going',
    } ) );
    is( $res->code, 200, "POST /stemweb/result with status $status succeeds" );
    is( json_of($res)->{status}, 'running',
        "Status $status is reported as still running" );
}

{
    # A finished run whose job ID does not match the tradition's is not ours.
    my $res = $mech->request( post_json( '/stemweb/result', {
        status     => 0,
        jobid      => 999999,
        algorithm  => 'RHM',
        format     => 'newick',
        start_time => '2024-01-01 10:00:00',
        textid     => $textid,
        result     => '(Ba96,Er16);',
    } ) );
    is( $res->code, 200, 'A result with an unexpected job ID is accepted' );
    is( json_of($res)->{status}, 'notfound',
        '...but no stemma is created for it' );
}

# ---------------------------------------------------------------------------
# POST /stemweb/result - a failed run
# ---------------------------------------------------------------------------

section('result - failed run');

{
    my $res = $mech->request( post_json( '/stemweb/result', {
        status    => 2,
        jobid     => 4242,
        algorithm => 'RHM',
        textid    => $textid,
        result    => 'the algorithm fell over',
    } ) );
    is( $res->code, 200, 'POST /stemweb/result accepts a failed run' );
    my $data = json_of($res);
    is( $data->{status}, 'failed', 'The failure is reported' );
    is( $data->{message}, 'the algorithm fell over',
        'The message from Stemweb is passed on' );
}

# ---------------------------------------------------------------------------
# POST /stemweb/result - results from pars, which has no job ID of its own
# ---------------------------------------------------------------------------

section('result - pars');

{
    my $res = $mech->request( post_json( '/stemweb/result', {
        status     => 0,
        jobid      => -1,
        algorithm  => 'pars',
        format     => 'newick',
        start_time => '2024-01-01 10:00:00',
        textid     => $textid,
        result     => '(Ba96,Er16);',
    } ) );
    is( $res->code, 200, 'A pars result is accepted' );
    is( json_of($res)->{status}, 'success', 'A stemma is created for pars' );
}

# ---------------------------------------------------------------------------
# GET /stemweb/query/<jobid>
# ---------------------------------------------------------------------------

section('query');

{
    my $res = request( get_req('/stemweb/query/4242') );
    is( $res->code, 200, 'GET /stemweb/query/<jobid> succeeds' );
    my $data = json_of($res);
    is( $data->{status}, 'success', 'A finished job is processed like a push' );
    ok( scalar @{ $data->{stemmata} }, 'A stemma is created for the queried job' );
}

{
    local $status_body = encode_json( { status => 1, jobid => 4242, algorithm => 'RHM',
            textid => $textid, result => 'running' } );
    my $res = request( get_req('/stemweb/query/4242') );
    is( $res->code, 200, 'GET /stemweb/query succeeds while the job runs' );
    is( json_of($res)->{status}, 'running', 'A running job is reported as running' );
}

{
    local $status_body = encode_json( { status => 2, jobid => 4242, algorithm => 'RHM',
            textid => $textid, result => 'boom' } );
    my $res = request( get_req('/stemweb/query/4242') );
    is( $res->code, 200, 'GET /stemweb/query succeeds for a failed job' );
    is( json_of($res)->{status}, 'failed', 'A failed job is reported as failed' );
}

{
    local $status_response = sub {
        [ 500, [ 'Content-Type' => 'text/html', 'Client-Warning' => 'Internal response' ],
            ['unreachable'] ];
    };
    my $res = request( get_req('/stemweb/query/4242') );
    is( $res->code, 503, 'An unreachable Stemweb is reported as 503' );
}

{
    local $status_response = sub {
        [ 404, [ 'Content-Type' => 'text/plain' ], ['no such job'] ];
    };
    my $res = request( get_req('/stemweb/query/4242') );
    is( $res->code, 500, 'A Stemweb error is reported as 500' );
}

{
    local $status_response = sub {
        [ 200, [ 'Content-Type' => 'application/json' ], ['not json at all'] ];
    };
    my $res = request( get_req('/stemweb/query/4242') );
    is( $res->code, 500, 'An unparseable Stemweb answer is reported as 500' );
    like( json_of($res)->{error}, qr/Could not parse/,
        'The parse failure is reported' );
}

done_testing();
