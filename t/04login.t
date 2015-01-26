use warnings;
use strict;

use stemmaweb;
use LWP::Protocol::PSGI;
use Test::WWW::Mechanize;

use Test::More;
use HTML::TreeBuilder;
use Data::Dumper;

use FindBin;
use lib ("$FindBin::Bin/lib");

use stemmaweb::Test::DB;

stemmaweb::Test::DB->new_db;

LWP::Protocol::PSGI->register(stemmaweb->psgi_app);

my $ua = Test::WWW::Mechanize->new;

$ua->get_ok('http://localhost/login');
my $response = $ua->submit_form(
    fields => {
        username    => 'user@example.org',
        password    => 'UserPass'
    });

$ua->content_contains('Stemmaweb - Logged in', 'Log in successful.');

my $content  = $ua->get('/');
$ua->content_contains('Hello! user@example.org', 'We are logged in.');

$ua->get('/logout');
$ua->get('/login');

$ua->submit_form;

$ua->content_contains('Your username is required.', 'Username is required to log in');
$ua->content_contains('Your password is required.', 'Password is required to log in.');

$ua->submit_form(
    fields => {
        username    => 'nonexistant',
        password    => 'nonexistant',
    });

$ua->content_contains('Bad username or password.', 'Error is shown on incorrect details.');


done_testing;
