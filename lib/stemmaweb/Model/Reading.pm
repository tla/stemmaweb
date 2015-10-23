package stemmaweb::Model::Reading;
use strict;
use warnings;
use Moose;

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

has text => ();

has is_meta => ();

has is_start => ();

has is_end => ();

has grammar_invalid => ();

has is_nonsense => ();

has normal_form => ();

has witnesses => ();

has lexemes => ();



sub BUILDARGS {
	my( $self, $tradition_repo, $id ) = @_;
	# We get passed a tradition URL and a vector. Construct the URL.
	# Reading URLS don't have the tradition/ID/ prepended to them.
	$tradition_repo =~ s!/tradition.*$!!;
	return {
		baseurl => sprintf("%s/reading/%s", $tradition_repo, $id),
		sigil => $id
	};	
}

sub merge {
	
}

sub duplicate {
	
}

sub split {
	
}

sub related_readings {
	
}

1;