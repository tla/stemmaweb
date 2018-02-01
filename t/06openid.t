use warnings;
use strict;

use FindBin;
use lib ("$FindBin::Bin/lib");

use stemmaweb;
use LWP::Protocol::PSGI;
use Test::WWW::Mechanize;

use Test::More skip_all => "openid not re-implemented yet";
use HTML::TreeBuilder;
use Data::Dumper;

use stemmaweb::Test::DB;
stemmaweb::Test::DB::new_db("$FindBin::Bin/data");

my $n4jurl = stemmaweb->config->{'Model::Directory'}->{tradition_repo};
LWP::Protocol::PSGI->register(
    stemmaweb->psgi_app,
    uri => sub { $_[0] !~ m/$n4jurl/ },
);

my $ua = Test::WWW::Mechanize->new;

$ua->get_ok('http://localhost/login');

# Trying a user that already exists

local *Catalyst::Authentication::Credential::OpenID::authenticate = sub {
    my ( $self, $c, $realm, $authinfo ) = @_;

    return $realm->find_user({ url => 'http://localhost/' }, $c);
};

$ua->submit_form(
    form_number => 2,
    fields => {
        openid_identifier => 'http://localhost',
    },
);

$ua->content_contains('You have logged in.', 'Openid login works');

$ua->get('/');

$ua->content_contains('Hello! http://localhost/!', 'We are logged in.');

$ua->get('/logout');

# Trying a user that doesn't already exist

local *Catalyst::Authentication::Credential::OpenID::authenticate = sub {
    my ( $self, $c, $realm, $authinfo ) = @_;

    return $realm->find_user({ url => 'http://example.org/' }, $c);
};


# ok !$dir->find_user({ url => 'http://example.org/' }), 'No such user, yet.';

$ua->get_ok('http://localhost/login');

$ua->submit_form(
    form_number => 2,
    fields => {
        openid_identifier => 'http://example.org',
    },
);

$ua->content_contains('You have logged in.', 'Openid login works');

$ua->get('/');

$ua->content_contains('Hello! http://example.org/!', 'We are logged in.');

# ok $dir->find_user({ url => 'http://example.org/' }), 'User now exists.';

$ua->get('/logout');

$ua->get_ok('http://localhost/login');

$ua->submit_form(
    form_number => 2,
    fields => {
        openid_identifier => 'http://example.org',
    },
);

$ua->content_contains('You have logged in.', 'We can now log in to our created user');

$ua->get('/');

$ua->content_contains('Hello! http://example.org/!', 'We are logged in.');

done_testing;
