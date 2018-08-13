package stemmaweb::View::TSV;
use Moose;
use Encode qw/ encode /;
use namespace::autoclean;

extends 'Catalyst::View';

sub process {
        my( $self, $c ) = @_;
        $c->res->content_type( 'text/tab-separated-values' );
        $c->res->content_encoding( 'UTF-8' );
        $c->res->header( 'Content-Disposition',
            sprintf( "attachment; filename=\"%s.tsv\"", $c->stash->{name} ) );
        $c->res->output( encode( 'UTF-8', $c->stash->{result} ) );
}

=head1 NAME

stemmaweb::View::TSV - Catalyst View

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
