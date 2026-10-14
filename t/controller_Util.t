#!/usr/bin/env perl
#
# Tests for stemmaweb::Controller::Util.
#
# Util is not a controller: it holds no actions and answers no URLs.  It is the
# shared toolbox that the other controllers use, so this file tests its
# exported helpers directly.  The request context needed by the helpers comes
# from L<Catalyst::Test>'s C<ctx_request>.

use strict;
use warnings;

use FindBin;
use lib ("$FindBin::Bin/lib");

use HTTP::Request::Common qw/ GET POST /;
use JSON qw/ decode_json encode_json /;
use Test::More;

use stemmaweb::Controller::Util
  qw/ load_tradition stemma_info section_metadata json_error json_bool /;
use stemmaweb::Test::App qw/
  section
  new_fixtures
  json_of
  mech
  post_form
  get_req
  ctx_request
  request
  install_action_log
/;

BEGIN { use_ok('stemmaweb::Controller::Util') }

install_action_log();

my $fx = new_fixtures();

# ---------------------------------------------------------------------------
# json_bool
# ---------------------------------------------------------------------------

section('json_bool');

{
    ok( json_bool(1), 'A true value becomes a true JSON value' );
    ok( !json_bool(0), 'A false value becomes a false JSON value' );
    ok( !json_bool(undef), 'An undefined value becomes a false JSON value' );
    # The important property is how they encode, not how they stringify.
    is( encode_json( { value => json_bool(1) } ), '{"value":true}',
        'A true value encodes as JSON true' );
    is( encode_json( { value => json_bool(0) } ), '{"value":false}',
        'A false value encodes as JSON false' );
}

# ---------------------------------------------------------------------------
# load_tradition
# ---------------------------------------------------------------------------

section('load_tradition');

{
    my ( $res, $c ) = ctx_request( get_req("/textinfo/$fx->{public_owned}") );
    my $info = load_tradition( $c, $fx->{public_owned} );
    ok( $info, 'A public tradition can be loaded' );
    is( $info->{id}, $fx->{public_owned}, 'The requested tradition comes back' );
    is( $info->{permission}, 'readonly',
        'An anonymous reader has read-only permission' );
    ok( ref $info->{sections} eq 'ARRAY', 'The sections are loaded with it' );
    ok( !exists $info->{stemmata}, 'Stemmata are not loaded unless asked for' );
}

{
    my ( $res, $c ) =
      ctx_request( get_req("/textinfo/$fx->{public_owned}") );
    my $info =
      load_tradition( $c, $fx->{public_owned}, { load_stemmata => 1 } );
    ok( ref $info->{stemmata} eq 'ARRAY', 'Stemmata are loaded when asked for' );
}

{
    # skip_permission is what the Stemweb callback uses, because it has no
    # session of its own.
    my ( $res, $c ) = ctx_request( get_req('/') );
    my $info =
      load_tradition( $c, $fx->{private_owned}, { skip_permission => 1 } );
    ok( $info, 'skip_permission loads a private tradition' );
    ok( !exists $info->{permission}, 'No permission is computed when skipped' );
}

# ---------------------------------------------------------------------------
# stemma_info
# ---------------------------------------------------------------------------

section('stemma_info');

{
    my $model = stemmaweb->model('Directory');
    my $stemmata =
      $model->ajax( 'get', "/tradition/$fx->{private_owned}/stemmata" );
    ok( scalar @$stemmata, 'The fixture tradition has a stemma to describe' );

    my $info = stemma_info( $stemmata->[0] );
    is( $info->{stemmaid}, $stemmata->[0]{stemmaid},
        'The stemma ID is carried over' );
    is( $info->{name}, $stemmata->[0]{name}, 'The stemma name is carried over' );
    is( ( $info->{directed} ? 'directed' : 'undirected' ),
        ( $stemmata->[0]{is_undirected} ? 'undirected' : 'directed' ),
        'Directedness is inverted from the stored flag' );
    like( $info->{svg}, qr/<svg/, 'The stemma is rendered to SVG' );
    unlike( $info->{svg}, qr/\n/,
        'The SVG has its line breaks stripped for transport' );
}

# ---------------------------------------------------------------------------
# The failure paths of the helpers
#
# A context that C<ctx_request> has already finished with cannot be asked to
# forward to a view, which is what the helpers do when they refuse a request.
# The failure paths are therefore exercised through requests that reach them.
# ---------------------------------------------------------------------------

section('failure paths');

{
    # load_tradition refusing a tradition we may not see.  The API
    # pass-through detaches as soon as the helper has answered, so its own
    # message is the one that comes back.
    my $res = request( get_req("/api/$fx->{private_owned}/sections") );
    is( $res->code, 403,
        'load_tradition answers 403 for another user\'s private tradition' );
    is( json_of($res)->{error},
        'You do not have permission to view this tradition.',
        'The refusal carries the explanation that load_tradition supplies' );
}

{
    # load_tradition passing on a datastore error.
    my $res = request( get_req('/textinfo/doesnotexist') );
    is( $res->code, 404, 'load_tradition passes a datastore error through' );
    ok( json_of($res)->{error}, 'The datastore error is reported as JSON' );
}

{
    # json_error only sets a status and a stash entry before forwarding, so
    # what matters is the shape of the response it produces.
    my $res = request( get_req('/textinfo/doesnotexist') );
    is( $res->header('Content-Type'), 'application/json; charset=utf-8',
        'json_error answers JSON' );
    ok( json_of($res)->{error}, 'json_error answers with an error key' );
}

# ---------------------------------------------------------------------------
# section_metadata
#
# section_metadata always forwards to the JSON view, so it is exercised
# through the two routes that use it.
# ---------------------------------------------------------------------------

section('section_metadata');

{
    my $res = request(
        get_req( "/sectioninfo/$fx->{public_owned}/$fx->{owned_section}" ) );
    is( $res->code, 200, 'section_metadata serves a plain GET' );
    my $result = json_of($res);
    is( $result->{id}, $fx->{owned_section},
        'The section metadata is fetched for the requested section' );
    ok( $result->{witnesses}, 'The metadata includes the witnesses' );
}

{
    my $mech = mech( follow => 0 );
    my $res  = $mech->request(
        get_req( "/relation/$fx->{public_owned}/$fx->{owned_section}/metadata" ) );
    is( $res->code, 200, 'section_metadata works through the mapper as well' );
    is( json_of($res)->{id}, $fx->{owned_section},
        'The mapper gets the same metadata' );
}

done_testing();
