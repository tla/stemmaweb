package stemmaweb::Controller::Users;
use Moose;
use namespace::autoclean;

BEGIN {extends 'CatalystX::Controller::Auth'; }
with 'Catalyst::TraitFor::Controller::reCAPTCHA';

=head1 NAME

stemmaweb::Controller::Users - Catalyst Controller

=head1 DESCRIPTION

The Users controller is based on L<CatalystX::Controller::Auth>, see
there for most of the functionality. Any localised parts are described
below.

This controller uses L<Catalyst::TraitFor::Controller::reCAPTCHA> to
create and check a reCaptcha form shown on the C<register> form to
help prevent spam signups.

=head1 METHODS

=cut

sub base :Chained('/') :PathPart('') :CaptureArgs(0)
{
        my ( $self, $c ) = @_;

        $self->next::method( $c );
}

=head2 index

The index action is not currently used.

=cut

sub index :Path :Args(0) {
    my ( $self, $c ) = @_;

    $c->response->body('Matched stemmaweb::Controller::Users in Users.');
}

=head2 login with openid

Logging in with openid/google requires two passes through the login
action, on the 2nd pass the C<openid-check> value is passed in when
the openid providing webserver links the user back to the stemmaweb
site. This adaption to the C<login> action sets the realm we are
authenticating against to be C<openid> in this case.

=cut

before login => sub {
  my($self, $c) = @_;
  $c->req->param( realm => 'openid')
    if $c->req->param('openid-check');
};

=head2 register with recaptcha

This adapts the C<register> action to add the recaptcha HTML to the
page, and verify the recaptcha info entered is correct when the form
is submitted. If the recaptcha is not correct, we just redisplay the
form with an error message.

=cut

before register => sub {
    my ($self, $c) = @_;

    ## Puts HTML into stash in "recaptcha" key.
    $c->forward('captcha_get');

    ## When submitting, check recaptcha passes, else re-draw form
    if($c->req->method eq 'POST') {
        if(!$c->forward('captcha_check')) {
            
            ## Need these two lines to detach, so end can draw the correct template again:
            my $form = $self->form_handler->new( active => [ $self->login_id_field, 'password', 'confirm_password' ] );
            $c->stash( template => $self->register_template, form => $form );

            $c->detach();
        }
    }
};

=head1 AUTHOR

A clever guy

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

__PACKAGE__->meta->make_immutable;

1;
