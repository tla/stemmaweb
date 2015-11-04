package stemmaweb::Neo4J::User;
use strict;
use warnings;
use Moose;
use stemmaweb::Neo4J::Tradition;
use stemmaweb::Neo4J::Util;

has baseurl => (
	is => 'ro',
	isa => 'Str'
);

has id => (
	is => 'ro',
	isa => 'Str',
);

has password => (
	is => 'ro',
	isa => 'Str',
	writer => '_set_password'
);

has email => (
	is => 'ro',
	isa => 'Str',
	writer => '_set_email'
);

has role => (
	is => 'ro',
	isa => 'Str',
	writer => '_set_role'
);

has active => (
	is => 'ro',
	isa => 'Bool',
	writer => '_set_active'
);

sub BUILDARGS {
	my( $class, @args ) = @_;
	if( @args == 2 ) {
		# We get passed a tradition_repo and an ID. Construct the init args.
		return {
			baseurl => sprintf("%s/user/%s", @args ),
			id => $args[1]
		};	
	}
}

sub BUILD {
	## Load the user from the DB.
	my $self = shift;
	load( $self );
}

## Return a series of ::Tradition objects belonging to the user
sub traditionlist {
	my $self = shift;
	my $requesturl = $self->baseurl . "/traditions";
	my $resp = LWP::UserAgent->new()->get( $requesturl );
	my $content;
	if( $resp->is_success ) {
		$content = response_content( $resp );
	} else {
		throw_ua( $resp );
	}
	return @$content;
}

sub add_tradition {
	my( $self, $tradition ) = @_;
}

sub remove_tradition {
	my( $self, $tradition ) = @_;
}

__PACKAGE__->meta->make_immutable;

1;