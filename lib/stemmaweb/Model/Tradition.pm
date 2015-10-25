package stemmaweb::Model::Tradition;
use strict;
use warnings;
use LWP::UserAgent;
use Moose;
use stemmaweb::Model::Witness;
use stemmaweb::Model::Stemma;
use stemmaweb::Model::Relationship;
use stemmaweb::Model::Reading;
use stemmaweb::Model::Util;

# A shadow class for a Neo4J tradition.
BEGIN { extends 'Catalyst::Model' }

has baseurl => (
	is => 'ro',
	isa => 'Str'
);

has id => (
	is => 'ro',
	isa => 'Str',
	writer => '_set_id',
);

has name => (
	is => 'ro',
	isa => 'Str',
	writer => '_set_name',
);

has language => (
	is => 'ro',
	isa => 'Str',
	writer => '_set_language',
);

has is_public => (
	is => 'ro',
	isa => 'Bool',
	writer => '_set_is_public',
);

has direction => (
	is => 'ro',
	isa => 'Str',
	writer => '_set_direction',
);

has owner => (
	is => 'ro',
	isa => 'stemmaweb::Model::User',
	writer => '_set_user',
);

has stemweb_jobid => (
	is => 'ro',
	isa => 'Int',
	writer => '_set_stemweb_jobid',
);

sub BUILDARGS {
	my( $class, $tradition_repo, $id ) = @_;
	# We get passed a tradition_repo and an ID. Construct the init args.
	return {
		baseurl => sprintf("%s/tradition/%s", $tradition_repo, $id),
		id => $id
	};	
}

sub BUILD {
	## Load the tradition from the DB.
	load( @_ );
}

sub textinfo {
	my $self = shift;
	my $textinfo = {
		textid => $self->id,
		name => $self->name,
		direction => $self->direction || 'LR',
		public => $self->is_public || 0,
		owner => $self->owner ? $self->owner->email : undef,
		language => $self->language || 'Default',
		stemweb_jobid => $self->stemweb_jobid || 0,
		witnesses => [ map { $_->sigil } $self->witnesses ],
		# TODO Send them all with appropriate parameters so that the
		# client side can choose what to display.
		reltypes => [ map { $_->name } $self->relationship_types ]
	};

}

sub set_textinfo {
	my( $self, $params ) = @_;
	my $ua = LWP::UserAgent->new;
	my $resp = $ua->post( $self->baseurl, $params );
	# Save the new parameters to our own object
	load_from_response( $self, $resp );
}

## TODO tradition ownership

sub readings {
	my $self = shift;
	my $ua = LWP::UserAgent->new();
	my $resp = $ua->get( $self->baseurl . "/readings" );
	if( $resp->is_success ) {
		return response_content( $resp );
	} else {
		throw_ua( $resp );
	}
}

sub reading {
	my( $self, $id ) = @_;
	return stemmaweb::Model::Reading->new( $self->baseurl, $id );
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
	my $self = shift;
	my $ua = LWP::UserAgent->new();
	my $resp = $ua->get( $self->baseurl . "/readings" );
	if( $resp->is_success ) {
		return response_content( $resp );
	} else {
		throw_ua( $resp );
	}	
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
	my $self = shift;
	my $ua = LWP::UserAgent->new();
	my $resp = $ua->get( $self->baseurl . "/witnesses" );
	if( $resp->is_success ) {
		return response_content( $resp );
	} else {
		throw_ua( $resp );
	}	
}

sub witness {
	my( $self, $sigil ) = @_;
	return stemmaweb::Model::Witness( $self->baseurl, $sigil );
}

## Needs to return objects with svg, identifier, and rootedness
sub stemmata {
	my $self = shift;
	my $ua = LWP::UserAgent->new();
	my $resp = $ua->get( $self->baseurl . "/stemmata" );
	if( $resp->is_success ) {
		my $stemmalist = [];
		foreach my $dot ( response_content( $resp ) ) {
			push( @$stemmalist, stemmaweb::Model::Stemma->new(dot => $dot) );
		}
		return $stemmalist;
	} else {
		throw_ua( $resp );
	}
}

## GET .../stemma/$name
sub stemma {
	my( $self, $name ) = @_;
	return stemmaweb::Model::Stemma( $self->baseurl, $name );
}

## PUT .../stemma
sub putstemma {
	my( $self, $dot ) = @_;
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
