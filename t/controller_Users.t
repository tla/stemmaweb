#!/usr/bin/env perl
#
# Tests for stemmaweb::Controller::Users.
#
# Most of this controller comes from L<CatalystX::Controller::Auth>, so the
# tests here drive the actions that it contributes as well as the two that
# stemmaweb adds.  Registration is tested both with the reCaptcha requirement
# on (the shipped configuration) and off (the configuration the test suite is
# meant to be run with).

use strict;
use warnings;

use FindBin;
use lib ("$FindBin::Bin/lib");

use HTTP::Request::Common qw/ GET POST /;
use Test::More;

use stemmaweb::Test::App qw/
  section
  new_fixtures
  body_of
  json_of
  login_mech
  mech
  get_req
  post_form
  request
  with_config
  install_action_log
/;

install_action_log();

my $fx = new_fixtures();

my $USER   = 'user@example.org';
my $PASSWD = 'UserPass';

# Accounts created by this file are never removed by the fixture loader, so
# give them a name that cannot collide with a previous run.
my $unique = sub { my ($base) = @_; return "$base-" . $$ . '@example.org' };

# Make a fresh object for each attempt, so that no session leaks between them.
# Redirects are followed: a successful login or registration redirects to
# /users/success, and the tests want to see the page the user ends up on.
sub attempt {
    my ( $url, $fields, %opt ) = @_;
    my $m = mech(%opt);
    $m->get($url);
    $m->submit_form( fields => $fields ) if $fields;
    return $m;
}

# ---------------------------------------------------------------------------
# index
# ---------------------------------------------------------------------------

section('index');

{
    my $res = request( get_req('/users') );
    is( $res->code, 200, 'GET /users succeeds' );
    like( body_of($res), qr/Matched stemmaweb::Controller::Users/,
        'The index action answers directly' );
}

{
    my $res = request( get_req('/users/success') );
    is( $res->code, 200, 'GET /users/success succeeds' );
    like( $res->header('Content-Type'), qr{text/html},
        'The success stub is HTML' );
}

# ---------------------------------------------------------------------------
# login
# ---------------------------------------------------------------------------

section('login');

{
    my $res = request( get_req('/login') );
    is( $res->code, 200, 'GET /login serves the sign-in page' );
    like( body_of($res), qr/login_local_form/, 'The local sign-in form is present' );
}

{
    my $m = attempt( '/login', { username => $USER, password => $PASSWD } );
    is( $m->res->code, 200, 'POST /login with valid details succeeds' );
    like( $m->content, qr/Stemmaweb - Logged in/,
        'The user is told that they are signed in' );

    $m->get('/');
    like( $m->content, qr/Hello! \Q$USER\E/, 'The session belongs to the user' );
}

{
    my $m = attempt( '/login', { username => $USER, password => 'WrongPassword' } );
    is( $m->res->code, 200, 'POST /login with a bad password re-serves the form' );
    like( $m->content, qr/Bad username or password/,
        'The bad password is reported' );
}

{
    my $m = attempt( '/login', { username => '', password => '' } );
    is( $m->res->code, 200, 'POST /login with no details re-serves the form' );
    like( $m->content, qr/Your username is required/, 'The username is required' );
    like( $m->content, qr/Your password is required/, 'The password is required' );
}

{
    # The sign-in form applies the same length rule as registration.
    my $m = attempt( '/login', { username => $USER, password => 'short' } );
    like( $m->content, qr/Field must be at least 8 characters/,
        'A short password is rejected before the credentials are checked' );
}

# ---------------------------------------------------------------------------
# logout
# ---------------------------------------------------------------------------

section('logout');

{
    my $m = login_mech( follow => 0 );
    my $res = $m->get('/logout');
    ok( $res->is_redirect, 'GET /logout redirects' );
    $m->get('/');
    unlike( $m->content, qr/Hello!/, 'The session is gone after logging out' );
}

# ---------------------------------------------------------------------------
# register
# ---------------------------------------------------------------------------

section('register');

{
    my $res = request( get_req('/register') );
    is( $res->code, 200, 'GET /register serves the registration page' );
    like( body_of($res), qr/Confirm password/,
        'The registration form asks for a password confirmation' );
}

{
    # The shipped configuration requires a reCaptcha, which the tests cannot
    # provide.
    my $m = attempt( '/register',
        { username => 'captcha@example.org', password => $PASSWD, confirm_password => $PASSWD } );
    is( $m->res->code, 200, 'POST /register without a reCaptcha re-serves the form' );
    like( $m->content, qr/submitted a recaptcha/,
        'The missing reCaptcha is reported' );
}

# The rest of the registration behaviour needs the reCaptcha requirement off,
# which is what stemmaweb_tests.conf is for.
my $norecaptcha = sub {
    my ( $label, $fields, $expect ) = @_;
    with_config(
        'Registration.no_recaptcha', 1,
        sub {
            my $m = attempt( '/register', $fields );
            is( $m->res->code, 200, "$label: the form is served" );
            like( $m->content, $expect, "$label: expected message" );
            return $m;
        }
    );
};

{
    my $newuser = $unique->('newuser');
    my $m = with_config( 'Registration.no_recaptcha', 1, sub {
        return attempt( '/register', {
            username         => $newuser,
            password         => 'NewUserPass',
            confirm_password => 'NewUserPass'
        } );
    } );
    is( $m->res->code, 200, 'POST /register with valid details succeeds' );
    like( $m->content, qr/You are now registered/, 'The registration is confirmed' );

    $m->get('/');
    like( $m->content, qr/Hello! \Q$newuser\E/,
        'The new account can be used straight away' );
}

{
    $norecaptcha->( 'registering an existing user',
        { username => $USER, password => $PASSWD, confirm_password => $PASSWD },
        qr/That username already exists/ );
}

{
    $norecaptcha->( 'mismatched confirmation',
        { username => 'mismatch@example.org', password => 'GoodPasswd',
          confirm_password => 'OtherPasswd' },
        qr/does not match the password/ );
}

{
    $norecaptcha->( 'short password',
        { username => 'short@example.org', password => 'a', confirm_password => 'a' },
        qr/Field must be at least 8 characters/ );
}

{
    $norecaptcha->( 'no details at all', {},
        qr/Your username is required/ );
}

# ---------------------------------------------------------------------------
# get and change-password
# ---------------------------------------------------------------------------

section('/auth/<id>');
{
    # The capture action looks the user up by an "id" field that the
    # authentication store cannot resolve, so the chain aborts before the
    # change-password action is reached.
    TODO: {
        local $TODO =
          'the auth store resolves {id => ...} to nothing, so the chain always croaks';
        my $res = request( get_req("/auth/$USER/change-password") );
        is( $res->code, 200, 'GET /auth/<id>/change-password serves the form' );
    }
}

# ---------------------------------------------------------------------------
# forgot-password and reset-password
# ---------------------------------------------------------------------------

section('password recovery');

{
    TODO: {
        local $TODO =
          'the templates auth/forgot-password.tt and reset-password-plain.tt are not shipped';
        my $res = request( get_req('/forgot-password') );
        is( $res->code, 200, 'GET /forgot-password serves the form' );
    }
}

{
    TODO: {
        local $TODO =
          'the templates auth/forgot-password.tt and reset-password-plain.tt are not shipped';
        my $res = request(
            post_form( '/forgot-password', [ username => $USER ] ) );
        is( $res->code, 200, 'POST /forgot-password accepts a request' );
    }
}

{
    my $res = request( get_req('/reset-password') );
    is( $res->code, 302, 'GET /reset-password without a token redirects' );
    like( $res->header('Location'), qr/forgot-password/,
        'The redirect sends the user to the "forgot password" page' );
}

{
    my $res = request( get_req('/reset-password?token=nosuchtoken') );
    is( $res->code, 302, 'GET /reset-password with a bad token redirects' );
    like( $res->header('Location'), qr/forgot-password/,
        'A bad token also sends the user to the "forgot password" page' );
}

{
    my $recovery = $unique->('recovery');
    with_config(
        'Registration.no_recaptcha', 1,
        sub {
            my $m = attempt( '/register', {
                username         => $recovery,
                password         => 'RecoveryPass',
                confirm_password => 'RecoveryPass'
            } );
            like( $m->content, qr/You are now registered/,
                'A second account can be registered' );
        }
    );
}

done_testing();
