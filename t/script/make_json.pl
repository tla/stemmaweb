#!/usr/bin/env perl

use warnings;
use strict;
use JSON::XS;
use stemmaweb::Authentication::Credential::Google;
use Crypt::OpenSSL::RSA;
use FindBin;

use IO::All;

my $cert = io("$FindBin::Bin/../etc/certonly.pem")->slurp;
my $priv = io("$FindBin::Bin/../etc/privkey")->slurp;

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
