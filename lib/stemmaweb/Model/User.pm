package stemmaweb::Model::User;
use strict;
use warnings;
use Moose;
use stemmaweb::Model::Tradition;

# A shadow class for a Neo4J tradition.
BEGIN { extends 'Catalyst::Model' }

has baseurl => (
	is => 'ro',
	isa => 'Str'
);

has id => (
	is => 'ro',
	isa => 'Str'
);

has email => (
	is => 'ro',
	isa => 'Str',
	writer => '_set_email'
);

sub BUILDARGS {
	my( $self, $tradition_repo, $id ) = @_;
	# We get passed a tradition_repo and an ID. Construct the init args.
	return {
		baseurl => sprintf("%s/user/%s", $tradition_repo, $id),
		id => $id
	};	
}

## Return a series of ::Tradition objects belonging to the user
sub traditionlist {
	my $self = shift;
	my $requesturl = $self->baseurl . "/traditions";
	my $resp = $LWP::UserAgent->new()->get( $requesturl );
	my $content;
	if( $resp->is_success ) {
		$content = response_content( $resp );
	} else {
		throw_ua( $resp );
	}
}

sub add_tradition {
	my( $self, $tradition ) = @_;
}

sub remove_tradition {
	my( $self, $tradition ) = @_;
}

1;