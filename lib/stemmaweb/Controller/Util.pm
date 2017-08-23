package stemmaweb::Controller::Util;
use strict;
use warnings;
use Exporter qw/ import /;
use JSON;
use Text::Tradition;
use Text::Tradition::Stemma;
use TryCatch;
use vars qw/ @EXPORT /;

@EXPORT = qw/ load_tradition load_old_tradition load_stemma json_error json_bool /;

=head1 NAME

stemmaweb::Controller::Util - Catalyst Controller utility functions

=head1 DESCRIPTION

Useful helpers for the Catalyst controllers

=head1 METHODS

=cut


# Helper to check what permission, if any, the active user has for
# the given tradition
sub _check_permission {
	my( $c, $textinfo ) = @_;
    my $user = $c->user_exists ? $c->user->get_object : undef;
    if( $user ) {
    	return 'full' if ( $user->is_admin ||
    		( $textinfo->{owner} eq $user->id ) );
    }
	# Text doesn't belong to us, so maybe it's public?
	return 'readonly' if $textinfo->{is_public};

	# ...nope. Forbidden!
	return json_error( $c, 403, 'You do not have permission to view this tradition.' );
}

# Helper to load and check the permissions on a tradition
sub load_tradition {
	my( $c, $textid ) = @_;
	my $textinfo;
	try {
		$textinfo = $c->model('Directory')->ajax('get', "/tradition/$textid");
	} catch( stemmaweb::Error $e ) {
			return json_error( $c, $e->status, $e->message );
	}
	my $ok = _check_permission( $c, $textinfo );
	return( $textinfo, $ok );
}

sub load_old_tradition {
	my ($c, $textid) = @_;
	my $graphml;
	$graphml = $c->model('Directory')->ajax('get', "/tradition/$textid/stemmaweb");
	return Text::Tradition->new(input => 'self', string => $graphml);
}

sub load_stemma {
	my( $stemmadata ) = @_;
	return Text::Tradition::Stemma->new(
		dot => $stemmadata->{dot},
		is_undirected => $stemmadata->{is_undirected} == JSON::true,
		identifier => $stemmadata->{identifier}
	);
}

# Get (and parse) the GraphML directly, to turn it into the sort of graph we need.
sub generate_svg {
	my( $c, $textid ) = @_;
	my $graphml = $c->model('Directory')->ajax('get', "/tradition/$textid/graphml");
	
}

# Helper to throw a JSON exception
sub json_error {
	my( $c, $code, $errmsg ) = @_;
	$c->response->status( $code );
	$c->stash->{'result'} = { 'error' => $errmsg };
	$c->forward('View::JSON');
	return 0;
}

sub json_bool {
	return $_[0] ? JSON::true : JSON::false;
}

=encoding utf8

=head1 AUTHOR

Tara Andrews

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

1;
