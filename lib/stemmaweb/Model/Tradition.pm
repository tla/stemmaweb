package stemmaweb::Model::Tradition;
use strict;
use warnings;
use Moose;
use stemmaweb::Model::Witness;
use stemmaweb::Model::Stemma;
use stemmaweb::Model::Relationship;
use stemmaweb::Model::Reading;

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

has name => ();

has language => ();

has is_public => ();

has direction => ();

has owner => ();

has stemweb_jobid => ();

sub BUILDARGS {
	my( $self, $tradition_repo, $id ) = @_;
	# We get passed a tradition_repo and an ID. Construct the init args.
	return {
		baseurl => sprintf("%s/tradition/%s", $tradition_repo, $id),
		id => $id
	};	
}

## TODO check for existence of tradition in DB, with throw/catch; also 
## cache tradition info

sub textinfo {
	my $self = shift;
}

sub set_textinfo {
	my( $self, $params ) = @_;
}

## TODO tradition ownership

sub readings {
	
}

sub reading {
	my( $self, $id ) = @_;
	return stemmaweb::Model::Reading( $self->baseurl, id );
}

sub compress_readings {
	
}

sub start {
	
}

sub end {
	
}

sub paths {
	
}

sub relationship_types {
	
}

sub relationships {
	
}

sub relationship {
	my( $self, @vector ) = @_;
	return stemmaweb::Model::Relationship( $self->baseurl, @vector );
}

sub add_relationship {
	
}

sub delete_relationship {
	
}

sub witnesses {
	
}

sub witness {
	my( $self, $sigil ) = @_;
	return stemmaweb::Model::Witness( $self->baseurl, $sigil );
}

sub stemmata {
	
}

## GET .../stemma/$name
sub stemma {
	my( $self, $name ) = @_;
	return stemmaweb::Model::Stemma( $self->baseurl, $name );
}

## PUT .../stemma
sub putstemma {
	my( $self, $name, $dot ) = @_;
}

## svg, dot, graphml, tei, tsv, csv, xls, xlsx, parsdata
sub export {
	my( $self, $format, $opts ) = @_;
}

sub set_stemweb_jobid {
	my( $self, $jobid ) = @_;
}

sub record_stemweb_result {
	my( $self, $result ) = @_;
}

sub clear_stemweb_jobid {
	my $self = shift;
}

sub run_analysis {
	my( $self, @options ) = @_;
}

1;
