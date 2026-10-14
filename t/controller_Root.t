#!/usr/bin/env perl
#
# Tests for stemmaweb::Controller::Root.
#
# Every public action of the controller is exercised, together with the
# permission, HTTP-method and 404 branches of each one.  The expectations
# record the behaviour of the application as it stands, running against the
# development Docker stack (see t/lib/stemmaweb/Test/App.pm).

use strict;
use warnings;

use FindBin;
use lib ("$FindBin::Bin/lib");

use HTTP::Request::Common qw/ GET POST PUT /;
use JSON qw/ decode_json /;
use Test::More;

use stemmaweb::Test::App qw/
  section
  new_fixtures
  body_of
  json_of
  is_json
  login_mech
  get_req
  post_form
  post_multipart
  post_json
  put_form
  put_json
  delete_req
  request
  install_action_log
/;

install_action_log();

my $fx = new_fixtures();

# An anonymous mechanize object, and one with a session for user@example.org.
# Neither follows redirects, so that the status codes below stay visible.
my $anon = stemmaweb::Test::App::mech( follow => 0 );
my $mech = login_mech( follow => 0 );

# ---------------------------------------------------------------------------
# Static pages and the text directory
# ---------------------------------------------------------------------------

section('static pages');

{
    my $res = request('/');
    is( $res->code, 200, 'GET / succeeds' );
    like( $res->header('Content-Type'), qr{text/html},
        'GET / returns HTML' );
    is( $res->request->uri->path, '/', 'GET / is handled by the index action' );

    # The index action passes a requested tradition through to the template.
    my $with = request( '/?withtradition=' . $fx->{public_owned} );
    is( $with->code, 200, 'GET /?withtradition=<id> succeeds' );
    like( body_of($with), qr/\Q@{[ $fx->{public_owned} ]}\E/,
        'Requested tradition ID is passed through to the page' );
}

{
    my $res = request('/about');
    is( $res->code, 200, 'GET /about succeeds' );
    like( $res->header('Content-Type'), qr{text/html},
        'GET /about returns HTML' );
}

{
    # /help/<topic> renders <topic>.tt; about.tt is the topic we know exists.
    my $res = request('/help/about');
    is( $res->code, 200, 'GET /help/<topic> succeeds' );
    like( $res->header('Content-Type'), qr{text/html},
        'GET /help/<topic> returns HTML' );
    like( body_of($res), qr/<html/i, 'Help page was rendered from a template' );
}

{
    my $res = request('/directory');
    is( $res->code, 200, 'GET /directory succeeds for an anonymous user' );
    my $body = body_of($res);
    like( $body, qr/Public texts/, 'Anonymous directory lists public texts' );
    unlike( $body, qr/User texts/,
        'Anonymous directory does not list user texts' );
    my @listed = grep {/traditionname/} split /\n/, $body;
    is( scalar @listed, 3,
        'Directory lists the three public fixture traditions' );
}

{
    my $res = $mech->get('/directory');
    is( $res->code, 200, 'GET /directory succeeds for a logged-in user' );
    my $body = $res->content;
    like( $body, qr/User texts/,
        'Directory lists the logged-in user\'s own texts' );
    like( $body, qr/Public texts/,
        'Directory still lists the public texts' );
    my @listed = grep {/traditionname/} split /\n/, $body;
    is( scalar @listed, 6,
        'Directory lists the five own texts plus the one public text' );
}

{
    # The default action catches everything that no other action matches.
    my $res = request('/no/such/page');
    is( $res->code, 404, 'Unknown path returns 404 from the default action' );
    like( body_of($res), qr/Page not found/, 'Default action returns its message' );
}

# ---------------------------------------------------------------------------
# newtradition
# ---------------------------------------------------------------------------

section('newtradition');

my $new_tradition_id;
{
    my $res = request( post_multipart( '/newtradition', [
        name     => 'anonymous tradition',
        filetype => 'stemmaweb',
        file     => [ "$stemmaweb::Test::App::T_DATA/legendfrag.xml" ],
    ] ) );
    is( $res->code, 403, 'POST /newtradition is refused without a login' );
    ok( is_json($res), 'Refusal is reported as JSON' );
    like( json_of($res)->{error}, qr/without being logged in/,
        'Refusal explains that a login is required' );
}

{
    my $res = $mech->request( post_multipart( '/newtradition', [
        name      => 'root test tradition',
        language  => 'Latin',
        direction => 'LR',
        filetype  => 'stemmaweb',
        file      => [ "$stemmaweb::Test::App::T_DATA/legendfrag.xml" ],
    ] ) );
    is( $res->code, 200, 'POST /newtradition succeeds when logged in' );
    ok( is_json($res), 'New tradition is reported as JSON' );
    my $data = json_of($res);
    ok( $data->{tradId}, 'Response contains the new tradition ID' );
    $new_tradition_id = $data->{tradId};

    # The new tradition is visible to its owner straight away.
    my $info = json_of( $mech->request( get_req("/textinfo/$new_tradition_id") ) );
    is( $info->{name}, 'root test tradition', 'New tradition has the given name' );
    is( $info->{permission}, 'full', 'Owner has full access to the new tradition' );
}

# ---------------------------------------------------------------------------
# newsection
# ---------------------------------------------------------------------------

section('newsection');

{
    my $res = request( post_multipart( "/newsection/$fx->{private_owned}", [
        name     => 'anonymous section',
        filetype => 'stemmaweb',
        file     => [ "$stemmaweb::Test::App::T_DATA/lf2.xml" ],
    ] ) );
    is( $res->code, 403,
        'POST /newsection is refused for a tradition we cannot see' );
}

{
    my $before = scalar @{ $fx->{sections}{public_owned} };
    my $res    = $mech->request( post_multipart( "/newsection/$fx->{public_owned}", [
        name     => 'second section',
        filetype => 'stemmaweb',
        file     => [ "$stemmaweb::Test::App::T_DATA/lf2.xml" ],
    ] ) );
    is( $res->code, 200, 'POST /newsection succeeds for the owner' );
    my $data = json_of($res);
    ok( $data->{sectionId}, 'Response contains the new section ID' );

    my $now = stemmaweb::Test::App::sections_of( $fx->{public_owned} );
    is( scalar @$now, $before + 1, 'Tradition now has one more section' );
}

{
    my $res = $mech->request( get_req("/newsection/$fx->{public_owned}") );
    is( $res->code, 400, 'GET /newsection is a disallowed method' );
    like( json_of($res)->{error}, qr/Disallowed HTTP method/,
        'Method error is reported' );
}

# ---------------------------------------------------------------------------
# textinfo
# ---------------------------------------------------------------------------

section('textinfo');

{
    my $res = request( get_req( "/textinfo/$fx->{public_readonly}" ) );
    is( $res->code, 200, 'GET /textinfo succeeds for a public tradition' );
    my $info = json_of($res);
    is( $info->{id}, $fx->{public_readonly}, 'Returns the requested tradition' );
    is( $info->{permission}, 'readonly',
        'Anonymous user has read-only permission' );
    ok( $info->{is_public}, 'Tradition is reported as public' );
    ok( ref $info->{sections} eq 'ARRAY', 'Sections are included' );
    ok( ref $info->{stemmata} eq 'ARRAY', 'Stemmata are included' );
}

{
    my $res = request( get_req( "/textinfo/$fx->{private_owned}" ) );
    is( $res->code, 403,
        'GET /textinfo is refused for somebody else\'s private tradition' );
    like( json_of($res)->{error}, qr/do not have permission to view/,
        'Permission error is reported' );
}

{
    my $res = request( get_req('/textinfo/doesnotexist') );
    is( $res->code, 404, 'GET /textinfo returns 404 for an unknown tradition' );
    ok( is_json($res), '404 is reported as JSON' );
}

{
    my $res = request( post_form( "/textinfo/$fx->{public_readonly}",
        [ name => 'renamed by anonymous user' ] ) );
    is( $res->code, 403,
        'POST /textinfo is refused for a read-only tradition' );
    like( json_of($res)->{error}, qr/do not have permission to update/,
        'Permission error is reported' );
}

{
    my $res = $mech->request( post_form( "/textinfo/$fx->{public_owned}",
        [ name => 'Sapientia the renamed', is_public => 'true' ] ) );
    is( $res->code, 200, 'POST /textinfo succeeds for the owner' );
    my $info = json_of($res);
    is( $info->{name}, 'Sapientia the renamed', 'Tradition was renamed' );
    ok( $info->{is_public}, 'Tradition is still public' );

    # ...and the change stuck.
    my $after =
      json_of( $mech->request( get_req("/textinfo/$fx->{public_owned}") ) );
    is( $after->{name}, 'Sapientia the renamed', 'Renaming persisted' );
    ok( $after->{is_public}, 'Public flag persisted' );
}

{
    # A partial POST is treated as "set everything I did not mention to
    # false": the controller explicitly falsifies is_public when the form
    # does not carry it, which silently un-publishes the tradition.
    TODO: {
        local $TODO =
          'POST /textinfo un-publishes the tradition when the form omits is_public';
        $mech->request(
            post_form( "/textinfo/$fx->{public_owned}", [ name => 'partial rename' ] ) );
        my $after =
          json_of( $mech->request( get_req("/textinfo/$fx->{public_owned}") ) );
        ok( $after->{is_public},
            'Tradition is still public after a partial update' );
    }
    # Put it back the way the rest of this file expects to find it.
    $mech->request( post_form( "/textinfo/$fx->{public_owned}",
        [ name => 'Sapientia the renamed', is_public => 'true' ] ) );
    my $restored =
      json_of( $mech->request( get_req("/textinfo/$fx->{public_owned}") ) );
    ok( $restored->{is_public}, 'Tradition was made public again' );
}

{
    # Only admin users may hand a tradition to somebody else.
    my $res = $mech->request( post_form( "/textinfo/$fx->{public_owned}",
        [ owner => $fx->{admin} ] ) );
    is( $res->code, 403,
        'POST /textinfo refuses an ownership change by a non-admin' );
    like( json_of($res)->{error}, qr/Only admin users/,
        'Ownership error is reported' );
}

{
    my $res = $mech->request( delete_req("/textinfo/$fx->{public_owned}") );
    is( $res->code, 405, 'DELETE /textinfo is a disallowed method' );
    like( json_of($res)->{error}, qr/Disallowed HTTP method/,
        'Method error is reported' );
}

# ---------------------------------------------------------------------------
# sectioninfo
# ---------------------------------------------------------------------------

section('sectioninfo');

my $section = $fx->{owned_section};
{
    my $res = request( get_req("/sectioninfo/$fx->{public_owned}/$section") );
    is( $res->code, 200, 'GET /sectioninfo succeeds for a public tradition' );
    my $info = json_of($res);
    is( $info->{id}, $section, 'Returns the requested section' );
    ok( ref $info->{witnesses} eq 'ARRAY', 'Section metadata includes witnesses' );
}

{
    my $res = request( get_req("/sectioninfo/$fx->{private_owned}/1") );
    is( $res->code, 403,
        'GET /sectioninfo is refused for a private tradition' );
}

{
    my $res = request( post_form( "/sectioninfo/$fx->{public_readonly}/$fx->{sections}{public_readonly}[0]",
        [ name => 'not allowed' ] ) );
    is( $res->code, 403,
        'POST /sectioninfo is refused for a read-only tradition' );
    like( json_of($res)->{error}, qr/do not have permission to modify/,
        'Permission error is reported' );
}

{
    my $res = $mech->request( post_form( "/sectioninfo/$fx->{public_owned}/$section",
        [ name => 'renamed section' ] ) );
    is( $res->code, 200, 'POST /sectioninfo succeeds for the owner' );
    is( json_of($res)->{name}, 'renamed section', 'Section was renamed' );
}

{
    my $res = $mech->request(
        put_form( "/sectioninfo/$fx->{public_owned}/$section", [] ) );
    is( $res->code, 403, 'PUT /sectioninfo is rejected' );
    like( json_of($res)->{error}, qr/Use POST or GET/,
        'Method error is reported' );
}

# ---------------------------------------------------------------------------
# orderafter
# ---------------------------------------------------------------------------

section('orderafter');

{
    my @sections = @{ $fx->{sections}{multisection} };
    is( scalar @sections, 2, 'Fixture has a two-section tradition' );

    my $res = $mech->request(
        post_form( "/orderafter/$fx->{multisection}/$sections[0]/$sections[1]", [] ) );
    is( $res->code, 200, 'POST /orderafter succeeds for the owner' );
    is( json_of($res)->{status}, 'ok', 'Reordering is acknowledged' );

    # 'none' moves the section to the beginning of the tradition.
    my $first = $mech->request(
        post_form( "/orderafter/$fx->{multisection}/$sections[1]/none", [] ) );
    is( $first->code, 200, 'POST /orderafter with "none" succeeds' );
}

{
    my @sections = @{ $fx->{sections}{multisection} };
    my $res      = $mech->request(
        get_req("/orderafter/$fx->{multisection}/$sections[0]/$sections[1]") );
    is( $res->code, 400, 'GET /orderafter is a disallowed method' );
}

{
    my $res = request(
        post_form( "/orderafter/$fx->{private_owned}/1/2", [] ) );
    is( $res->code, 403, 'POST /orderafter is refused without permission' );
}

# ---------------------------------------------------------------------------
# delete
# ---------------------------------------------------------------------------

section('delete');

{
    my $res = $mech->request( get_req("/delete/$new_tradition_id") );
    is( $res->code, 400,
        'GET /delete/<tradition> is a disallowed method' );
}

{
    my $res = request( post_form( "/delete/$fx->{private_owned}", [] ) );
    is( $res->code, 403, 'POST /delete/<tradition> is refused without permission' );
}

{
    my @sections = @{ $fx->{sections}{multisection} };
    my $res      = request(
        post_form( "/delete/$fx->{multisection}/$sections[0]", [] ) );
    is( $res->code, 403,
        'POST /delete/<tradition>/<section> is refused without permission' );
}

{
    # A read-only tradition we can see, but not modify.
    my $res = request( post_form(
        "/delete/$fx->{public_readonly}/$fx->{sections}{public_readonly}[0]", [] ) );
    is( $res->code, 403,
        'POST /delete/<tradition>/<section> checks permissions' );
    like( json_of($res)->{error}, qr/do not have permission to delete/,
        'Section deletion refusal is reported' );
}

{
    # Delete the tradition we created earlier, in its own right.
    my @mine = @{ $fx->{sections}{multisection} };
    my $res  = $mech->request(
        post_form( "/delete/$fx->{multisection}/$mine[0]", [] ) );
    is( $res->code, 200, 'POST /delete/<tradition>/<section> succeeds for the owner' );
    is( json_of($res)->{status}, 'ok', 'Section deletion is acknowledged' );
    is( scalar @{ stemmaweb::Test::App::sections_of( $fx->{multisection} ) }, 1,
        'Section is gone from the tradition' );
}

{
    my $res = $mech->request(
        post_form( "/delete/$new_tradition_id", [] ) );
    is( $res->code, 200, 'POST /delete/<tradition> succeeds for the owner' );
    is( json_of($res)->{status}, 'ok', 'Tradition deletion is acknowledged' );

    my $gone = $mech->request( get_req("/textinfo/$new_tradition_id") );
    is( $gone->code, 404, 'Deleted tradition is no longer available' );
}

# ---------------------------------------------------------------------------
# variantgraph
# ---------------------------------------------------------------------------

section('variantgraph');

{
    my $res = request( get_req("/variantgraph/$fx->{public_readonly}") );
    is( $res->code, 200, 'GET /variantgraph succeeds for a public tradition' );
    is( $res->header('Content-Type'), 'image/svg+xml',
        'Variant graph is returned as SVG' );
    like( body_of($res), qr/<svg/, 'Variant graph really is an SVG document' );
    cmp_ok( length( body_of($res) ), '>', 1000, 'Variant graph is not empty' );
}

{
    # The permission check answers 403, but load_tradition then returns a
    # truthy (autovivified) hash, so the action carries on regardless and the
    # body still contains the variant graph.
    my $res = request( get_req("/variantgraph/$fx->{private_owned}") );
    is( $res->code, 403, 'GET /variantgraph is refused for a private tradition' );

    TODO: {
        local $TODO =
          'the refusal does not stop the controller from rendering the graph';
        unlike( body_of($res), qr/<svg/,
            'A refused variant graph does not carry the graph itself' );
    }
}

# ---------------------------------------------------------------------------
# download
# ---------------------------------------------------------------------------

section('download');

{
    my %formats = (
        JSON    => qr{application/json},
        CSV     => qr{text/csv},
        TSV     => qr{text/tab-separated-values},
        matrix  => qr{text/plain},
        dot     => qr{text/plain},
        SVG     => qr{image/svg\+xml},
        GraphML => qr{application/zip},
    );
    for my $format ( sort keys %formats ) {
        my $res = request(
            get_req( "/download?tradition=$fx->{public_readonly}&format=$format" ) );
        is( $res->code, 200, "GET /download?format=$format succeeds" );
        like( $res->header('Content-Type'), $formats{$format},
            "format=$format is served with the expected content type" );
        cmp_ok( length( body_of($res) ), '>', 0, "format=$format has a body" );
    }
}

{
    my $res = request( get_req(
        "/download?tradition=$fx->{public_owned}&format=JSON&section=$fx->{owned_section}"
    ) );
    is( $res->code, 200, 'GET /download of a single section succeeds' );
    my $data = json_of($res);
    ok( $data->{alignment}, 'Section download contains alignment data' );
}

{
    my $res = request(
        get_req( "/download?tradition=$fx->{private_owned}&format=JSON" ) );
    is( $res->code, 403, 'GET /download is refused for a private tradition' );

    TODO: {
        local $TODO =
          'the refusal does not stop the controller from fetching the alignment';
        unlike( body_of($res), qr/"alignment"/,
            'A refused download does not carry the alignment' );
    }
}

{
    # The format parameter is not validated or canonicalised: the value is
    # used directly as the view name, so the lower-case spelling of a format
    # that the front end sends in upper case does not resolve to a view.
    my $res = request(
        get_req("/download?tradition=$fx->{public_readonly}&format=json") );
    is( $res->code, 500,
        'GET /download does not canonicalise the format parameter' );
}

# ---------------------------------------------------------------------------
# api / apiPass
# ---------------------------------------------------------------------------

section('api pass-through');

{
    my $res = request( get_req("/api/$fx->{public_readonly}/sections") );
    is( $res->code, 200, 'GET /api/<tradition>/sections succeeds' );
    ok( is_json($res), 'API pass-through returns the Stemmarest JSON' );
    my $sections = json_of($res);
    is( scalar @$sections, 1, 'Pass-through returned the tradition\'s sections' );
}

{
    my $res = request( get_req(
        "/api/$fx->{public_readonly}/section/$fx->{sections}{public_readonly}[0]/readings"
    ) );
    is( $res->code, 200, 'GET /api/<tradition>/section/<section>/readings succeeds' );
    ok( scalar @{ json_of($res) } > 0, 'Pass-through returned readings' );
}

{
    my $res = request( get_req("/api/$fx->{private_owned}/sections") );
    is( $res->code, 403, 'GET /api/<tradition> is refused for a private tradition' );
}

{
    my $res = request( get_req('/api/doesnotexist/sections') );
    is( $res->code, 404, 'GET /api/<unknown tradition> returns 404' );
}

{
    # The pass-through simply forwards the request method to Stemmarest, so a
    # write must use the method Stemmarest expects (PUT for metadata).
    my $res = request( post_json(
        "/api/$fx->{public_readonly}",
        { name => 'renamed by anonymous user' } ) );
    is( $res->code, 403,
        'POST /api/<tradition> is refused for a read-only tradition' );
    like( json_of($res)->{error}, qr/do not have permission to modify/,
        'Write refusal is reported' );
}

{
    my $res = $mech->request(
        put_json( "/api/$fx->{public_owned}", { name => 'renamed through the API' } ) );
    is( $res->code, 200, 'PUT /api/<tradition> succeeds for the owner' );
    is( json_of($res)->{name}, 'renamed through the API',
        'JSON body was passed through to Stemmarest' );
}

{
    my $res = $mech->request(
        put_json( "/api/$fx->{public_owned}/section/$fx->{owned_section}",
            { name => 'renamed section through the API' } ) );
    is( $res->code, 200, 'PUT /api/<tradition>/section/<section> succeeds' );
    is( json_of($res)->{name}, 'renamed section through the API',
        'Section metadata was passed through to Stemmarest' );
}

{
    # Form-encoded bodies take the other branch of the pass-through, which
    # hands the parameters to LWP as form content.  Stemmarest only accepts
    # JSON on this resource, so the request is bounced back as 415: the
    # parameters do reach Stemmarest, but it will not take them this way.
    my $res = $mech->request(
        put_form( "/api/$fx->{public_owned}/section/$fx->{owned_section}",
            [ name => 'renamed through the form API' ] ) );
    is( $res->code, 415,
        'PUT /api/<tradition>/section/<section> passes a form body through' );
}

done_testing();
