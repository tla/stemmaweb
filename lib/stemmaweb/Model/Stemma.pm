package stemmaweb::Model::Stemma;
use strict;
use warnings;
use Moose;

# A shadow class for a Neo4J tradition.
BEGIN { extends 'Catalyst::Model' }

has baseurl => (
	is => 'ro',
	isa => Str
);

has identifier => (
	is => 'ro',
	isa => 'Str'
);

has is_undirected => (
	is => 'ro',
	isa => 'Boolean'
);

has from_jobid => ();


sub BUILDARGS {
	my( $self, $tradition_repo, $id ) = @_;
	# We get passed a tradition URL and a name. Construct the init args.
	return {
		baseurl => sprintf("%s/stemma/%s", $tradition_repo, $identifier),
		identifier => $id
	};	
}

sub root_graph {
	my( $self, $archetype ) = @_;
}

# svg, dot
sub export {
	my( $self, $format ) = @_;
}

# i.e. logical dot
# $params = {linesep => '|n'} or what have you
sub editable {
	my( $self, $params ) = @_;
}

## TODO port graphsvg (i.e. extended with layer wits) logic

1;