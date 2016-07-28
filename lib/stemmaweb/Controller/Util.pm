package stemmaweb::Controller::Util;
use strict;
use warnings;
use Exporter qw/ import /;
use JSON;
use TryCatch;
use vars qw/ @EXPORT /;

@EXPORT = qw/ load_tradition json_error json_bool /;

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
    		( $textinfo->{userId} eq $user->id ) );
    }
	# Text doesn't belong to us, so maybe it's public?
	return 'readonly' if $textinfo->{public};

	# ...nope. Forbidden!
	return _json_error( $c, 403, 'You do not have permission to view this tradition.' );
}

# Helper to load and check the permissions on a tradition
sub load_tradition {
	my( $c, $textid ) = @_;
	my $textinfo;
	try {
		$textinfo = $c->model('Directory')->ajax('get', '/tradition/$textid');
	} catch( stemmaweb::Error $e ) {
			return _json_error( $c, $e->status, $e->message );
	}
	my $ok = _check_permission( $c, $textinfo );
	return( $textinfo, $ok );
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
