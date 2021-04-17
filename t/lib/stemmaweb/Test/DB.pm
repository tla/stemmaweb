package stemmaweb::Test::DB;

use strict;
use warnings;
use feature qw/say/;
use Config::Any;
use Digest;
use JSON qw/to_json from_json/;
use LWP::UserAgent;
use URI;

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

sub errorout {
	my ($msg, $res) = @_;
	return sprintf("%s: %s / %s", $msg, $res->code, $res->content);
}

sub new_db {
	my $datadir = shift;
	# Get the URL
	my $cfg = Config::Any->load_stems({stems => ['stemmaweb'], use_ext => 1})->[0];
	my $dircfg = $cfg->{'stemmaweb.conf'}->{Model}->{Directory};
	my $n4jurl = URI->new($dircfg->{tradition_repo});

	# Add the users
	my $ua = LWP::UserAgent->new();
	# Set up the callback for HTTP auth
	if (exists $dircfg->{basic_auth}) {
		# Parse out the URL into the hostname / port
		my $host = $n4jurl->host;
		$host .= ':' . $n4jurl->port unless $n4jurl->port == 80;
		# Now add the credentials
		$ua->ssl_opts( 'verify_hostname' => 0 );
		$ua->credentials( $host, $dircfg->{basic_auth}->{realm},
			$dircfg->{basic_auth}->{user}, $dircfg->{basic_auth}->{pass} );
	}
	## Users that should exist in the beginning
	my $users = [
		{
		  email => 'user@example.org',
		  passphrase => 'UserPass',
		  role => 'user'
		},
		{
		  email => 'admin@example.org',
		  passphrase => 'AdminPass',
		  role => 'admin'
		},
		{
		  email => 'user2@example.org'
		}
	];
	# Delete the users if they don't exist already
	foreach my $u (@$users) {
	  my $tres = $ua->get( "$n4jurl/user/" . $u->{email} . "/traditions");
	  if( $tres->code == 200 ) {
	    my $trads = djson( $tres );
	    foreach my $tr ( @$trads ) {
	      my $res = $ua->delete( "$n4jurl/tradition/" . $tr->{id} );
	      die errorout("Could not delete tradition " . $tr->{id}, $res)
	      	unless $res->code == 200;
	    }
	  }
	  my $res = $ua->delete( "$n4jurl/user/" . $u->{email});
	  # Only create users that have a passphrase set above
	  if (exists $u->{passphrase}) {
		  my $ctx = Digest->new('SHA-256');
		  $ctx->add($u->{passphrase});
		  $u->{passphrase} = $ctx->b64digest();
		  $res = $ua->put( "$n4jurl/user/" . $u->{email}, 'Content-Type' => 'application/json', Content => to_json($u));
		  die errorout("User " . $u->{email} . " not created", $res) unless $res->code == 201;
	  }
	}

	# TODO create openid user

	my $created = {public => [], private => []};

	# Add the traditions
	# 1. Notre besoin
	my $t1data = [
	  name => 'Notre besoin',
	  filetype => 'stemmaweb',
	  language => 'French',
	  userId => 'user@example.org',
	  file => ["$datadir/besoin.xml"]
	];
	my $res = $ua->post( "$n4jurl/tradition", 'Content-Type' => 'form-data', Content => $t1data);
	die errorout("Besoin tradition could not be created", $res) unless $res->code == 201;
	my $t1id = djson( $res )->{tradId};
	push(@{$created->{private}}, $t1id);

    my $t1stemma = {
        identifier => 'stemma',
        dot => filejstr("$datadir/besoin_stemweb.dot")
    };
	$res = $ua->post( "$n4jurl/tradition/$t1id/stemma", 'Content-Type' => 'application/json',
	  Content => to_json({ dot => filejstr("$datadir/besoin_stemweb.dot") }));
	die errorout("Besoin stemma could not be added", $res) unless $res->code == 201;

	# 1a. TODO something owned by the OpenID user

	# 2. Florilegium
	my $t2data = [
	  name => 'Florilegium',
	  filetype => 'csv',
	  language => 'Greek',
	  public => 'true',
	  userId => 'admin@example.org',
	  file => ["$datadir/florilegium.csv"]
	];
	$res = $ua->post( "$n4jurl/tradition", 'Content-Type' => 'form-data', Content => $t2data);
	die errorout("Florilegium tradition could not be created", $res) unless $res->code == 201;
	my $t2id = djson( $res )->{tradId};
	push(@{$created->{public}}, $t2id);
	$res = $ua->post( "$n4jurl/tradition/$t2id/stemma", 'Content-Type' => 'application/json',
	  Content => to_json({ dot => filejstr("$datadir/florilegium.dot") }));
	die errorout("Florilegium stemma could not be added", $res) unless $res->code == 201;

	# 3. John verse
	my $t3data = [
	  name => 'John verse',
	  direction => 'BI',
	  filetype => 'stemmaweb',
	  language => 'Greek',
	  public => 'true',
	  userId => 'user@example.org',
	  file => ["$datadir/john.xml"]
	];
	$res = $ua->post( "$n4jurl/tradition", 'Content-Type' => 'form-data', Content => $t3data);
	die errorout("John verse tradition could not be created", $res) unless $res->code == 201;
	push(@{$created->{public}}, djson( $res )->{tradId});


	# 4. Sapientia / collation correction
	my $t4data = [
	  name => 'Sapientia',
	  filetype => 'stemmaweb',
	  language => 'Latin',
	  public => 'true',
	  userId => 'user@example.org',
	  file => ["$datadir/collatecorr.xml"]
	];
	$res = $ua->post( "$n4jurl/tradition", 'Content-Type' => 'form-data', Content => $t4data);
	die errorout("Sapientia tradition could not be created", $res) unless $res->code == 201;
	push(@{$created->{public}}, djson( $res )->{tradId});

	# 5. Arabic snippet
	my $t5data = [
	  name => 'RTL test',
	  direction => 'RL',
	  filetype => 'csv',
	  language => 'Arabic',
	  userId => 'user@example.org',
	  file => ["$datadir/arabic_snippet.csv"]
	];
	$res = $ua->post( "$n4jurl/tradition", 'Content-Type' => 'form-data', Content => $t5data);
	die errorout("RTL test tradition could not be created", $res) unless $res->code == 201;
	push(@{$created->{private}}, djson( $res )->{tradId});

	# 6. A multi-section tradition
	my $t6data = [
	  name => 'section test',
	  direction => 'LR',
	  filetype => 'stemmaweb',
	  language => 'Latin',
	  userId => 'user@example.org',
	  file => ["$datadir/legendfrag.xml"]
	];
	$res = $ua->post( "$n4jurl/tradition", 'Content-Type' => 'form-data', Content => $t6data);
	die errorout("First half of multi-section tradition could not be created", $res) unless $res->code == 201;
	my $t6id = djson( $res )->{tradId};
	push(@{$created->{private}}, $t6id);
	$t6data = [
	  name => 'section test',
	  filetype => 'stemmaweb',
	  file => ["$datadir/lf2.xml"]
	];
	$res = $ua->post( "$n4jurl/tradition/$t6id/section", 'Content-Type' => 'form-data', Content => $t6data);
	die errorout("Second half of multi-section tradition could not be created", $res) unless $res->code == 201;
	say("Test data setup complete.");
	return $created;
}

1;
