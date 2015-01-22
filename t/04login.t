use warnings;
use strict;

use stemmaweb;
use LWP::Protocol::PSGI;
use Test::WWW::Mechanize;

use Test::More;
use HTML::TreeBuilder;
use Data::Dumper;

use FindBin;

use IPC::System::Simple qw(system);
system("$FindBin::Bin/../script/maketestdb.pl");

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

done_testing;
