package stemmaweb::Model::User;
use strict;
use warnings;
use Moose;
use stemmaweb::Model::Tradition;

# A shadow class for a Neo4J tradition.
BEGIN { extends 'Catalyst::Model' }

has baseurl => (
	is => 'ro',
	isa => Str
);

has id => (
	is => 'ro',
	isa => 'Str'
);

has email => ();

has id => ();

has is_admin => ();

sub BUILDARGS {
	my( $self, $tradition_repo, $id ) = @_;
	# We get passed a tradition_repo and an ID. Construct the init args.
	return {
		baseurl => sprintf("%s/user/%s", $tradition_repo, $id),
		id => $id
	};	
}

## Return a series of ::Tradition objects
sub traditionlist {
	my $self = shift;
}

sub add_tradition {
	my( $self, $tradition ) = @_;
}

sub remove_tradition {
	my( $self, $tradition ) = @_;
}

1;