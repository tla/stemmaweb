use warnings;
use strict;

use FindBin;
use lib ("$FindBin::Bin/lib");

use stemmaweb::Test::Common;

use stemmaweb;
use LWP::Protocol::PSGI;
use Test::WWW::Mechanize;

use Test::More;
use HTML::TreeBuilder;
use Data::Dumper;

use stemmaweb::Test::DB;

stemmaweb::Test::DB::new_db("$FindBin::Bin/data");

# stemmaweb_tests.conf turns the reCaptcha requirement off, but ConfigLoader
# ignores the local-suffix files once STEMMAWEB_CONFIG names a config file,
# which is what happens inside the development container.  Set it directly.
stemmaweb->config->{Registration}{no_recaptcha} = 1;

my $n4jurl = stemmaweb->config->{'Model::Directory'}->{tradition_repo};
LWP::Protocol::PSGI->register(
    stemmaweb->psgi_app,
    uri => sub { $_[0] !~ m/$n4jurl/ },
);

my $ua = Test::WWW::Mechanize->new;

$ua->get_ok('http://localhost/register');

my $response = $ua->submit_form(
    fields => {
        username         => 'user2@example.org',
        password         => 'UserPass',
        confirm_password => 'UserPass',
    });

$ua->content_contains('You are now registered.', 'Registration worked');

$ua->get('/');
$ua->content_contains('Hello! user2@example.org', 'We are logged in.');

$ua->get('/logout');

$ua->get_ok('http://localhost/login');
$response = $ua->submit_form(
    fields => {
        username    => 'user2@example.org',
        password    => 'UserPass'
    });

$ua->content_contains('Stemmaweb - Logged in', 'Log in with new account works');

$ua->get('/');
$ua->content_contains('Hello! user2@example.org', 'We are logged in with new account');

$ua->get('/logout');

$ua->get_ok('http://localhost/register');

$response = $ua->submit_form(
    fields => {
        username         => 'user2@example.org',
        password         => 'UserPass',
        confirm_password => 'UserPass',
    });

$ua->content_contains('That username already exists.', 'We cannot register an already
    existing username');

$ua->get('/logout');
$ua->get('http://localhost/register');

# Submit with explicitly empty values: a field that was never sent is not
# reported on by the form handler.
$ua->submit_form(
    fields => { username => '', password => '', confirm_password => '' } );

$ua->content_contains('Your username is required.', 'We get an error if username is empty');
$ua->content_contains('Your password is required.', 'We get an error if password is empty');
$ua->content_contains('You must confirm your password.', 'We get an error if password confirmation is empty');

$ua->submit_form(
    fields  => {
        username            => 'new@example.com',
        password            => 'MyPassword',
        confirm_password    => 'WrongPassword',
    });

$ua->content_contains('The password confirmation does not match the password', 'confirm password needs to be the same as password.');

$ua->submit_form(
    fields  => {
        username            => 'user',
        password            => 'a',
        confirm_password    => 'a',
    });


$ua->content_contains('Field must be at least 8 characters. You entered 1', 'Error is shown on too short passwd.');


done_testing;
