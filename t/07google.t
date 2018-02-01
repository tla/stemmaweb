use warnings;
use strict;

use FindBin;
use lib ("$FindBin::Bin/lib");

use stemmaweb::Test::Common;

use stemmaweb;
use LWP::Protocol::PSGI;
use Test::WWW::Mechanize;

use Test::More skip_all => "Google login has changed massively";
use HTML::TreeBuilder;
use Data::Dumper;
use IO::All;

use stemmaweb::Test::DB;
stemmaweb::Test::DB::new_db("$FindBin::Bin/data");

# NOTE: this test uses Text::Tradition::Directory
# to check user accounts really have been created.
# It'll need to be changed once that is replaced...

my $n4jurl = stemmaweb->config->{'Model::Directory'}->{tradition_repo};
LWP::Protocol::PSGI->register(
    stemmaweb->psgi_app,
    uri => sub { $_[0] !~ m/$n4jurl/ },
);

my $ua = Test::WWW::Mechanize->new;

io("$FindBin::Bin/var")->rmtree if io("$FindBin::Bin/var")->exists;

{
    diag("Create OpenID based Google account");
    my $scope = $dir->new_scope;

    $ua->get_ok('http://localhost/login');

    local *Catalyst::Authentication::Credential::OpenID::authenticate = sub {
        my ( $self, $c, $realm, $authinfo ) = @_;

        return $realm->find_user({
            url => 'https://www.google.com/accounts/o8/id?id=XYZ',
            email => 'test@example.com',
                                 }, $c);
    };

    ok !$dir->find_user({ url => 'https://www.google.com/accounts/o8/id?id=XYZ' }), 'No such user, yet.';

    $ua->submit_form(
        form_number => 2,
        fields => {
            openid_identifier => 'https://www.google.com/accounts/o8/id?id=XYZ',
        },
    );

    $ua->content_contains('You have logged in.', 'Openid login works');

    $ua->get('/');

    $ua->content_contains('Hello! test@example.com!', 'We are logged in.');

    diag("Verify new OpenID Google account exists");
    ok $dir->find_user({ url => 'https://www.google.com/accounts/o8/id?id=XYZ',
                         email => 'test@example.com',
                       }), 'The user is now there.';
    $ua->get('/logout');

    # Converting to Google ID.

    diag("Login/Convert to new Google+ account");
    local *stemmaweb::Authentication::Credential::Google::authenticate = sub {
        my ( $self, $c, $realm, $authinfo ) = @_;

        return $realm->find_user({
                openid_id => 'https://www.google.com/accounts/o8/id?id=XYZ',
                sub        => 42,
                email => $authinfo->{email},
            }, $c);
    };
    $ua->get_ok('http://localhost/login');

    $ua->submit_form(
        form_number => 1,
        fields => {
            id_token => 'something',
            email    => 'test@example.com',
        },
    );

    $ua->content_contains('You have logged in.', 'G+ login works');

    $ua->get('/');

    $ua->content_contains('Hello! test@example.com!', 'We are logged in.');

    $ua->get_ok('/logout', 'Logged out');
}

{
    diag("Create OpenID based Google account for email match");
    my $scope = $dir->new_scope;

    $ua->get_ok('http://localhost/login');

    local *Catalyst::Authentication::Credential::OpenID::authenticate = sub {
        my ( $self, $c, $realm, $authinfo ) = @_;

        return $realm->find_user({
            url => 'https://www.google.com/accounts/o8/id?id=42XYZ',
            email => 'test42@example.com',
                                 }, $c);
    };

    ok !$dir->find_user({ url => 'https://www.google.com/accounts/o8/id?id=42XYZ' }), 'No such user, yet.';

    $ua->submit_form(
        form_number => 2,
        fields => {
            openid_identifier => 'https://www.google.com/accounts/o8/id?id=42XYZ',
        },
    );

    $ua->content_contains('You have logged in.', 'Openid login works');

    $ua->get('/');

    $ua->content_contains('Hello! test42@example.com!', 'We are logged in.');

    diag("Verify new OpenID Google account for email match exists");
    ok $dir->find_user({ url => 'https://www.google.com/accounts/o8/id?id=42XYZ',
                         email => 'test42@example.com',
                       }), 'The user is now there.';
    $ua->get('/logout');

    # Converting to Google ID.

    diag("Login/Convert to new Google+ account matching only on email");
    local *stemmaweb::Authentication::Credential::Google::authenticate = sub {
        my ( $self, $c, $realm, $authinfo ) = @_;

        return $realm->find_user({
                openid_id => 'https://www.google.com/accounts/o8/id?id=45XYZ',
                sub        => 45,
                email => $authinfo->{email},
            }, $c);
    };
    $ua->get_ok('http://localhost/login');

    $ua->submit_form(
        form_number => 1,
        fields => {
            id_token => 'something',
            email    => 'test42@example.com',
        },
    );

    $ua->content_contains('You have logged in.', 'G+ login works');

    $ua->get('/');

    $ua->content_contains('Hello! test42@example.com!', 'We are logged in.');

    $ua->get('/logout');
}

my $openid_uid;
my $gplus_uid;
my %tradition_names;
{
    diag("Test converting OpenID based Google account with traditions");
    my $scope = $dir->new_scope;

    my $openid_u = $dir->find_user({ url => 'https://www.google.com/accounts/o8/id?id=AItOawlFTlpuHGcI67tqahtw7xOod9VNWffB-Qg',
                         email => 'openid@example.org',
                       });
    ok($openid_u, 'The user is there.');

    diag("Login/Convert to new Google+ account");
    local *stemmaweb::Authentication::Credential::Google::authenticate = sub {
        my ( $self, $c, $realm, $authinfo ) = @_;

        return $realm->find_user({
                openid_id => 'https://www.google.com/accounts/o8/id?id=AItOawlFTlpuHGcI67tqahtw7xOod9VNWffB-Qg',
                sub        => 450,
                email => $authinfo->{email},
            }, $c);
    };
    $ua->get_ok('http://localhost/login');

    $ua->submit_form(
        form_number => 1,
        fields => {
            id_token => 'something',
            email    => 'openid@example.org',
        },
    );

    $ua->content_contains('You have logged in.', 'G+ login works');
    $ua->get('/');
    $ua->content_contains('Hello! openid@example.org!', 'We are logged in.');

    my $gplus_u = $dir->find_user({
        openid_id => 'https://www.google.com/accounts/o8/id?id=AItOawlFTlpuHGcI67tqahtw7xOod9VNWffB-Qg',
        sub        => 450,
        email => 'openid@example.org'
    });
    $openid_uid = $openid_u->kiokudb_object_id;
    $gplus_uid = $gplus_u->kiokudb_object_id;

    foreach my $trad_id (0..$#{ $openid_u->traditions }) {
    	my $trad = $gplus_u->traditions->[$trad_id];
    	$tradition_names{$trad->name} = 1;
        is($trad->name, $openid_u->traditions->[$trad_id]->name, 'Traditions were copied over to G+ user');
    }

    $ua->get('/logout');
}

{ 
	diag("Check that the user traditions were removed from the old user");
	my $scope = $dir->new_scope;
	my $openid_u = $dir->lookup( $openid_uid );
	my $gplus_u = $dir->lookup( $gplus_uid );
	is( scalar @{$openid_u->traditions}, 0, "Traditions were removed from old user" );
	foreach my $tradition ( @{$gplus_u->traditions} ) {
		ok( $tradition_names{ $tradition->name }, "Tradition has remained with new user" );
	}
}

{
    diag("Verify we can login the new Google+ account again");
    my $scope = $dir->new_scope;
#    ok !$dir->find_user({ url => 'https://www.google.com/accounts/o8/id?id=XYZ' }), 'Old google-openid is gone.';

    ok $dir->find_user({
        sub => 42,
        openid_id => 'https://www.google.com/accounts/o8/id?id=XYZ',
        email    => 'test@example.com',
    }), 'The G+ user is there.';

    $ua->get('/logout');

    $ua->get_ok('http://localhost/login');

    local *stemmaweb::Authentication::Credential::Google::authenticate = sub {
        my ( $self, $c, $realm, $authinfo ) = @_;

        return $realm->find_user({
                openid_id => 'https://www.google.com/accounts/o8/id?id=XYZ',
                sub        => 42,
                email      => $authinfo->{email},
            }, $c);
    };

    $ua->submit_form(
        form_number => 1,
        fields => {
            id_token => 'something',
            email   => 'test@example.com',
        },
    );

    $ua->content_contains('You have logged in.', 'We can now log in to our created user');

    $ua->get('/');

    $ua->content_contains('Hello! test@example.com!', 'We are logged in.');
}

# Brand new user just from open id.

{
    diag("Create a fresh Google+ user");
    my $scope = $dir->new_scope;

    ok !$dir->find_user({ sub => 2, openid_id => 'https://www.google.com/accounts/o8/id2?id=XYZ', email => 'test2@exmple.com' }), 'The G+ user is not yet there.';

    $ua->get('/logout');

    $ua->get_ok('http://localhost/login');

    local *stemmaweb::Authentication::Credential::Google::authenticate = sub {
        my ( $self, $c, $realm, $authinfo ) = @_;

        return $realm->find_user({
                openid_id => 'https://www.google.com/accounts/o8/id2?id=XYZ',
                sub        => 2,
                email      => $authinfo->{email},
            }, $c);
    };

    $ua->submit_form(
        form_number => 1,
        fields => {
            id_token => 'something',
            email    => 'test2@example.com',
        },
    );

    $ua->content_contains('You have logged in.', 'We can now log in to our created user');

    $ua->get('/');

    $ua->content_contains('Hello! test2@example.com!', 'We are logged in.');

    ok $dir->find_user({ sub => 2, openid_id => 'https://www.google.com/accounts/o8/id2?id=XYZ', email => 'test2@example.com' }), 'The G+ user is there.';

    $ua->get('/logout');

    $ua->get_ok('http://localhost/login');

    $ua->submit_form(
        form_number => 1,
        fields => {
            id_token => 'something',
            email    => 'test2@example.com',
        },
    );

    $ua->content_contains('You have logged in.', 'We can login again');

    $ua->get('/');

    $ua->content_contains('Hello! test2@example.com!', 'We are logged in.');
}

# Decoding token

{
    my $scope = $dir->new_scope;

    ok !$dir->find_user({ sub => 4242, openid_id => 'https://www.google.com/accounts/o8/id3', email => 'email@example.org' }), 'The G+ user is not yet there.';

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

    ok $dir->find_user({ sub => 4242, openid_id => 'https://www.google.com/accounts/o8/id3', email => 'email@example.org' }), 'The G+ user is there.';

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

    $ua->content_contains('Hello! email@example.org!', 'We are logged in.');
}

io("$FindBin::Bin/var")->rmtree if io("$FindBin::Bin/var")->exists;

done_testing;
