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

stemmaweb::Test::DB->new_db;

LWP::Protocol::PSGI->register(stemmaweb->psgi_app);

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


done_testing;
