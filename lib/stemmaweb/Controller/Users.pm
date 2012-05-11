package stemmaweb::Controller::Users;
use Moose;
use namespace::autoclean;

BEGIN {extends 'CatalystX::Controller::Auth'; }

=head1 NAME

stemmaweb::Controller::Users - Catalyst Controller

=head1 DESCRIPTION

Catalyst Controller.

=head1 METHODS

=cut

sub base :Chained('/') :PathPart('') :CaptureArgs(0)
{
        my ( $self, $c ) = @_;
 
        $self->next::method( $c );
}

=head2 index

=cut

sub index :Path :Args(0) {
    my ( $self, $c ) = @_;

    $c->response->body('Matched stemmaweb::Controller::Users in Users.');
}


=head1 AUTHOR

A clever guy

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

__PACKAGE__->meta->make_immutable;

1;
