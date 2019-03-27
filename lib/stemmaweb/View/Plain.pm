package stemmaweb::View::Plain;

use strict;
use warnings;
use base 'Catalyst::View';
use Moose;

=head1 NAME

stemmaweb::View::Plain - Catalyst view for plaintext files.

=head1 SYNOPSIS

See L<stemmaweb>

=head1 DESCRIPTION

Catalyst plaintext View.

=head1 AUTHOR

Tara Andrews

=head1 LICENSE

This library is free software, you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

has stash_key => (
    is => 'rw',
    isa => 'Str',
    default => 'plain'
);

sub process {
    my $self = shift;
    my ($c) = @_;

    my $template = $c->stash->{ 'template' };
    my $content  = $self->render( $c, $template, $c->stash );

    my $content_type = "text/plain";
    $c->res->headers->header( "Content-Type" => "text/plain" )
        if ( $c->res->headers->header( "Content-Type" ) eq "" );
    $c->res->body( $content );
}

sub render {
    my $self = shift;
    my ( $c, $template, $args ) = @_;

    my $stash_key = $self->stash_key;
    my $content   = $c->stash->{ $stash_key } || $c->response->body;

    return $content;
}

no Moose;
__PACKAGE__->meta->make_immutable;

1;
