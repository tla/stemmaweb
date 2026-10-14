#!/usr/bin/env perl
#
# Tests for stemmaweb::Controller::Stemma.
#
# The Stemma controller is small but has an important quirk: the C<index>
# action returns SVG unless the client asks for JSON with an Accept header, so
# both representations are checked here.

use strict;
use warnings;

use FindBin;
use lib ("$FindBin::Bin/lib");

use HTTP::Request::Common qw/ GET POST PUT /;
use Test::More;

use stemmaweb::Test::App qw/
  section
  new_fixtures
  stemmata_of
  body_of
  json_of
  is_json
  login_mech
  get_req
  post_form
  put_form
  request
  install_action_log
/;

install_action_log();

my $fx = new_fixtures();

my $mech = login_mech( follow => 0 );

my $JSON = { accept => 'application/json' };
my $XML  = { accept => 'text/xml' };

# The dot definition of a stemma with the witness classes that Stemmarest
# requires; it is used to create a fresh stemma for the owner.
my $dot = do {
    local ( @ARGV, $/ ) = ("$stemmaweb::Test::App::T_DATA/florilegium.dot");
    <>;
};

# ---------------------------------------------------------------------------
# GET /stemma/<tradition>/<stemmaid>
# ---------------------------------------------------------------------------

section('stemma index - reading a stemma');

my $existing = $fx->{stemmata}{public_readonly}[0];
ok( $existing, 'Fixture tradition has a stemma to read' );

{
    my $res =
      request( get_req( "/stemma/$fx->{public_readonly}/$existing", %$JSON ) );
    is( $res->code, 200, 'GET /stemma/<tradition>/<stemma> succeeds' );
    ok( is_json($res), 'Response is JSON when JSON is requested' );
    my $info = json_of($res);
    is( $info->{stemmaid}, $existing, 'Response identifies the stemma' );
    ok( $info->{name}, 'Response carries the stemma name' );
    ok( defined $info->{directed}, 'Response says whether the stemma is directed' );
    like( $info->{svg}, qr/<svg/, 'Response carries the rendered SVG' );
}

{
    my $res =
      request( get_req( "/stemma/$fx->{public_readonly}/$existing", %$XML ) );
    is( $res->code, 200, 'GET /stemma/<tradition>/<stemma> returns SVG' );
    is( $res->header('Content-Type'), 'image/svg+xml',
        'SVG is served with the SVG content type' );
    like( body_of($res), qr/<svg/, 'The response really is an SVG document' );
}

{
    # Without an Accept header the SVG is what the client gets.
    my $res = request( get_req( "/stemma/$fx->{public_readonly}/$existing" ) );
    is( $res->code, 200,
        'GET /stemma/<tradition>/<stemma> defaults to SVG' );
    is( $res->header('Content-Type'), 'image/svg+xml',
        'SVG is the default representation' );
    like( body_of($res), qr/<svg/, 'The default representation is an SVG document' );
}

{
    my $res = request( get_req( "/stemma/$fx->{public_owned}/doesnotexist", %$JSON ) );
    is( $res->code, 404, 'GET /stemma/<tradition>/<unknown> returns 404' );
    like( json_of($res)->{error}, qr/No stemma/,
        'Unknown stemma is reported by name' );
}

{
    # The permission check stops the action, so the refusal is all that comes
    # back.
    my $res =
      request( get_req( "/stemma/$fx->{private_owned}/$fx->{stemmata}{private_owned}[0]",
            %$JSON ) );
    is( $res->code, 403,
        'GET /stemma/<tradition>/<stemma> is refused for a private tradition' );

    unlike( body_of($res), qr/"svg"/,
        'The refusal does not carry the stemma' );
}

{
    my $res = request(
        put_form( "/stemma/$fx->{public_owned}/$existing", [], %$JSON ) );
    is( $res->code, 400, 'PUT /stemma/<tradition>/<stemma> is a disallowed method' );
    like( json_of($res)->{error}, qr/Disallowed HTTP method/,
        'Method error is reported' );
}

# ---------------------------------------------------------------------------
# POST /stemma/<tradition>/__NEW__ and updating an existing stemma
# ---------------------------------------------------------------------------

section('stemma index - creating and updating a stemma');

my $new_stemma;
{
    my $before = scalar @{ $fx->{stemmata}{public_owned} };
    my $res    = request( post_form( "/stemma/$fx->{public_owned}/__NEW__",
        [ dot => $dot ], %$JSON ) );
    is( $res->code, 403, 'Creating a stemma is refused without a session' );

    is( scalar @{ stemmata_of( $fx->{public_owned} ) }, $before,
        'The refused request did not create a stemma' );
}

{
    my $res = $mech->request( post_form( "/stemma/$fx->{public_owned}/__NEW__",
        [ dot => $dot ], %$JSON ) );
    is( $res->code, 200, 'POST /stemma/<tradition>/__NEW__ creates a stemma' );
    my $info = json_of($res);
    ok( $info->{stemmaid}, 'Response contains the new stemma ID' );
    $new_stemma = $info->{stemmaid};

    my $list = stemmaweb::Test::App::traditions_by_name();
    ok( $list, 'Fixture traditions are still listable after the new stemma' );
}

{
    my $res = $mech->request(
        get_req( "/stemma/$fx->{public_owned}/$new_stemma", %$JSON ) );
    is( $res->code, 200, 'The newly created stemma can be read back' );
    my $info = json_of($res);
    is( $info->{stemmaid}, $new_stemma, 'The new stemma has the expected ID' );
    like( $info->{svg}, qr/<svg/, 'The new stemma has rendered SVG' );
}

{
    my $res = $mech->request( post_form( "/stemma/$fx->{public_owned}/$new_stemma",
        [ dot => $dot ], %$JSON ) );
    is( $res->code, 200, 'POST /stemma/<tradition>/<stemma> updates a stemma' );
    my $info = json_of($res);
    is( $info->{stemmaid}, $new_stemma, 'The same stemma comes back' );
}

# ---------------------------------------------------------------------------
# GET /stemma/dot/<tradition>/<stemmaid>
# ---------------------------------------------------------------------------

section('stemma dot');

{
    my $res =
      request( get_req( "/stemma/dot/$fx->{public_readonly}/$existing" ) );
    is( $res->code, 200, 'GET /stemma/dot/<tradition>/<stemma> succeeds' );
    my $info = json_of($res);
    like( $info->{dot}, qr/^\s*(di)?graph/, 'Returned value is a dot definition' );
    unlike( $info->{dot}, qr/\n/,
        'Line breaks are escaped as |n for transport' );
    like( $info->{dot}, qr/\|n/, 'Escaped line breaks are present' );
}

{
    my $res =
      request( get_req( "/stemma/dot/$fx->{private_owned}/$fx->{stemmata}{private_owned}[0]" ) );
    is( $res->code, 403,
        'GET /stemma/dot is refused for a private tradition without a session' );
    ok( !defined( eval { json_of($res)->{dot} } ),
        'The refusal does not carry the dot definition' );
}

{
    my $res = request( get_req("/stemma/dot/$fx->{public_owned}/doesnotexist") );
    is( $res->code, 404, 'GET /stemma/dot returns 404 for an unknown stemma' );
    like( json_of($res)->{error}, qr/No stemma/, 'The reason is reported' );
}

# ---------------------------------------------------------------------------
# POST /stemma/reroot/<tradition>/<stemmaid>
# ---------------------------------------------------------------------------

section('stemma reroot');

my $owned_stemma = $fx->{stemmata}{private_owned}[0];
{
    my $res = request(
        post_form( "/stemma/reroot/$fx->{private_owned}/$owned_stemma",
            [ root => 'A' ] ) );
    is( $res->code, 403, 'Rerooting is refused without permission' );
}

{
    my $res = $mech->request(
        post_form( "/stemma/reroot/$fx->{private_owned}/$owned_stemma",
            [ root => 'A' ] ) );
    is( $res->code, 200, 'POST /stemma/reroot succeeds for the owner' );
    my $info = json_of($res);
    is( $info->{stemmaid}, $owned_stemma, 'The same stemma is returned' );
    like( $info->{svg}, qr/<svg/, 'The rerooted stemma has rendered SVG' );
}

{
    # Only extant witnesses can be made the root.
    my $res = $mech->request(
        post_form( "/stemma/reroot/$fx->{private_owned}/$owned_stemma",
            [ root => 'not-a-witness' ] ) );
    is( $res->code, 404, 'Rerooting on an unknown node is refused by Stemmarest' );
}

{
    # Only POST is accepted, and the refusal is what comes back.
    my $res = $mech->request(
        get_req("/stemma/reroot/$fx->{private_owned}/$owned_stemma") );
    is( $res->code, 405, 'GET /stemma/reroot is a disallowed method' );
    like( json_of($res)->{error}, qr/Call this method with POST/,
        'Method error is reported' );
}

# ---------------------------------------------------------------------------
# POST /stemma/delete/<tradition>/<stemmaid>
# ---------------------------------------------------------------------------

section('stemma delete');

{
    my $res = request( post_form( "/stemma/delete/$fx->{private_owned}/$owned_stemma", [] ) );
    is( $res->code, 403, 'Deleting a stemma is refused without permission' );
}

{
    my $res = $mech->request( get_req("/stemma/delete/$fx->{private_owned}/$owned_stemma") );
    is( $res->code, 405, 'GET /stemma/delete is a disallowed method' );
    like( json_of($res)->{error}, qr/Call this method with POST/,
        'Method error is reported' );
}

{
    my $res = $mech->request(
        post_form( "/stemma/delete/$fx->{public_owned}/$new_stemma", [], %$JSON ) );
    is( $res->code, 200, 'POST /stemma/delete succeeds for the owner' );
    my $remaining = json_of($res);
    ok( ref $remaining eq 'ARRAY', 'Remaining stemmata are returned as a list' );
    my @ids = map { $_->{stemmaid} } @$remaining;
    ok( !( grep { $_ eq $new_stemma } @ids ), 'Deleted stemma is not in the list' );
}

{
    my $res = $mech->request(
        get_req( "/stemma/$fx->{public_owned}/$new_stemma", %$JSON ) );
    is( $res->code, 404, 'Deleted stemma can no longer be read' );
}

done_testing();
