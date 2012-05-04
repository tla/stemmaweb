package stemmaweb::Model::User;
use strict;
use warnings;
use Moose;
use Text::Tradition::UserStore;

extends 'Catalyst::Model::KiokuDB';

has '+model_class' => ( default => 'Text::Tradition::UserStore' );

1;
