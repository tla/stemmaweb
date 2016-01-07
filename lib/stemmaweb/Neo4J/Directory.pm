package stemmaweb::Neo4J::Directory;
use strict;
use warnings;
use JSON qw/ from_json to_json /;
use LWP::UserAgent;
use Moose;
use stemmaweb::Neo4J::User;
use stemmaweb::Neo4J::Tradition;
use stemmaweb::Neo4J::Util;

has tradition_repo => (
	is => 'ro',
	isa => 'Str'
);

## GET /traditions
sub traditionlist {
	my( $self, $public ) = @_;
	my $requesturl = $self->tradition_repo . "/traditions";
	$requesturl .= "?public=true" if $public;
	my $resp = LWP::UserAgent->new()->get( $requesturl );
	my $content;
	if( $resp->is_success ) {
		$content = response_content( $resp );
	} else {
		throw_ua( $resp );
	}
	return @$content;
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
	
	# Figure out the filetype unless it exists.
	my $filetype = $req->param('filetype');
	unless( $filetype ) {
		$filetype = $upload->type;
		$filetype =~ s/^.*\///;
		$filetype = 'tsv' if $filetype eq 'txt';
	}

	my %newopts = (
		'name' => $req->param('name') || 'Uploaded tradition',
		'language' => $req->param('language') || 'Default',
		'public' => $req->param('public') ? 'true' : 'false',
		'direction' => $req->param('direction') || 'LR',
		'userId' => $user->id,
		'filetype' => $filetype,
		'file' => $fileargs
	);
	
	my $ua = LWP::UserAgent->new();
	my $resp = $ua->put( $self->tradition_repo . "/tradition", \%newopts, 
		'Content-Type' => 'form-data' );
	if( $resp->is_success ) {
		return response_content( $resp );
	} else {
		throw_ua( $resp );
	}
}

## PUT /user
sub create_user {
	my( $self, $user ) = @_;
	my $newopts = {
		'id' => $user->id,
		'role' => $user->is_admin ? 'admin' : 'user',
		'email' => $user->email,
		'active' => $user->active ? JSON::true : JSON::false,
	};
	
	my $ua = LWP::UserAgent->new();
	$DB::single = 1;
	my %payload = (
		'Content-Type' => 'application/json',
		'Content' => to_json( $newopts )
	);
	my $resp = $ua->put( $self->tradition_repo . "/user", %payload );
	if( $resp->is_success ) {
		return response_content( $resp );
	} else {
		throw_ua( $resp );
	}
}	

## GET /user/$ID
sub find_user {
	my( $self, $params ) = @_;
	return stemmaweb::Neo4J::User->new($self->tradition_repo, $params);
}

## GET /tradition/$ID
sub tradition {
	my( $self, $id ) = @_;
	return stemmaweb::Neo4J::Tradition->new($self->tradition_repo, $id);
}

__PACKAGE__->meta->make_immutable;

1;
