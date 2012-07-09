package stemmaweb;
use Moose;
use namespace::autoclean;

use Catalyst::Runtime 5.80;

use Search::GIN::Extract::Class;
use Search::GIN::Extract::Attributes;
use Search::GIN::Extract::Multiplex;

# Set flags and add plugins for the application.
#
# Note that ORDERING IS IMPORTANT here as plugins are initialized in order,
# therefore you almost certainly want to keep ConfigLoader at the head of the
# list if you're using it.
#
#         -Debug: activates the debug mode for very useful log messages
#   ConfigLoader: will load the configuration from a Config::General file in the
#                 application's home directory
# Static::Simple: will serve static files from the application's root
#                 directory

use Catalyst qw/
    ConfigLoader
    Static::Simple
    Unicode::Encoding
    Authentication
    Session
    Session::Store::File
    Session::State::Cookie
    StatusMessage
    StackTrace
/;

extends 'Catalyst';

our $VERSION = '0.01';

# Configure the application.
#
# Note that settings in stemmaweb.conf (or other external
# configuration file that you set up manually) take precedence
# over this when using ConfigLoader. Thus configuration
# details given here can function as a default configuration,
# with an external configuration file acting as an override for
# local deployment.

__PACKAGE__->config(
    name => 'stemmaweb',
    # Disable deprecated behavior needed by old applications
    disable_component_resolution_regex_fallback => 1,
    default_view => 'TT',
	'View::JSON' => {
		expose_stash => 'result',
	},
	'View::TT' => {
		INCLUDE_PATH => [
			stemmaweb->path_to( 'root', 'src' ),
		],
	},
    ## kiokudb auth store testing
    'Plugin::Authentication' => {
        default => {
            credential => {
                class => 'Password',
                password_field => 'password',
                password_type => 'self_check',
            },
            store => {
                class => 'Model::KiokuDB',
                model_name => 'Directory',
            },
        },
        openid => {
            credential => {
                class => 'OpenID',
                extensions => ['http://openid.net/srv/ax/1.0' => 
                    {
                        ns          => 'ax',
                        uri         => 'http://openid.net/srv/ax/1.0',
                        mode        => 'fetch_request',
                        required    => 'email',
                        'type.email' => 'http://axschema.org/contact/email',
                        # type        => {
                        #     email => 'http://axschema.org/contact/email'
                        # }
                    }
                    ],
            },
            store => {
                class => 'Model::KiokuDB',
                model_name => 'Directory',
            },
            auto_create_user => 1,
        },
    },
    ## Auth with CatalystX::Controller::Auth
    'Controller::Users' => {
        model => 'User',
        login_id_field => 'username',
        login_db_field => 'username',
        action_after_login => '/index',
        action_after_register => '/index', 
        register_email_from  => '"MyApp" <somebody@example.com>',
        register_email_subject => 'Registration to stemmaweb',
        register_email_template_plain => 'register-plain.tt',
        realm => 'default',
        login_fields => { openid => [qw/openid_identifier/],
                          default => [qw/username password remember/],
        },
    },
    'View::Email::Template' => {
        stash_key => 'email_template',
    },

    recaptcha => {
        pub_key => '',
        priv_key => '',
    },
);

# Start the application
__PACKAGE__->setup();


=head1 NAME

stemmaweb - Catalyst based application

=head1 SYNOPSIS

    script/stemmaweb_server.pl

=head1 DESCRIPTION

[enter your description here]

=head1 SEE ALSO

L<stemmaweb::Controller::Root>, L<Catalyst>

=head1 AUTHOR

Tara L Andrews

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

1;
