package stemmaweb::Neo4J::Relationship;
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
	my( $self, $tradition_repo, @vector ) = @_;
	# We get passed a tradition URL and a vector. Look up the relationship
	# by source/target ID, and construct the URL.
	my $id = fetch_relationship( $tradition_repo, @vector );
	return {
		baseurl => sprintf("%s/relationship/%s", $tradition_repo, $id),
		sigil => $id
	};	
}

sub fetch_relationship {
	
}

__PACKAGE__->meta->make_immutable;

1;