#!/usr/bin/env perl
#
# Tests for stemmaweb::Controller::Relation.
#
# The relationship mapper is the largest controller in the application, so the
# tests here are grouped by action.  Read-only behaviour is checked first on
# the public fixture tradition; the tests that change readings are grouped at
# the end, and the permission failures are checked against the read-only
# tradition so that they cannot disturb the data the other tests rely on.
#
# Expectations record the behaviour of the application as it stands.

use strict;
use warnings;

use FindBin;
use lib ("$FindBin::Bin/lib");

use HTTP::Request::Common qw/ GET POST PUT DELETE /;
use Test::More;

use stemmaweb::Test::App qw/
  section
  new_fixtures
  body_of
  json_of
  is_json
  login_mech
  mech
  get_req
  post_form
  put_form
  delete_req
  request
  install_action_log
/;

install_action_log();

my $fx = new_fixtures();

my $anon   = mech( follow => 0 );
my $mech   = login_mech( follow => 0 );
my $ownsec = "/relation/$fx->{public_owned}/$fx->{owned_section}";
my $rose   = "/relation/$fx->{public_readonly}/$fx->{sections}{public_readonly}[0]";
my $prsec  = "/relation/$fx->{private_owned}/$fx->{sections}{private_owned}[0]";

my $model = stemmaweb->model('Directory');

# Readings of a section, keyed on reading ID, sorted by rank.
sub readings_of {
    my ($sec) = @_;
    my $rdgs = json_of( $mech->request( get_req("$sec/readings") ) );
    return ( $rdgs, [ sort { $rdgs->{$a}{rank} <=> $rdgs->{$b}{rank} } keys %$rdgs ] );
}

my ( $rdgs, $ids ) = readings_of($ownsec);
my @real = grep { $rdgs->{$_}{text} !~ /^#/ } @$ids;
BAIL_OUT('Fixture section has no readings to work with') unless @real;

# Two variants of the same rank, so that they can be related to one another.
my %byrank;
push( @{ $byrank{ $rdgs->{$_}{rank} } }, $_ ) for @real;
my ($variant_rank) = grep { scalar @{ $byrank{$_} } > 1 && $_ > 0 }
  sort { $a <=> $b } keys %byrank;
BAIL_OUT('Fixture section has no two variants at the same rank')
  unless defined $variant_rank;
my ( $ra, $rb ) = @{ $byrank{$variant_rank} }[ 0, 1 ];

# ---------------------------------------------------------------------------
# text / firstsection / section / main
# ---------------------------------------------------------------------------

section('/relation/<tradition>');

{
    my $res = $anon->get("/relation/$fx->{public_owned}");
    is( $res->code, 302, 'GET /relation/<tradition> redirects to the first section' );
    my $location = $res->header('Location') || '';
    like( $location, qr{/relation/\Q$fx->{public_owned}\E/\d+},
        'Redirect points at the first section of the tradition' );
}

{
    my $res = $anon->get("/relation/$fx->{private_owned}");
    is( $res->code, 403,
        'GET /relation/<private tradition> is refused without a session' );
    like( json_of($res)->{error}, qr/do not have permission to view/,
        'Permission error is reported' );
}

{
    my $res = $anon->get('/relation/nosucht tradition');
    is( $res->code, 404, 'GET /relation/<unknown tradition> returns 404' );
}

section('/relation/<tradition>/<section>');

{
    my $res = request( get_req($rose) );
    is( $res->code, 200, 'GET /relation/<tradition>/<section> loads the viewer' );
    like( $res->header('Content-Type'), qr{text/html},
        'Viewer is served as HTML' );
    like( body_of($res), qr/"readonly" === "full"/,
        'Viewer is in read-only mode for a public tradition' );
}

{
    my $res = $mech->get($prsec);
    is( $res->code, 200, 'The owner can load the viewer for their own tradition' );
    like( body_of($res), qr/"full" === "full"/,
        'Viewer is in editing mode for the owner' );
}

{
    my $res = $mech->get("/relation/$fx->{public_owned}/doesnotexist");
    ok( $res->code >= 400, 'GET /relation/<tradition>/<unknown section> fails' );
}

{
    my $res = $mech->request( post_form( $ownsec, [] ) );
    is( $res->code, 405, 'POST to the viewer is refused' );
    like( json_of($res)->{error}, qr/Use GET instead/, 'Method error is reported' );
}

# ---------------------------------------------------------------------------
# get_graph
# ---------------------------------------------------------------------------

section('get_graph');

{
    my $res = $mech->request( get_req("$ownsec/get_graph") );
    is( $res->code, 200, 'GET .../get_graph succeeds' );
    is( $res->header('Content-Type'), 'image/svg+xml',
        'Variant graph is served as SVG by default' );
    like( body_of($res), qr/<svg/, 'Returned graph is an SVG document' );
}

{
    my $res = $mech->request( get_req("$ownsec/get_graph?type=Plain") );
    is( $res->code, 200, 'GET .../get_graph accepts a type parameter' );
    like( $res->header('Content-Type'), qr{text/plain},
        'The requested view is used' );
}

{
    my $res = $anon->get(
        "/relation/$fx->{private_owned}/$fx->{sections}{private_owned}[0]/get_graph" );
    is( $res->code, 403, 'get_graph is refused for a private tradition' );

    # The tradition capture action detaches when the permission check fails, so
    # unlike some of the other endpoints this one really does stop.
    unlike( body_of($res), qr/<svg/,
        'A refused graph does not carry the graph itself' );
}

# ---------------------------------------------------------------------------
# help
# ---------------------------------------------------------------------------

section('help');

{
    my $res = request( get_req("/relation/$fx->{public_owned}/help") );
    is( $res->code, 200, 'GET /relation/<tradition>/help succeeds' );
    like( $res->header('Content-Type'), qr{text/html},
        'Help window is served as HTML' );
}

{
    my $res = request( get_req("/relation/$fx->{private_owned}/help") );
    is( $res->code, 403, 'help is refused for a private tradition' );
}

# ---------------------------------------------------------------------------
# metadata
# ---------------------------------------------------------------------------

section('metadata');

{
    my $res = request( get_req("$ownsec/metadata") );
    is( $res->code, 200, 'GET .../metadata succeeds' );
    my $info = json_of($res);
    is( $info->{id}, $fx->{owned_section}, 'Metadata is for the requested section' );
    ok( $info->{witnesses}, 'Metadata includes the witnesses' );
}

{
    my $res = request( get_req("$prsec/metadata") );
    is( $res->code, 403, 'GET .../metadata is refused for a private tradition' );
}

{
    my $res = $mech->request(
        post_form( "$ownsec/metadata", [ name => 'renamed by the mapper' ] ) );
    is( $res->code, 200, 'POST .../metadata succeeds for the owner' );
    is( json_of($res)->{name}, 'renamed by the mapper', 'Section was renamed' );
}

{
    my $res = $mech->request(
        put_form( "$ownsec/metadata", [ name => 'not allowed' ] ) );
    is( $res->code, 403, 'PUT .../metadata is rejected as a method' );
    like( json_of($res)->{error}, qr/Use POST or GET/, 'Method error is reported' );

    # ...and the section is untouched.
    my $info = json_of( $mech->request( get_req("$ownsec/metadata") ) );
    is( $info->{name}, 'renamed by the mapper',
        'The rejected method did not rename the section' );
}

{
    my $res = $anon->request(
        post_form( "$rose/metadata", [ name => 'renamed by anonymous user' ] ) );
    is( $res->code, 403,
        'POST .../metadata is refused for a read-only tradition' );
    is( json_of($res)->{error},
        'You do not have permission to modify this tradition.',
        'Permission error is reported' );
}

# ---------------------------------------------------------------------------
# download
# ---------------------------------------------------------------------------

section('download');

{
    my $res = request( get_req("$ownsec/download?format=JSON") );
    is( $res->code, 200, 'GET .../download succeeds' );
    ok( is_json($res), 'Section download is served as JSON' );
    my $data = json_of($res);
    ok( $data->{alignment}, 'Section download contains alignment data' );
}

{
    my $res = request( get_req("$rose/download?format=TSV") );
    is( $res->code, 200, 'A public section can be downloaded anonymously' );
    is( $res->header('Content-Type'), 'text/tab-separated-values',
        'TSV is served with the TSV content type' );
}

{
    my $res = request( get_req("$prsec/download?format=JSON") );
    is( $res->code, 403, 'Section download is refused for a private tradition' );
    unlike( body_of($res), qr/"alignment"/,
        'The refusal does not carry the alignment' );
}

# ---------------------------------------------------------------------------
# readings
# ---------------------------------------------------------------------------

section('readings');

{
    my $res = request( get_req("$ownsec/readings") );
    is( $res->code, 200, 'GET .../readings succeeds' );
    my $data = json_of($res);
    is( scalar keys %$data, scalar @$ids,
        'Every reading of the section is returned' );
    my ($sample) = values %$data;
    ok( $sample->{id}, 'A reading has an ID' );
    ok( defined $sample->{rank}, 'A reading has a rank' );
    ok( ref $sample->{witnesses} eq 'ARRAY', 'A reading has witnesses' );
    my ($start) = grep { $data->{$_}{text} eq '#START#' } keys %$data;
    ok( $start, 'The start marker is present among the readings' );
}

{
    my $res = request( get_req("$prsec/readings") );
    is( $res->code, 403, 'GET .../readings is refused for a private tradition' );
    unlike( body_of($res), qr/#START#/,
        'The refusal does not carry the readings' );
}

{
    my $res = $mech->request( put_form( "$ownsec/readings", [] ) );
    is( $res->code, 405, 'PUT .../readings is a disallowed method' );
    like( json_of($res)->{error}, qr/Use GET instead/, 'Method error is reported' );
}

# ---------------------------------------------------------------------------
# reading
# ---------------------------------------------------------------------------

section('reading');

my $reading_id = $real[0];
{
    my $res = request( get_req("$ownsec/reading/$reading_id") );
    is( $res->code, 200, 'GET .../reading/<id> succeeds' );
    my $rdg = json_of($res);
    is( $rdg->{id}, $reading_id, 'The requested reading comes back' );
    ok( defined $rdg->{text}, 'The reading has text' );
}

{
    # Stemmarest answers a node ID that is not a number with a server error,
    # which the controller passes straight through.
    my $res = request( get_req("$ownsec/reading/doesnotexist") );
    is( $res->code, 500, 'GET .../reading/<unknown> reports the backend error' );
}

{
    my $res = $mech->request( post_form( "$ownsec/reading/$reading_id",
        [ normal_form => 'probe normal form', grammar_invalid => 'true' ] ) );
    is( $res->code, 200, 'POST .../reading/<id> succeeds for the owner' );
    my $data = json_of($res);
    ok( ref $data->{readings} eq 'ARRAY', 'The changed readings are returned' );
    my ($rdg) = grep { $_->{id} eq $reading_id } @{ $data->{readings} };
    ok( $rdg, 'The changed reading is in the response' );
    ok( $rdg->{grammar_invalid}, 'The boolean property was stored as a boolean' );
}

{
    my $res = $mech->request( post_form( "$ownsec/reading/$reading_id",
        [ is_lemma => 'true' ] ) );
    is( $res->code, 200, 'POST .../reading/<id> can set is_lemma' );
    my $data = json_of($res);
    ok( scalar @{ $data->{readings} }, 'The lemma change is reported' );
}

{
    my $res = $mech->request( put_form( "$ownsec/reading/$reading_id", [] ) );
    is( $res->code, 405, 'PUT .../reading/<id> is a disallowed method' );
    like( json_of($res)->{error}, qr/You can GET or POST/, 'Method error is reported' );
}

# ---------------------------------------------------------------------------
# lemmatext
# ---------------------------------------------------------------------------

section('lemmatext');

{
    my $res = request( get_req("$ownsec/lemmatext") );
    is( $res->code, 200, 'GET .../lemmatext succeeds' );
    my $data = json_of($res);
    ok( defined $data->{text}, 'Lemmatised text is returned in a text key' );
}

{
    my $res = request( get_req("$prsec/lemmatext") );
    is( $res->code, 403, 'GET .../lemmatext is refused for a private tradition' );
}

{
    my $res = $mech->request( post_form( "$ownsec/lemmatext", [] ) );
    is( $res->code, 405, 'POST .../lemmatext is a disallowed method' );
    like( json_of($res)->{error}, qr/Use GET instead/, 'Method error is reported' );
}

# ---------------------------------------------------------------------------
# witnesstext
# ---------------------------------------------------------------------------

section('witnesstext');

my $witness = $fx->{witnesses}{public_owned}[0];
ok( $witness, 'Fixture tradition has witnesses' );

{
    my $res = request( get_req("$ownsec/witnesstext/$witness") );
    is( $res->code, 200, 'GET .../witnesstext/<sigil> succeeds' );
    my $data = json_of($res);
    ok( $data->{text}, 'The witness text is returned' );
}

{
    my $res = request( get_req("$ownsec/witnesstext/$witness?layer=1") );
    is( $res->code, 200, 'GET .../witnesstext/<sigil> with a layer succeeds' );
}

{
    my $res = request( get_req("$prsec/witnesstext/$witness") );
    is( $res->code, 403, 'GET .../witnesstext is refused for a private tradition' );
}

{
    my $res = $mech->request( post_form( "$ownsec/witnesstext/$witness", [] ) );
    is( $res->code, 405, 'POST .../witnesstext is a disallowed method' );
    like( json_of($res)->{error}, qr/Use GET instead/, 'Method error is reported' );
}

# ---------------------------------------------------------------------------
# relationships - reading
# ---------------------------------------------------------------------------

section('relationships (GET)');

{
    my $res = request( get_req("$ownsec/relationships") );
    is( $res->code, 200, 'GET .../relationships succeeds' );
    my $rels = json_of($res);
    ok( ref $rels eq 'ARRAY', 'Relationships are returned as a list' );
    ok( scalar @$rels, 'The fixture tradition has relationships' );
    my ($rel) = @$rels;
    ok( $rel->{source} && $rel->{target}, 'A relationship has a source and target' );
    ok( $rel->{type}, 'A relationship has a type' );
}

{
    my $res = request( get_req("$prsec/relationships") );
    is( $res->code, 403, 'GET .../relationships is refused for a private tradition' );
}

{
    my $res = $mech->request( put_form( "$ownsec/relationships", [] ) );
    is( $res->code, 405, 'PUT .../relationships is a disallowed method' );
    like( json_of($res)->{error}, qr/You can GET, POST, or DELETE/,
        'Method error is reported' );
}

# ---------------------------------------------------------------------------
# relationships - writing
# ---------------------------------------------------------------------------

section('relationships (POST and DELETE)');

{
    my $res = $mech->request( post_form( "$ownsec/relationships",
        [ source => $ra, target => $rb, type => 'spelling', scope => 'local' ] ) );
    is( $res->code, 200, 'POST .../relationships creates a relationship' );
    my $data = json_of($res);
    is( $data->{status}, 'ok', 'Relationship creation is acknowledged' );
    ok( ref $data->{relationships} eq 'ARRAY', 'Created relationships are returned' );
    my ($created) =
      grep { $_->{source} eq $ra && $_->{target} eq $rb }
      @{ $data->{relationships} };
    ok( $created, 'The requested relationship was created' );
    is( $created->{type}, 'spelling', 'The relationship has the requested type' );
}

{
    my $res = $mech->request(
        delete_req( "$ownsec/relationships", form => [ source_id => $ra, target_id => $rb ] ) );
    is( $res->code, 200, 'DELETE .../relationships removes a relationship' );
    my $data = json_of($res);
    my ($pair) = grep { $_->[0] eq $ra && $_->[1] eq $rb } @{ $data->{relationships} };
    ok( $pair, 'The removed relationship is reported as a source/target tuple' );

    my $again = $mech->request(
        delete_req( "$ownsec/relationships", form => [ source_id => $ra, target_id => $rb ] ) );
    is( $again->code, 404, 'Deleting the same relationship twice is a 404' );
}

{
    # Deleting by reading removes every relationship that touches it.
    $mech->request( post_form( "$ownsec/relationships",
        [ source => $ra, target => $rb, type => 'spelling', scope => 'local' ] ) );
    my $res = $mech->request(
        delete_req( "$ownsec/relationships", form => [ from_reading => $ra ] ) );
    is( $res->code, 200, 'DELETE .../relationships by reading succeeds' );
    my $data = json_of($res);
    ok( ref $data->{relationships} eq 'ARRAY',
        'Removed relationships are returned as a list' );
}

{
    # The "delete all" variant asks for a document-wide scope, which Stemmarest
    # does not accept.
    $mech->request( post_form( "$ownsec/relationships",
        [ source => $ra, target => $rb, type => 'spelling', scope => 'local' ] ) );
    my $res = $mech->request( delete_req( "$ownsec/relationships",
        form => [ source_id => $ra, target_id => $rb, scopewide => 'true' ] ) );
    is( $res->code, 400,
        'DELETE .../relationships with scopewide is rejected by Stemmarest' );

    # Tidy up so that the relationship does not affect the tests below.
    $mech->request(
        delete_req( "$ownsec/relationships", form => [ from_reading => $ra ] ) );
}

# ---------------------------------------------------------------------------
# relationtype
# ---------------------------------------------------------------------------

section('relationtype');

{
    # The action only accepts PUT and DELETE, and it checks permissions before
    # it checks the method, so a read-only caller is refused first.
    my $res = request( get_req("$rose/relationtype/spelling") );
    is( $res->code, 403,
        'GET .../relationtype/<name> is refused without permission' );

    my $asowner = $mech->request( get_req("$ownsec/relationtype/spelling") );
    is( $asowner->code, 405, 'GET .../relationtype/<name> is a disallowed method' );
    like( json_of($asowner)->{error}, qr/Accepted methods are PUT and DELETE/,
        'Method error is reported' );
}

{
    my $res = $mech->request( put_form( "$ownsec/relationtype/probe-type",
        [ name => 'probe-type', description => 'probe', bindlevel => 1, is_weak => 'on' ] ) );
    is( $res->code, 200, 'PUT .../relationtype/<name> creates a relation type' );
    my $type = json_of($res);
    is( $type->{name}, 'probe-type', 'The relation type has the requested name' );
    ok( $type->{is_weak}, 'Tick-box values are sent as JSON true' );
}

{
    my $res = $mech->request(
        delete_req("$ownsec/relationtype/probe-type") );
    is( $res->code, 200, 'DELETE .../relationtype/<name> removes a relation type' );
}

# ---------------------------------------------------------------------------
# copynormal
# ---------------------------------------------------------------------------

section('copynormal');

{
    my $res = $mech->request( post_form( "$ownsec/copynormal/$ra/spelling", [] ) );
    is( $res->code, 200, 'POST .../copynormal/<reading>/<type> succeeds' );
    ok( ref json_of($res) eq 'ARRAY', 'Changed readings are returned as a list' );
}

{
    my $res = $mech->request( get_req("$ownsec/copynormal/$ra/spelling") );
    is( $res->code, 405, 'GET .../copynormal is a disallowed method' );
    like( json_of($res)->{error}, qr/Use POST instead/, 'Method error is reported' );
}

{
    my $res = $anon->request( post_form( "$rose/copynormal/$ra/spelling", [] ) );
    is( $res->code, 403, 'copynormal is refused for a read-only tradition' );
}

# ---------------------------------------------------------------------------
# Refused writes
#
# A caller who may only read a tradition must be refused, and the refusal must
# leave the data alone.  The status alone is not enough: these actions used to
# answer 403 and then do the work anyway.
# ---------------------------------------------------------------------------

section('refused writes');

{
    my ( $before, $beforeids ) = readings_of($rose);
    my @readable = grep { $before->{$_}{text} !~ /^#/ } @$beforeids;
    my ( $target, $other ) = @readable[ 0, 1 ];
    my @adjacent = @readable[ 0 .. 2 ];
    my $rwith    = $fx->{witnesses}{public_readonly}[0];
    ok( $target && $other, 'Found readings in the read-only tradition to aim at' );

    my @reltypes_before = map { $_->{name} }
      @{ $model->ajax( 'get', "/tradition/$fx->{public_readonly}/relationtypes" ) };

    my @attempts = (
        [ 'change a reading',
          post_form( "$rose/reading/$target", [ text => 'refused write' ] ) ],
        [ 'compress readings',
          post_form( "$rose/compress", [ 'readings[]' => \@adjacent ] ) ],
        [ 'merge readings',
          post_form( "$rose/merge",
              [ source => $other, target => $target, single => 1 ] ) ],
        [ 'duplicate a reading',
          post_form( "$rose/duplicate",
              [ 'readings[]' => $target, 'witnesses[]' => $rwith ] ) ],
        [ 'split a reading',
          post_form( "$rose/split",
              [ reading => $target, rtext => $before->{$target}{text}, index => 1 ] ) ],
        [ 'add an emendation',
          post_form( "$rose/emend",
              [ fromRank => 1, toRank => 2, text => 'refused', authority => 'probe' ] ) ],
        [ 'create a relation type',
          put_form( "$rose/relationtype/refused-type", [ name => 'refused-type' ] ) ],
        [ 'create a relationship',
          post_form( "$rose/relationships",
              [ source => $target, target => $other, type => 'spelling', scope => 'local' ] ) ],
        [ 'delete relationships',
          delete_req( "$rose/relationships",
              form => [ source_id => $target, target_id => $other ] ) ],
    );

    for my $attempt (@attempts) {
        my ( $label, $req ) = @$attempt;
        my $res = $anon->request($req);
        is( $res->code, 403, "A read-only caller cannot $label" );
    }

    my ( $after, $afterids ) = readings_of($rose);
    is( scalar @$afterids, scalar @$beforeids,
        'The refused writes added and removed no readings' );
    is( $after->{$target}{text}, $before->{$target}{text},
        'The refused writes left the reading text alone' );
    is( $after->{$target}{normal_form}, $before->{$target}{normal_form},
        'The refused writes left the reading metadata alone' );

    my @reltypes_after = map { $_->{name} }
      @{ $model->ajax( 'get', "/tradition/$fx->{public_readonly}/relationtypes" ) };
    is_deeply( [ sort @reltypes_after ], [ sort @reltypes_before ],
        'The refused write created no relation type' );
}

# ---------------------------------------------------------------------------
# merge
#
# The structural changes below all rearrange readings, so they run last, and
# each of them re-reads the section before choosing what to work on.
# ---------------------------------------------------------------------------

section('merge');

{
    my ( $now, $nowids ) = readings_of($ownsec);
    my %rank;
    push( @{ $rank{ $now->{$_}{rank} } }, $_ )
      for grep { $now->{$_}{text} !~ /^#/ } @$nowids;
    my ($r) = grep { scalar @{ $rank{$_} } > 1 } sort { $a <=> $b } keys %rank;
    ok( defined $r, 'Found two readings at the same rank to merge' );

    my ( $main, $second ) = @{ $rank{$r} }[ 0, 1 ];
    my $res = $mech->request( post_form( "$ownsec/merge",
        [ source => $second, target => $main, single => 1 ] ) );
    is( $res->code, 200, 'POST .../merge succeeds' );
    my $data = json_of($res);
    is( $data->{status}, 'ok', 'Merge is acknowledged' );
    ok( ref $data->{readings} eq 'ARRAY', 'The merged reading is returned' );
    ok( defined $data->{sequences}, 'The affected sequences are reported' );
}

{
    # An unknown reading is refused, and the error is what comes back: the
    # action stops rather than overwriting it with an empty success.
    my $res = $mech->request(
        post_form( "$ownsec/merge", [ source => '99999999', target => '99999999' ] ) );
    is( $res->code, 404, 'Merging an unknown reading is refused by Stemmarest' );
    my $error = eval { json_of($res)->{error} };
    ok( $error, 'The refusal is reported rather than replaced by a success' );
}

{
    my $res = $mech->request( get_req("$ownsec/merge") );
    is( $res->code, 405, 'GET .../merge is a disallowed method' );
    like( json_of($res)->{error}, qr/Use POST instead/, 'Method error is reported' );
}

# ---------------------------------------------------------------------------
# compress
# ---------------------------------------------------------------------------

section('compress');

{
    my ( $now, $nowids ) = readings_of($ownsec);
    my @creal    = grep { $now->{$_}{text} !~ /^#/ } @$nowids;
    my @adjacent = @creal[ 0 .. 2 ];
    is( scalar @adjacent, 3, 'Found three adjacent readings to compress' );

    my $res = $mech->request(
        post_form( "$ownsec/compress", [ 'readings[]' => \@adjacent ] ) );
    is( $res->code, 200, 'POST .../compress succeeds' );
    my $data = json_of($res);
    ok( ref $data->{merged} eq 'ARRAY', 'The merged readings are reported' );
    is( scalar @{ $data->{merged} }, scalar @adjacent,
        'All requested readings were merged' );
    my ($merged) = @{ $data->{readings} };
    ok( $merged->{text}, 'The concatenated reading is returned' );
}

{
    # No input validation: with no readings at all the action still answers 200.
    my $res = $mech->request( post_form( "$ownsec/compress", [] ) );
    is( $res->code, 200, 'POST .../compress without readings is not rejected' );
}

{
    my $res = $mech->request( get_req("$ownsec/compress") );
    is( $res->code, 405, 'GET .../compress is a disallowed method' );
    like( json_of($res)->{error}, qr/Use POST instead/, 'Method error is reported' );
}

# ---------------------------------------------------------------------------
# duplicate
# ---------------------------------------------------------------------------

section('duplicate');

{
    my ( $now, $nowids ) = readings_of($ownsec);
    my ($target) =
      grep { $now->{$_}{text} !~ /^#/ && @{ $now->{$_}{witnesses} || [] } } @$nowids;
    ok( $target, 'Found a reading with a witness to detach' );
    my $detach = $now->{$target}{witnesses}[0];

    my $res = $mech->request( post_form( "$ownsec/duplicate",
        [ 'readings[]' => $target, 'witnesses[]' => $detach ] ) );
    is( $res->code, 200, 'POST .../duplicate succeeds' );
    my $data = json_of($res);
    ok( exists $data->{DELETED}, 'Response lists the deleted relationships' );
    ok( ref $data->{DELETED} eq 'ARRAY', 'Deleted relationships are a list' );
    my @new = grep { $_ ne 'DELETED' } keys %$data;
    ok( scalar @new, 'Response contains the reading(s) that were created' );
    my ($newrdg) = map { $data->{$_} } @new;
    is( $newrdg->{orig_reading}, $target, 'The new reading records its origin' );
    ok( ( grep { $_ eq $detach } @{ $newrdg->{witnesses} } ),
        'The detached witness is attached to the new reading' );

    my ( $now2, $nowids2 ) = readings_of($ownsec);
    ok( !( grep { $_ eq $detach } @{ $now2->{$target}{witnesses} } ),
        'The detached witness is no longer on the original reading' );
}

{
    my $res = $mech->request( get_req("$ownsec/duplicate") );
    is( $res->code, 405, 'GET .../duplicate is a disallowed method' );
    like( json_of($res)->{error}, qr/Use POST instead/, 'Method error is reported' );
}

# ---------------------------------------------------------------------------
# split
# ---------------------------------------------------------------------------

section('split');

{
    my ( $now, $nowids ) = readings_of($ownsec);
    my ($long) =
      grep { length( $now->{$_}{text} ) > 5 && $now->{$_}{text} !~ /\s/ } @$nowids;
    ok( $long, 'Found a reading long enough to split' );

    my $text = $now->{$long}{text};
    my $res  = $mech->request( post_form( "$ownsec/split",
        [ reading => $long, rtext => $text, index => 3 ] ) );
    is( $res->code, 200, 'POST .../split splits a reading' );
    my $data = json_of($res);
    ok( ref $data->{relationships} eq 'ARRAY',
        'Response contains the new relationships' );
    my @new = grep { $_ ne 'relationships' } keys %$data;
    ok( scalar @new >= 2, 'Response contains the two halves of the reading' );
    my @texts = sort map { $data->{$_}{text} } @new;
    is( join( '', @texts ), $text, 'The two halves join back into the original' );
}

{
    my ( $now, $nowids ) = readings_of($ownsec);
    my ($multi) =
      grep { $now->{$_}{text} =~ /\s/ && $now->{$_}{text} !~ /^#/ } @$nowids;
    ok( $multi, 'Found a multi-word reading' );

    # With separate=on the pieces are rejoined with a space, so a trailing
    # space in the claimed text means the split is not zero-length.
    my $res = $mech->request( post_form( "$ownsec/split",
        [ reading => $multi, rtext => $now->{$multi}{text} . ' ', separate => 'on' ] ) );
    is( $res->code, 400,
        'POST .../split rejects a regular expression that is not zero-length' );
    like( json_of($res)->{error}, qr/must be zero-length/, 'The reason is reported' );

    # ...and the reading was not split.
    my ( $now2, $nowids2 ) = readings_of($ownsec);
    is( scalar @$nowids2, scalar @$nowids,
        'The rejected split did not add a reading' );
}

{
    my $res = $mech->request( get_req("$ownsec/split") );
    is( $res->code, 405, 'GET .../split is a disallowed method' );
    like( json_of($res)->{error}, qr/Use POST instead/, 'Method error is reported' );
}

# ---------------------------------------------------------------------------
# emendations / emend
# ---------------------------------------------------------------------------

section('emendations and emend');

{
    my $res = request( get_req("$ownsec/emendations") );
    is( $res->code, 200, 'GET .../emendations succeeds' );
    my $data = json_of($res);
    ok( exists $data->{readings}, 'Response has a readings key' );
    ok( exists $data->{sequences}, 'Response has a sequences key' );
}

{
    my $res = $mech->request( post_form( "$ownsec/emendations", [] ) );
    is( $res->code, 405, 'POST .../emendations is a disallowed method' );
    like( json_of($res)->{error}, qr/Use GET instead/, 'Method error is reported' );
}

{
    my $res = $mech->request( get_req("$ownsec/emend") );
    is( $res->code, 405, 'GET .../emend is a disallowed method' );
    like( json_of($res)->{error}, qr/Use POST instead/, 'Method error is reported' );
}

{
    my $res = $anon->request( post_form( "$prsec/emend",
        [ fromRank => 3, toRank => 5, text => 'not allowed', authority => 'probe' ] ) );
    is( $res->code, 403, 'POST .../emend is refused for a private tradition' );
}

{
    my $res = $mech->request( post_form( "$ownsec/emend",
        [ fromRank => 3, toRank => 5, text => 'probe emendation', authority => 'probe' ] ) );
    is( $res->code, 200, 'POST .../emend adds an emendation' );
    my $data = json_of($res);
    ok( ref $data->{readings} eq 'ARRAY' && scalar @{ $data->{readings} },
        'The new reading is returned' );
    ok( ref $data->{sequences} eq 'ARRAY', 'The new sequences are returned' );
    my ($new) =
      grep { ( $_->{text} // '' ) eq 'probe emendation' } @{ $data->{readings} };
    ok( $new, 'The emendation has the requested text' );
    ok( $new->{is_emendation}, 'The new reading is marked as an emendation' );
}

done_testing();
