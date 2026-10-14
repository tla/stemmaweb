package stemmaweb::Test::App;

# Shared harness for the controller tests.
#
# The controller tests are integration tests: they drive the Catalyst
# application in-process (via L<Catalyst::Test>) while the application itself
# talks to a real Stemmarest backend.  The supported way to get such a backend
# is the development Docker stack:
#
#   docker compose -f docker-compose.dev.yml up -d
#   script/run_tests.sh
#
# This module provides:
#
# * C<new_fixtures> - wipe and recreate the standard test data via
#   L<stemmaweb::Test::DB>, and return a hash of *named* tradition / section /
#   stemma IDs so that tests do not depend on the order in which the fixture
#   traditions happen to be created.
# * C<login_mech> - a L<Test::WWW::Mechanize::Catalyst> with a logged-in
#   session, for the many endpoints that require one.
# * request builders (C<get_req>, C<post_form>, ...) that keep the content of
#   the request in the one place L<HTTP::Request::Common> will actually look
#   for it.
# * C<json_of>, C<body_of> - response body helpers.  Note that several views
#   (CSV, TSV, SVG) set C<Content-Encoding: UTF-8>, which makes
#   C<HTTP::Message::decoded_content> return undef; C<body_of> therefore always
#   returns the raw content.
# * an action-dispatch recorder, so that F<t/controller_Routes.t> can assert
#   that every public action of the controllers really was exercised.

use strict;
use warnings;

use Exporter 'import';

use File::Basename qw/ dirname /;
use File::Spec;
use HTTP::Request;
use HTTP::Request::Common ();
use JSON qw/ decode_json encode_json /;
use Test::More ();
use Test::WWW::Mechanize::Catalyst;
use URI;
use Try::Tiny;

use Catalyst::Test 'stemmaweb';

# .../t/data, resolved from this file's location rather than from the current
# working directory.
our $T_DATA = File::Spec->rel2abs(
    File::Spec->catdir( dirname(__FILE__), '..', '..', '..', 'data' ) );

our @EXPORT_OK = qw/
  section
  new_fixtures
  traditions_by_name
  sections_of
  stemmata_of
  body_of
  json_of
  is_json
  mech
  login_mech
  logout_mech
  get_req
  post_form
  post_multipart
  post_json
  post_raw
  put_form
  put_json
  delete_req
  with_config
  public_actions
  install_action_log
  dispatched_actions
  target_controllers
  request
  ctx_request
/;

our @TARGET_CONTROLLERS = qw/ Root Stemma Stemweb Users Relation Util /;

# Actions that are part of Catalyst's own plumbing rather than the
# application's API.
our %INTERNAL_ACTIONS = map { $_ => 1 } qw/
  _ACTION _AUTO _BEGIN _DISPATCH _END end
/;

# Users of the fixture data.
our $USER  = 'user@example.org';
our $ADMIN = 'admin@example.org';

# ---------------------------------------------------------------------------
# Fixture data
# ---------------------------------------------------------------------------

# Names of the traditions created by stemmaweb::Test::DB::new_db, and the
# access that user@example.org has to each of them.
#
#   private_owned    owned by the test user, not public
#   public_readonly  public, owned by the admin user
#   public_owned     public, owned by the test user
#   public_john      public, owned by the test user, direction BI
#   private_rtl      not public, owned by the test user, direction RL
#   multisection     not public, owned by the test user, two sections
our %FIXTURE_NAMES = (
    private_owned   => 'Notre besoin',
    public_readonly => 'Florilegium',
    public_owned    => 'Sapientia',
    public_john     => 'John verse',
    private_rtl     => 'RTL test',
    multisection    => 'section test',
);

sub target_controllers { return @TARGET_CONTROLLERS }

# A readable divider in the test output.
sub section { Test::More::note("--- $_[0] ---") }

sub _directory_model {
    return stemmaweb->model('Directory');
}

# Return a hashref of all traditions known to Stemmarest, keyed on name.
sub traditions_by_name {
    my $trads = _directory_model()->ajax( 'get', '/traditions' );
    my %by_name = map { $_->{name} => $_ } @$trads;
    return \%by_name;
}

# Return the stemmata that Stemmarest currently holds for a tradition.
sub stemmata_of {
    my ($textid) = @_;
    return _directory_model()->ajax( 'get', "/tradition/$textid/stemmata" );
}

# Return a list of section IDs for the given tradition ID.
sub sections_of {
    my ($textid) = @_;
    my $sections =
      _directory_model()->ajax( 'get', "/tradition/$textid/sections" );
    return [ map { $_->{id} } @$sections ];
}

# Wipe and recreate the fixture traditions, and return a hashref of named IDs:
#
#   $fx->{public_readonly}              tradition ID
#   $fx->{sections}{public_readonly}    arrayref of section IDs     (1)
#   $fx->{sections}{multisection}       arrayref of section IDs     (2)
#   $fx->{witnesses}{public_owned}      arrayref of witness sigla
#   $fx->{stemmata}{private_owned}      arrayref of stemma IDs
#   $fx->{by_name}{'Florilegium'}       raw tradition record from Stemmarest
sub new_fixtures {
    my (%opts) = @_;
    my $datadir = $opts{datadir};
    unless ( defined $datadir ) {
        $datadir = $T_DATA;
    }
    require stemmaweb::Test::DB;
    stemmaweb::Test::DB::new_db($datadir);

    my $by_name = traditions_by_name();
    my $fx      = { by_name => $by_name, user => $USER, admin => $ADMIN };

    foreach my $key ( sort keys %FIXTURE_NAMES ) {
        my $name = $FIXTURE_NAMES{$key};
        my $trad = $by_name->{$name};
        die "Test fixture tradition '$name' was not created\n" unless $trad;
        $fx->{$key}            = $trad->{id};
        $fx->{sections}{$key}  = sections_of( $trad->{id} );
        $fx->{witnesses}{$key} = $trad->{witnesses} || [];
        my $stemmata =
          _directory_model()->ajax( 'get', "/tradition/$trad->{id}/stemmata" );
        $fx->{stemmata}{$key} = [ map { $_->{stemmaid} } @$stemmata ];
    }

    # Convenience: the first section of the tradition we use for the
    # relationship-editing tests.
    $fx->{owned_section} = $fx->{sections}{public_owned}[0];

    return $fx;
}

# ---------------------------------------------------------------------------
# Request builders
#
# L<HTTP::Request::Common> only treats the argument directly after the URL as
# request content; anything after that is taken as header/value pairs.  Putting
# a form arrayref after a header silently produces an empty body, so these
# builders always construct the request the same way.
# ---------------------------------------------------------------------------

sub _encode_form {
    my ($fields) = @_;
    my @pairs = ref $fields eq 'HASH' ? %$fields : @$fields;
    my @flat;
    while (@pairs) {
        my ( $k, $v ) = splice( @pairs, 0, 2 );
        if ( ref $v eq 'ARRAY' ) {
            push( @flat, map { $k => $_ } @$v );
        }
        else {
            push( @flat, $k => $v );
        }
    }
    my $uri = URI->new('http:');
    $uri->query_form(@flat);
    return $uri->query;
}

sub _build {
    my ( $method, $url, %opt ) = @_;
    my @headers;
    my $content;
    if ( exists $opt{form} ) {
        $content = _encode_form( $opt{form} );
        push( @headers, 'Content-Type' => 'application/x-www-form-urlencoded' );
    }
    elsif ( exists $opt{json} ) {
        $content = encode_json( $opt{json} );
        push( @headers, 'Content-Type' => 'application/json' );
    }
    elsif ( exists $opt{body} ) {
        $content = $opt{body};
        push( @headers,
            'Content-Type' => ( $opt{content_type} || 'text/plain' ) );
    }
    push( @headers, 'Accept' => $opt{accept} ) if $opt{accept};
    push( @headers, %{ $opt{headers} || {} } );
    my $req = HTTP::Request->new( $method, $url );
    $req->header( @headers ) if @headers;
    $req->content($content) if defined $content;
    return $req;
}

sub get_req  { my ( $url, %o ) = @_; return _build( 'GET', $url, %o ) }
sub put_form { my ( $url, $f, %o ) = @_; return _build( 'PUT', $url, %o, form => $f ) }
sub put_json { my ( $url, $j, %o ) = @_; return _build( 'PUT', $url, %o, json => $j ) }
sub post_form {
    my ( $url, $f, %o ) = @_;
    return _build( 'POST', $url, %o, form => $f );
}
sub post_json {
    my ( $url, $j, %o ) = @_;
    return _build( 'POST', $url, %o, json => $j );
}

# POST with a hand-made body, for testing malformed input.
sub post_raw {
    my ( $url, $body, $content_type, %o ) = @_;
    return _build( 'POST', $url, %o,
        body => $body, content_type => $content_type );
}
sub delete_req {
    my ( $url, %o ) = @_;
    return _build( 'DELETE', $url, %o );
}

# Multipart upload, as used by /newtradition and /newsection.
sub post_multipart {
    my ( $url, $fields, %o ) = @_;
    my $req = HTTP::Request::Common::POST( $url, $fields,
        'Content-Type' => 'form-data' );
    $req->header( %{ $o{headers} } ) if $o{headers};
    return $req;
}

# ---------------------------------------------------------------------------
# Response helpers
# ---------------------------------------------------------------------------

# The raw body.  Do not use decoded_content: the CSV, TSV and SVG views set
# Content-Encoding: UTF-8, which makes HTTP::Message::decoded_content return
# undef.
sub body_of {
    my ($res) = @_;
    my $content = $res->content;
    return defined $content ? $content : '';
}

# Decode a JSON response body, dying with a useful message if that is not what
# came back (which usually means the test got an HTML error page instead).
sub json_of {
    my ( $res, $what ) = @_;
    $what ||= 'response';
    my $body = body_of($res);
    my $decoded = eval { decode_json($body) };
    unless ( defined $decoded ) {
        my $snippet = substr( $body, 0, 400 );
        die "Could not decode $what as JSON: $@\nBody was: $snippet\n";
    }
    return $decoded;
}

sub is_json {
    my ($res) = @_;
    return ( $res->header('Content-Type') || '' ) =~ m{application/json};
}

# Temporarily set an application configuration value for the duration of
# $code.  The path is dotted, e.g. 'Registration.no_recaptcha'.
#
# Note that this must go through the live config hashref: the package variable
# $stemmaweb::config is a different storage.
sub with_config {
    my ( $path, $value, $code ) = @_;
    my @keys = split /\./, $path;
    my $cfg  = stemmaweb->config;
    my $ref  = $cfg;
    for my $i ( 0 .. $#keys - 1 ) {
        $ref->{ $keys[$i] } ||= {};
        $ref = $ref->{ $keys[$i] };
    }
    local $ref->{ $keys[-1] } = $value;
    return $code->();
}

# ---------------------------------------------------------------------------
# Mechanize helpers
# ---------------------------------------------------------------------------

# A fresh mechanize object.
#
#   follow => 0   do not follow redirects, so that status codes stay visible
sub mech {
    my (%opts) = @_;
    my $m = Test::WWW::Mechanize::Catalyst->new( catalyst_app => 'stemmaweb' );
    $m->max_redirect(0) if exists $opts{follow} && !$opts{follow};
    return $m;
}

# A mechanize object with an established login session.
sub login_mech {
    my (%opts) = @_;
    my $username = $opts{username} || $USER;
    my $password = $opts{password} || 'UserPass';
    my $m        = mech(%opts);
    $m->get('/login');
    $m->submit_form(
        form_id => 'login_local_form',
        fields  => { username => $username, password => $password },
    );
    $m->get('/');
    unless ( $m->content =~ /Hello! \Q$username\E/ ) {
        die "Could not log in as $username\n";
    }
    return $m;
}

sub logout_mech {
    my ($m) = @_;
    $m->get('/logout');
    return $m;
}

# ---------------------------------------------------------------------------
# Action dispatch recorder
# ---------------------------------------------------------------------------

our %DISPATCHED;
our $LOG_INSTALLED = 0;

# Wrap L<Catalyst::Action/execute> so that every action that is actually
# executed gets recorded, both in memory and (if STEMMAWEB_ACTION_LOG is set)
# in a file that survives the individual test processes.  The C<end> action
# renders the view rather than the API, and is not recorded.
sub install_action_log {
    return if $LOG_INSTALLED;
    $LOG_INSTALLED = 1;
    require Catalyst::Action;
    my $original = \&Catalyst::Action::execute;
    no warnings 'redefine';
    *Catalyst::Action::execute = sub {
        my $action  = $_[0];
        my $reverse = eval { $action->reverse } // '';
        my $class   = eval { $action->class }   // '';
        if ( $reverse && $class ) {
            $DISPATCHED{"$class#$reverse"} = 1;
            _log_hit( $class, $reverse );
        }
        goto &$original;
    };
    return 1;
}

sub _log_hit {
    my ( $class, $reverse ) = @_;
    my $file = $ENV{STEMMAWEB_ACTION_LOG} or return;
    open( my $fh, '>>', $file ) or return;
    print {$fh} "$class\t$reverse\n";
    close $fh;
    return;
}

sub dispatched_actions {
    return wantarray ? sort keys %DISPATCHED : { %DISPATCHED };
}

# ---------------------------------------------------------------------------
# The authoritative list of public actions
# ---------------------------------------------------------------------------

# Every public action belonging to the controllers under test:
#
#   { reverse => '/about', path => '/about',
#     class => 'stemmaweb::Controller::Root', name => 'about',
#     args => 0, capture_args => undef, private => 0 }
sub public_actions {
    my $app  = 'stemmaweb';
    my $c    = $app->new;
    my $hash = $c->dispatcher->_action_hash;
    my %target;
    $target{"stemmaweb::Controller::$_"} = 1 for @TARGET_CONTROLLERS;

    my @actions;
    for my $path ( sort keys %$hash ) {
        my $action = $hash->{$path};
        my $class  = $action->class || '';
        next unless $target{$class};

        my $name = $action->name;
        next if $INTERNAL_ACTIONS{$name};

        my $attrs   = $action->attributes || {};
        my $is_priv = exists $attrs->{Private} ? 1 : 0;
        my ($args)     = exists $attrs->{Args}        ? @{ $attrs->{Args} }        : (undef);
        my ($captures) = exists $attrs->{CaptureArgs} ? @{ $attrs->{CaptureArgs} } : (undef);

        push @actions, {
            reverse      => $action->reverse,
            path         => $path,
            class        => $class,
            name         => $name,
            args         => $args,
            capture_args => $captures,
            private      => $is_priv,
        };
    }
    return @actions;
}

1;
