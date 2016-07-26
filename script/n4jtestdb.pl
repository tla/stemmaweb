#!/usr/bin/env perl

use strict;
use warnings;
use feature qw/say/;
use Config::Any;
use JSON qw/to_json from_json/;
use LWP::UserAgent;

# Define our helpers

sub djson {
  my $response = shift;
  my $obj = undef;
  if( $response->content_type eq 'application/json' ) {
    $obj = from_json( $response->decoded_content );
  }
  return $obj;
}

sub filejstr {
  my $fn = shift;
  open(FH, $fn) or die "Could not open $fn to read";
  # binmode(FH, ':utf8');
  my @lines = <FH>;
  close FH;
  return join( '', @lines );
  # return JSON->new->allow_nonref->encode( $str );
}

# Get the URL
# TODO: change this to be passed at the command line
my $cfg = Config::Any->load_stems({stems => ['stemmaweb'], use_ext => 1})->[0];
my $n4jurl = $cfg->{'stemmaweb.conf'}->{Model}->{Directory}->{tradition_repo};

# Add the users
my $ua = LWP::UserAgent->new();
my $u1info = {
  email => 'user@example.org',
  passphrase => 'UserPass',
  role => 'user'
};
my $u2info = {
  email => 'admin@example.org',
  passphrase => 'AdminPass',
  role => 'admin'
};
# Delete the users if they don't exist already
foreach my $u (($u1info, $u2info)) {
  my $tres = $ua->get( "$n4jurl/user/" . $u->{email} . "/traditions");
  if( $tres->code == 200 ) {
    my $trads = djson( $tres );
    foreach my $tr ( @$trads ) {
      my $res = $ua->delete( "$n4jurl/tradition/" . $tr->{id} );
      die "Could not delete tradition " . $tr->{id} unless $res->code == 200;
    }
  }
  my $res = $ua->delete( "$n4jurl/user/" . $u->{email});
  $res = $ua->put( "$n4jurl/user/" . $u->{email}, 'Content-Type' => 'application/json', Content => to_json($u));
  die("User " . $u->{email} . " not created") unless $res->code == 201;
}

# TODO create openid user

# Add the traditions
# 1. Notre besoin
my $t1data = [
  name => 'Notre besoin',
  filetype => 'graphml',
  language => 'French',
  userId => 'user@example.org',
  file => ['t/data/besoin.xml']
];
my $res = $ua->post( "$n4jurl/tradition", 'Content-Type' => 'form-data', Content => $t1data);
die("Besoin tradition could not be created") unless $res->code == 201;
my $t1id = djson( $res )->{tradId};

$res = $ua->post( "$n4jurl/tradition/$t1id/stemma", 'Content-Type' => 'application/json',
  Content => filejstr("t/data/besoin_stemweb.dot") );
die("Besoin stemma could not be added") unless $res->code == 201;

# 1a. TODO something owned by the OpenID user

# 2. Florilegium
my $t2data = [
  name => 'Florilegium',
  filetype => 'csv',
  language => 'Greek',
  public => 'true',
  userId => 'admin@example.org',
  file => ['t/data/florilegium.csv']
];
$res = $ua->post( "$n4jurl/tradition", 'Content-Type' => 'form-data', Content => $t2data);
die("Florilegium tradition could not be created") unless $res->code == 201;
my $t2id = djson( $res )->{tradId};
$res = $ua->post( "$n4jurl/tradition/$t2id/stemma", 'Content-Type' => 'application/json',
  Content => filejstr("t/data/florilegium.dot") );
die("Florilegium stemma could not be added") unless $res->code == 201;

# 3. John verse
my $t3data = [
  name => 'John verse',
  direction => 'BI',
  filetype => 'graphml',
  language => 'Greek',
  public => 'true',
  userId => 'user@example.org',
  file => ['t/data/john.xml']
];
$res = $ua->post( "$n4jurl/tradition", 'Content-Type' => 'form-data', Content => $t3data);
die("John verse tradition could not be created") unless $res->code == 201;

# 4. Sapientia / collation correction
my $t4data = [
  name => 'Sapientia',
  filetype => 'graphml',
  language => 'Latin',
  public => 'true',
  userId => 'user@example.org',
  file => ['t/data/collatecorr.xml']
];
$res = $ua->post( "$n4jurl/tradition", 'Content-Type' => 'form-data', Content => $t4data);
die("Sapientia tradition could not be created") unless $res->code == 201;

# 5. Arabic snippet
my $t5data = [
  name => 'RTL test',
  direction => 'RL',
  filetype => 'csv',
  language => 'Arabic',
  userId => 'user@example.org',
  file => ['t/data/arabic_snippet.csv']
];
$res = $ua->post( "$n4jurl/tradition", 'Content-Type' => 'form-data', Content => $t5data);
die("RTL test tradition could not be created") unless $res->code == 201;
say("Test data setup complete.")
