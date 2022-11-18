#!/usr/bin/env perl
# IMPORTANT: if you delete this file your app will not work as
# expected.  You have been warned.
use inc::Module::Install;
use Module::Install::Catalyst; # Complain loudly if you don't have
                               # Catalyst::Devel installed or haven't said
                               # 'make dist' to create a standalone tarball.

name 'stemmaweb';
all_from 'lib/stemmaweb.pm';

# This should reflect the config file format you've chosen
requires 'Config::General';
# See Catalyst::Plugin::ConfigLoader for supported formats

# Catalyst libraries
requires 'Catalyst::Runtime' => '5.90126';
requires 'Catalyst::Plugin::Cache';
requires 'Catalyst::Plugin::ConfigLoader';
requires 'Catalyst::Plugin::StackTrace';
requires 'Catalyst::Plugin::Static::Simple';
requires 'Catalyst::Plugin::Unicode::Encoding';
requires 'Catalyst::Action::RenderView';
requires 'Catalyst::Authentication::Credential::OpenID';
requires 'Catalyst::View::Download::Plain';
requires 'Catalyst::View::JSON';
requires 'Catalyst::View::TT';
requires 'Catalyst::View::Email::Template';
requires 'Plack::Middleware::ReverseProxyPath';
## Auth:
requires 'Catalyst::Plugin::Authentication';
requires 'Catalyst::Plugin::Session';
requires 'Catalyst::Plugin::Session::Store::File';
requires 'Catalyst::Plugin::Session::State::Cookie';
requires 'CatalystX::Controller::Auth' => '0.22';
requires 'Catalyst::TraitFor::Request::ProxyBase';
requires 'Catalyst::TraitFor::Controller::reCAPTCHA';
requires 'LWP::Protocol::https';
##
requires 'Bio::Phylo::IO';
requires 'Cache::FileCache';
requires 'Crypt::OpenSSL::X509';
requires 'Crypt::OpenSSL::RSA';
requires 'Date::Parse';
requires 'Digest::SHA256';
requires 'File::chdir';
requires 'File::Temp';
requires 'File::Which';
requires 'Graph';
requires 'Graph::Reader::Dot';
requires 'IO::All';
requires 'IPC::Run';
requires 'JSON::WebToken';
requires 'JSON::XS';
requires 'List::Util';
requires 'LWP::Protocol::https';
requires 'MIME::Base64';
requires 'Moose';
requires 'strictures' => '2';
requires 'Throwable::X';
requires 'TryCatch';
requires 'URI::Escape';
requires 'XML::LibXML';
requires 'namespace::autoclean';
requires 'strictures';

test_requires 'Test::More' => '0.88';
test_requires 'LWP::Protocol::PSGI';
test_requires 'Test::WWW::Mechanize';
test_requires 'IPC::System::Simple';
test_requires 'Config::Any';
test_requires 'LWP::UserAgent';
catalyst;

install_script glob('script/*.pl');
auto_install;
WriteAll;
