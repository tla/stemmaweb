package stemmaweb::Controller::Util;
use strict;
use warnings;
use Exporter qw/ import /;
use JSON;
use stemmaweb::Model::Stemma;
use TryCatch;
use XML::LibXML;
use XML::LibXML::XPathContext;
use vars qw/ @EXPORT /;

@EXPORT =
  qw/ load_tradition load_stemma section_metadata json_error json_bool /;

=head1 NAME

stemmaweb::Controller::Util - Catalyst Controller utility functions

=head1 DESCRIPTION

Useful helpers for the Catalyst controllers

=head1 METHODS

=cut

# Helper to check what permission, if any, the active user has for
# the given tradition
sub _check_permission {
    my ($c, $textinfo) = @_;
    my $user = $c->user_exists ? $c->user->get_object : undef;
    if ($user) {
        return 'full'
          if ($user->is_admin
            || ($textinfo->{owner} eq $user->id));
    }

    # Text doesn't belong to us, so maybe it's public?
    return 'readonly' if $textinfo->{is_public};

    # ...nope. Forbidden!
    return json_error($c, 403,
        'You do not have permission to view this tradition.');
}

# Helper to load and check the permissions on a tradition
sub load_tradition {
    my ($c, $textid) = @_;
    my $m = $c->model('Directory');
    my $textinfo;
    my $sections;
    try {
        $textinfo = $m->ajax('get', "/tradition/$textid");
        $textinfo->{sections} = $m->ajax('get', "/tradition/$textid/sections");
    }
    catch (stemmaweb::Error $e ) {
        return json_error($c, $e->status, $e->message);
    }
    $textinfo->{permission} = _check_permission($c, $textinfo);
    return $textinfo;
}

sub load_stemma {
    my ($stemmadata) = @_;
    return stemmaweb::Model::Stemma->new(
        dot           => $stemmadata->{dot},
        is_undirected => $stemmadata->{is_undirected} == JSON::true,
        identifier    => $stemmadata->{identifier}
    );
}

# Section metadata update, shared between Root and Relation controllers
sub section_metadata {
    my ($c, $textid, $sectionid) = @_;
    my $m          = $c->model('Directory');
    my $url        = "/tradition/$textid/section/$sectionid";
    my $method     = lc($c->request->method);
    my %reqparams  = ('Content-Type' => 'application/json');
    my $textinfo   = $c->stash->{tradition};
    my $permission = $textinfo ? $textinfo->{permission} : '';

    # Are we updating, or merely requesting?
    if ($method eq 'post') {
        if ($permission ne 'full') {
            return json_error($c, 403,
                'You do not have permission to modify this tradition.');
        }

        # We will PUT a request with content.
        $reqparams{Content} = encode_json($c->req->params());
        $method = 'put';

        # Then it must be a GET request, or an invalid one.
    } elsif (!$permission) {
        return json_error($c, 403,
            'You do not have permission to view this tradition.');
    } elsif ($method ne 'get') {
        return json_error($c, 403, 'Use POST or GET');
    }

    # We've collected the info, so do the work.
    try {
        $c->stash->{result} = $m->ajax($method, $url, %reqparams);
    }
    catch (stemmaweb::Error $e ) {
        return json_error($c, $e->status, $e->message);
    }

    $c->forward('View::JSON');
}

# Helper to throw a JSON exception
sub json_error {
    my ($c, $code, $errmsg) = @_;
    $c->response->status($code);
    $c->stash->{'result'} = { 'error' => $errmsg };
    $c->forward('View::JSON');
    return 0;
}

sub json_bool {
    return $_[0] ? JSON::true : JSON::false;
}

=encoding utf8

=head1 AUTHOR

Tara Andrews

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

1;
