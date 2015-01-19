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


1;
