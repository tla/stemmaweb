package stemmaweb::Model::Directory;
use strict;
use warnings;
use JSON qw/ from_json /;
use LWP::UserAgent;
use Moose;
use stemmaweb::Model::User;
use stemmaweb::Model::Tradition;
use stemmaweb::Model::Util;

# A shadow class for the root of the Neo4J service.
BEGIN { extends 'Catalyst::Model' }

has tradition_repo => (
	is => 'ro',
	isa => 'Str'
);

## GET /traditions
sub traditionList {
	my( $self, $public ) = @_;
	my $requesturl = $self->baseurl . "/traditions";
	$requesturl .= "?public=true" if $public;
	my $resp = $LWP::UserAgent->new()->get( $requesturl );
	my $content;
	if( $resp->is_success ) {
		$content = response_content( $resp );
	} else {
		throw_ua( $resp );
	}
}

## PUT /tradition
sub newtradition {
	my( $self, $user, $req ) = @_;
	
	# Grab the file upload, check its name/extension, and call the
	# appropriate parser(s).
	my $upload = $req->upload('file');
	my $fileargs = [ $upload->tempname, $upload->filename ];
	if( $upload->type ) {
		push( @$fileargs, 'Content-Type', $upload->type );
	}
	if( $upload->charset ) {
		push( @$fileargs, 'Content-Encoding', $upload->charset );
	}

	my %newopts = (
		'name' => $req->param('name') || 'Uploaded tradition',
		'language' => $req->param('language') || 'Default',
		'public' => $req->param('public') ? 1 : undef,
		'direction' => $req->param('direction') || 'LR',
		'userId' => $user->id,
		'filetype' => $req->param('filetype'),
		'file' => $fileargs
	);
	
	my $ua = LWP::UserAgent->new();
	my $resp = $ua->put( $self->tradition_repo . "/tradition", \%newopts );
	if( $resp->is_success ) {
		return response_content( $resp );
	} else {
		throw_ua( $resp );
	}
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
