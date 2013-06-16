package stemmaweb::View::GraphML;

use strict;
use base 'Catalyst::View';

sub process {
	my( $self, $c ) = @_;
	$c->res->content_type( 'application/graphml+xml' );
	$c->res->content_encoding( 'UTF-8' );
	$c->res->output( $c->stash->{result} );
}

1;