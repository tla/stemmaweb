package stemmaweb::Model::Stemma;
use strict;
use warnings;
use LWP::UserAgent;
use Moose;

# A shadow class for a Neo4J tradition.
BEGIN { extends 'Catalyst::Model' }

has baseurl => (
	is => 'ro',
	isa => Str
);

has identifier => (
	is => 'ro',
	isa => 'Str',
	writer => '_set_identifier'
);

has is_undirected => (
	is => 'ro',
	isa => 'Boolean',
	writer => '_set_is_undirected'
);

has from_jobid => (
	is => 'ro',
	isa => 'Int',
	writer => '_set_from_jobid'
));


sub BUILDARGS {
	my( $self, $tradition_repo, $id ) = @_;
	# We get passed a tradition URL and a name. Construct the init args.
	return {
		baseurl => sprintf("%s/stemma/%s", $tradition_repo, $identifier),
		identifier => $id
	};	
}

sub BUILD {
	my $self = shift;
	## Load the stemma from the DB.
	my $ua = LWP::UserAgent->new();
	my $resp = $ua->get( $self->baseurl );
	my $parameters ;
	if( $resp->is_success ) {
		$parameters = decode_json( $resp->content );
	} else {
	
	}
	foreach my $key ( keys %$parameters ) {
		$self->_set_$key( $parameters->{$key} );
	}	
}

sub alter {
	my( $self, $dot ) = @_;
		
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