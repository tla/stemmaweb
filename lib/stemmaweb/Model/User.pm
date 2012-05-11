package stemmaweb::Model::User;
use strict;
use warnings;
use Moose;
use Text::Tradition::UserStore;

extends 'Catalyst::Model::KiokuDB';

has '+model_class' => ( default => 'Text::Tradition::UserStore' );

1;

=head1 NAME

stemmaweb::Model::User - User/Auth KiokuDB model for stemmaweb

=head1 SYNOPSIS

    ## CONFIGURATION, in .conf file (this is the default setting)
    <Model::User>
      model_class Text::Tradition::UserStore
    </Model::User>

    <Plugin::Authentication>
      <default>
        <credential>
           class          'Password'
           password_field 'password'
           password_type  'self_check'
        </credential>
        <store>
           class          'Model::KiokuDB'
           model_name     'User'
        </store>
      </default>
    </Plugin::Authentication>


=head1 DESCRIPTION

This is the User Model used as a Authentication Store (using
::Store::Model::KiokuDB) for stemmaweb user authentication.

This separate model allows us to have self-contained user storage,
which is replaceable. The default uses Text::Tradition::UserStore and
stores the Users alongside the Traditions.

To replace the source of users for authentication, add the
configuration shown in the L</SYNOPSIS> to your stemmaweb.conf file,
and adjust as necessary.
