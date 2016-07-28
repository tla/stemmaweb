package stemmaweb::Model::Directory;
use Moose;
use namespace::autoclean;

use strict;
use warnings;
use File::Which;
use HTTP::Response;
use JSON qw/ decode_json to_json /;
use LWP::UserAgent;
use stemmaweb::Error;

extends 'Catalyst::Model';

has tradition_repo => (
	is => 'ro',
	isa => 'Str'
);

sub ajax {
	# Generic and simple LWP request method for our application that returns
	# a decoded-from-JSON object.
	# Args are the same as for LWP::UA but we will fill in the repo URL.
	my $self = shift;
	my $method = shift;
	my $location = shift;
	my @lwpargs = @_;
	my $url = $self->tradition_repo . $location;
	my $ua = LWP::UserAgent->new();
	my $resp = $ua->$method($url, @lwpargs);
	# Did it work?
	unless( $resp->is_success ) {
		throw_ua( $resp );
	}
	# If so, return the result.
	if( $resp->content_type =~ /json/ ) {
    # Force the content to be decoded from utf-8
		return decode_json( $resp->content );
	} else {
    # Respect the stated content encoding
		return $resp->decoded_content;
	}
}

### Graphviz transmogrification for passed-in dot
sub tradition_as_svg {
  my( $self, $textid, $opts ) = @_;
  unless (File::Which::which( 'dot' )) {
		throw_ua( HTTP::Response->new(500,
			"Need GraphViz installed to output SVG") );
	}
	# TODO implement subgraphs!
  my $want_subgraph = exists $opts->{'from'} || exists $opts->{'to'};

	# Get the dot from the DB
	my $dotstr = $self->ajax('get', '/tradition/$textid/dot');

  # Transmogrify it to SVG
	my @cmd = qw/dot -Tsvg/;
	my( $svg, $err );
	my $dotfile = File::Temp->new();
	## USE FOR DEBUGGING
	# $dotfile->unlink_on_destroy(0);
	binmode $dotfile, ':utf8';
	print $dotfile $dotstr;
	push( @cmd, $dotfile->filename );
	run( \@cmd, ">", binary(), \$svg );
	$svg = decode_utf8( $svg );
	return $svg;
}

sub throw_ua {
	stemmaweb::Error->throw(
		ident => 'Datastore error',
		response => $_[0]
		);
}

# TODO move T::T::Stemma interactions here

__PACKAGE__->meta->make_immutable;

1;
