package stemmaweb::Neo4J::Witness;
use strict;
use warnings;
use Moose;

has baseurl => (
	is => 'ro',
	isa => 'Str'
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

__PACKAGE__->meta->make_immutable;

1;