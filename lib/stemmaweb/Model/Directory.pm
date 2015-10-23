package stemmaweb::Model::Directory;
use strict;
use warnings;
use Moose;
use stemmaweb::Model::User;
use stemmaweb::Model::Tradition;

# A shadow class for the root of the Neo4J service.
BEGIN { extends 'Catalyst::Model' }

has tradition_repo => (
	is => 'ro',
	isa => 'Str'
);

## GET /traditions
sub traditionList {
	my $self = shift;
}

## PUT /tradition
sub newtradition {
	my( $self, $req ) = @_;
}

## GET /user/$ID
sub find_user {
	my( $self, $params ) = @_;
	return stemmaweb::Model::User->new($self->tradition_repo, $params);
}

## GET /tradition/$ID
sub tradition {
	my( $self, $id ) = @_;
	return stemmaweb::Model::Tradition->new($self->tradition_repo, $id);
}

1;
