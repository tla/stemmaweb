package stemmaweb::View::CSV;
use Moose;
use namespace::autoclean;

extends 'Catalyst::View';

sub process {
        my( $self, $c ) = @_;
        $c->res->content_type( 'text/csv' );
        $c->res->content_encoding( 'UTF-8' );
        $c->res->header( 'Content-Disposition', 
        	sprintf( "attachment; filename=\"%s.csv\"", $c->stash->{name} ) );
        $c->res->output( $c->stash->{result} );
}

=head1 NAME

stemmaweb::View::CSV - Catalyst View

=head1 DESCRIPTION

Catalyst View.


=encoding utf8

=head1 AUTHOR

Tara L Andrews

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

__PACKAGE__->meta->make_immutable;

1;
