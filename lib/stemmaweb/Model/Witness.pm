package stemmaweb::Model::Witness;
use strict;
use warnings;
use Moose;

# A shadow class for a Neo4J tradition.
BEGIN { extends 'Catalyst::Model' }

has baseurl => (
	is => 'ro',
	isa => Str
);

has sigil => (
	is => 'ro',
	isa => 'Str'
);

sub BUILDARGS {
	my( $self, $tradition_repo, $id ) = @_;
	# We get passed a tradition URL and a sigil. Construct the init args.
	return {
		baseurl => sprintf("%s/witness/%s", $tradition_repo, $id),
		sigil => $id
	};	
}

sub text {
	my( $self, $start, $end ) = @_;
}

sub readings {
	my $self = shift;
}

1;