use warnings;
use strict;

use FindBin;
use lib ("$FindBin::Bin/../lib");

use Crypt::OpenSSL::RSA;
use MIME::Base64 qw(encode_base64url);
use Test::More;
use stemmaweb::Authentication::Credential::Google;

# Google signs its ID tokens with RS256, i.e. RSASSA-PKCS1-v1_5 + SHA-256.
# Crypt::OpenSSL::RSA 0.35+ defaults to PSS unless PKCS1 padding is requested
# explicitly, which JSON::WebToken doesn't do. Sign the token here with
# explicit PKCS1 padding to stand in for Google, and check that we accept it.

my $rsa = Crypt::OpenSSL::RSA->generate_key(2048);
$rsa->use_sha256_hash;
$rsa->use_pkcs1_padding;

my $input = join('.',
    encode_base64url('{"alg":"RS256","kid":"test","typ":"JWT"}'),
    encode_base64url('{"sub":"42","email":"test@example.org"}'));
my $token = "$input." . encode_base64url($rsa->sign($input));

my $google = stemmaweb::Authentication::Credential::Google->new({}, undef, 'google');
my $claims = eval { $google->decode($token, undef, $rsa->get_public_key_x509_string) };
ok($claims, 'PKCS1 v1.5 RS256 token verifies') or diag($@);
is($claims->{email}, 'test@example.org', 'claims were decoded');

# A token with a tampered payload must still be rejected
my ($h, $c, $s) = split /\./, $token;
my $forged = join('.', $h, encode_base64url('{"sub":"42","email":"evil@example.org"}'), $s);
ok(!eval { $google->decode($forged, undef, $rsa->get_public_key_x509_string); 1 },
   'tampered token is rejected');

done_testing;
