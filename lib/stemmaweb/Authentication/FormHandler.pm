package stemmaweb::Authentication::FormHandler;

use HTML::FormHandler::Moose;
use namespace::autoclean;

extends 'HTML::FormHandlerX::Form::Login';

has_field email  => (
    type => 'Text',
    required => 0,
);

has_field id_token => (
    type => 'Text',
    required => 0,
);

has_field password => (
    type            => 'Password',
    minlength       => 8,
    required        => 1,
    messages        => { required => 'Your password is required.' },
    tags            => { no_errors => 1 },
    wrapper_attr    => { id => 'field-password', },
    inactive        => 1,
);

1;
