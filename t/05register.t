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

use stemmaweb::Test::Common;

my $ua = Test::WWW::Mechanize->new;

$ua->get_ok('http://localhost/register');

my $response = $ua->submit_form(
    fields => {
        username         => 'user2@example.org',
        password         => 'UserPass',
        confirm_password => 'UserPass',
    });

warn $ua->content;

=cut

$ua->content_contains('Stemmaweb - Logged in', 'Log in successful.');

my $content  = $ua->get('/');
$ua->content_contains('Hello! user@example.org', 'We are logged in.');

=cut

done_testing;
