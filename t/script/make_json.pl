#!/usr/bin/env perl

use warnings;
use strict;
use JSON::MaybeXS;
use stemmaweb::Authentication::Credential::Google;
use Crypt::OpenSSL::RSA;

use IO::All;

my $cert = io('/home/erryk/certonly.pem')->slurp;
my $priv = io('/home/erryk/privkey')->slurp;

my $hash = { 'a' => $cert };

warn encode_json($hash) . "\n\n\n\n\n";

my $jwt = JSON::WebToken->encode({
        sub          => '4242',
        openid_id    => 'https://www.google.com/accounts/o8/id3',
}, $priv, 'RS256', { kid => 'a' });

use Data::Dumper;
warn $jwt . "\n\n\n\n\n";

warn Dumper (stemmaweb::Authentication::Credential::Google->decode($jwt, $hash));

1;
