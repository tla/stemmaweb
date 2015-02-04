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
use IO::All;

use stemmaweb::Test::DB;

my $dir = stemmaweb::Test::DB->new_db;

# NOTE: this test uses Text::Tradition::Directory
# to check user accounts really have been created.
# It'll need to be changed once that is replaced...

LWP::Protocol::PSGI->register(stemmaweb->psgi_app);

my $ua = Test::WWW::Mechanize->new;

io("$FindBin::Bin/var")->rmtree if io("$FindBin::Bin/var")->exists;

{
    my $scope = $dir->new_scope;

    $ua->get_ok('http://localhost/login');

    local *Catalyst::Authentication::Credential::OpenID::authenticate = sub {
        my ( $self, $c, $realm, $authinfo ) = @_;

        return $realm->find_user({ url => 'https://www.google.com/accounts/o8/id' }, $c);
    };

    ok !$dir->find_user({ url => 'https://www.google.com/accounts/o8/id' }), 'No such user, yet.';

    $ua->submit_form(
        form_number => 2,
        fields => {
            openid_identifier => 'https://www.google.com/accounts/o8/id',
        },
    );

    $ua->content_contains('You have logged in.', 'Openid login works');

    $ua->get('/');

    $ua->content_contains('Hello! https://www.google.com/accounts/o8/id!', 'We are logged in.');

    ok $dir->find_user({ url => 'https://www.google.com/accounts/o8/id' }), 'The user is now there.';
    $ua->get('/logout');

    # Converting to Google ID.

    local *stemmaweb::Authentication::Credential::Google::authenticate = sub {
        my ( $self, $c, $realm, $authinfo ) = @_;

        return $realm->find_user({
                openid_id => 'https://www.google.com/accounts/o8/id',
                sub        => 42,
            }, $c);
    };
    $ua->get_ok('http://localhost/login');

    $ua->submit_form(
        form_number => 1,
        fields => {
            id_token => 'something',
            email    => 'email@example.org',
        },
    );

    $ua->content_contains('You have logged in.', 'G+ login works');

    $ua->get('/');

    $ua->content_contains('Hello! 42!', 'We are logged in.');
}

{
    my $scope = $dir->new_scope;

    ok !$dir->find_user({ url => 'https://www.google.com/accounts/o8/id' }), 'Old google-openid is gone.';

    ok $dir->find_user({ sub => 42, openid_id => 'https://www.google.com/accounts/o8/id' }), 'The G+ user is there.';

    $ua->get('/logout');

    $ua->get_ok('http://localhost/login');

    local *stemmaweb::Authentication::Credential::Google::authenticate = sub {
        my ( $self, $c, $realm, $authinfo ) = @_;

        return $realm->find_user({
                openid_id => 'https://www.google.com/accounts/o8/id',
                sub        => 42,
            }, $c);
    };

    $ua->submit_form(
        form_number => 1,
        fields => {
            id_token => 'something',
            email   => 'email@example.org',
        },
    );

    $ua->content_contains('You have logged in.', 'We can now log in to our created user');

    $ua->get('/');

    $ua->content_contains('Hello! 42!', 'We are logged in.');
}

# Brand new user just from open id.

{
    my $scope = $dir->new_scope;


    ok !$dir->find_user({ sub => 2, openid_id => 'https://www.google.com/accounts/o8/id2' }), 'The G+ user is not yet there.';

    $ua->get('/logout');

    $ua->get_ok('http://localhost/login');

    local *stemmaweb::Authentication::Credential::Google::authenticate = sub {
        my ( $self, $c, $realm, $authinfo ) = @_;

        return $realm->find_user({
                openid_id => 'https://www.google.com/accounts/o8/id2',
                sub        => 2,
            }, $c);
    };

    $ua->submit_form(
        form_number => 1,
        fields => {
            id_token => 'something',
            email   => 'email@example.org',
        },
    );

    $ua->content_contains('You have logged in.', 'We can now log in to our created user');

    $ua->get('/');

    $ua->content_contains('Hello! 2!', 'We are logged in.');

    ok $dir->find_user({ sub => 2, openid_id => 'https://www.google.com/accounts/o8/id2' }), 'The G+ user is there.';

    $ua->get('/logout');

    $ua->get_ok('http://localhost/login');

    $ua->submit_form(
        form_number => 1,
        fields => {
            id_token => 'something',
            email   => 'email@example.org',
        },
    );

    $ua->content_contains('You have logged in.', 'We can login again');

    $ua->get('/');

    $ua->content_contains('Hello! 2!', 'We are logged in.');
}

# Decoding token

{
    my $scope = $dir->new_scope;

    ok !$dir->find_user({ sub => 4242, openid_id => 'https://www.google.com/accounts/o8/id3' }), 'The G+ user is not yet there.';

    $ua->get('/logout');

    $ua->get_ok('http://localhost/login');

    $ua->submit_form(
        form_number => 1,
        fields => {
            id_token => 'eyJraWQiOiJhIiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI0MjQyIiwib3BlbmlkX2lkIjoiaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9hY2NvdW50cy9vOC9pZDMifQ.moNERe3UHCY4xGMPxdCqmbg2JKW5feVnYlA8jeB4CdE4c_KL3YHvICQeql-S486HT-AlWBeDJWMr6wWH1kkwz11a2D1oyJ8qCWBssHIkhfv8dm3dphmRbtzYssAOFdGsmnPH1oXolCnl-Qu9WgHkhYYnRJWHr3CkeNA6Yh1xOV3nkaa8REtJckuzh3jyKQgx_rjIFsWBPDmT1rqa_Q0XOGVK34N5tADwpcWmkb3fFnbddzd9L6MnybbFzF_S238Bpr5vNa9doXRBwvJ85AdSn1AWX8R6qVpDbbaiGL2RCahuZYF9XECYm6anee-KTKvxh02KXkG2zniKVvweaMlcbQ',
            email    => 'email@example.org',
        },
    );

    $ua->content_contains('You have logged in.', 'We can now log in to our created user - the token was decoded');

    $ua->get('/');

    $ua->content_contains('Hello! email@example.org!', 'We are logged in.');

    ok $dir->find_user({ sub => 4242, openid_id => 'https://www.google.com/accounts/o8/id3' }), 'The G+ user is there.';

    $ua->get('/logout');

    $ua->get_ok('http://localhost/login');

    $ua->submit_form(
        form_number => 1,
        fields => {
            id_token => 'eyJraWQiOiJhIiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI0MjQyIiwib3BlbmlkX2lkIjoiaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9hY2NvdW50cy9vOC9pZDMifQ.moNERe3UHCY4xGMPxdCqmbg2JKW5feVnYlA8jeB4CdE4c_KL3YHvICQeql-S486HT-AlWBeDJWMr6wWH1kkwz11a2D1oyJ8qCWBssHIkhfv8dm3dphmRbtzYssAOFdGsmnPH1oXolCnl-Qu9WgHkhYYnRJWHr3CkeNA6Yh1xOV3nkaa8REtJckuzh3jyKQgx_rjIFsWBPDmT1rqa_Q0XOGVK34N5tADwpcWmkb3fFnbddzd9L6MnybbFzF_S238Bpr5vNa9doXRBwvJ85AdSn1AWX8R6qVpDbbaiGL2RCahuZYF9XECYm6anee-KTKvxh02KXkG2zniKVvweaMlcbQ',
            email   => 'email@example.org',
        },
    );

    $ua->content_contains('You have logged in.', 'We can login again');

    $ua->get('/');

    $ua->content_contains('Hello! email@example.org!', 'We ar logged in.');
}

io("$FindBin::Bin/var")->rmtree if io("$FindBin::Bin/var")->exists;

done_testing;
