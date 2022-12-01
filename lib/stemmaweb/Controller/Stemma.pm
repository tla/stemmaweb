package stemmaweb::Controller::Stemma;
use Moose;
use namespace::autoclean;

use strict;
use warnings;
use JSON qw/ encode_json /;
use TryCatch;
use stemmaweb::Controller::Util
  qw/ load_tradition stemma_info json_error json_bool /;

BEGIN { extends 'Catalyst::Controller'; }

=head1 NAME

stemmaweb::Controller::Stemma - Catalyst Controller

=head1 DESCRIPTION

Catalyst Controller.

=head1 METHODS


=head2 index

 GET /stemma/$textid/$stemmaid
 POST /stemma/$textid/$stemmaid, { 'dot' => $dot_string }

Returns an SVG representation of the given stemma hypothesis for the text.
If the URL is called with POST, the stemma $stemmaid will be altered
to reflect the definition in $dot_string. If $stemmaid is '*', a new
stemma will be added.

=cut

sub index :Path :Args(2) {
    my ($self, $c, $textid, $stemmaid) = @_;
    my $textinfo = load_tradition($c, $textid);

    # Send the request and get the response
    my $stemmadata;
    my $location = sprintf("/tradition/%s/stemma/%s", $textinfo->{id}, $stemmaid);

    if ($c->req->method eq 'POST') {
        if ($textinfo->{permission} ne 'full') {
            # No permissions to update the stemma
            return json_error($c, 403,
'You do not have permission to update stemmata for this tradition'
            );
        }

        my $dot = $c->request->body_params->{dot};
        # Fix the URL if we are posting a new stemma 
        if ($stemmaid eq '__NEW__') {
            # We have to fish out the name of the stemma from the dot if it is new.
            $dot =~ /^(di)?graph\s+(.*?)\s+\{/;
            $stemmaid = $2;
            $stemmaid =~ s/^"(.*)"/$1/;
            $location =~ s/__NEW__/$stemmaid/;
        }
        my $stemmamodel = { identifier => $stemmaid, dot => $dot };
        try {
            $stemmadata = $c->model('Directory')->ajax(
                'put', $location,  # The backend uses PUT
                'Content-Type' => 'application/json',
                Content        => encode_json($stemmamodel)
            );
        }
        catch (stemmaweb::Error $e ) {
            return json_error($c, $e->status, $e->message);
        }
    } elsif ($c->req->method eq 'GET') {
        try {
            $stemmadata = $c->model('Directory')->ajax('get', $location);
        }
        catch (stemmaweb::Error $e ) {
            return json_error($c, $e->status, $e->message);
        }
    } else {
        return json_error($c, 400, "Disallowed HTTP method " . $c->req->method);
    }

    # For a GET or a successful POST request, return the SVG representation
    # of the stemma in question, if any.
    # What was requested, XML or JSON?
    my $return_view = 'SVG';
    if (my $accept_header = $c->req->header('Accept')) {
        $c->log->debug("Received Accept header: $accept_header");
        foreach my $type (split(/,\s*/, $accept_header)) {

            # If we were first asked for XML, return SVG
            last if $type =~ /^(application|text)\/xml$/;

            # If we were first asked for JSON, return JSON
            if ($type eq 'application/json') {
                $return_view = 'JSON';
                last;
            }
        }
    }
    if ($return_view eq 'SVG') {
        $c->stash->{'result'} = _as_svg($stemmadata);
        $c->forward('View::SVG');
    } else {    # JSON
        $c->stash->{'result'} = stemma_info($stemmadata);
        $c->forward('View::JSON');
    }
}

=head2 dot

 GET /stemma/dot/$textid/$stemmaid

Returns the 'dot' format representation of the current stemma hypothesis.

=cut

sub dot :Local :Args(2) {
    my ($self, $c, $textid, $stemmaid) = @_;
    my $textinfo = load_tradition($c, $textid);

    my $stemmadata;
    my $location = sprintf("/tradition/$textid/stemma/$stemmaid");
    try {
        $stemmadata = $c->model('Directory')->ajax('get', $location);
    }
    catch (stemmaweb::Error $e ) {
        return _json_error($c, $e->status, $e->message);
    }

    # Get the dot and transmute its line breaks to literal '|n'
    my $dotresult = $stemmadata->{dot};
    $dotresult =~ s/\n/|n/gm;
    $c->stash->{'result'} = { 'dot' => $dotresult };
    $c->forward('View::JSON');
}

=head2 reroot

 POST /stemma/reroot/$textid/$stemmaid, { root: <root node ID> }

Orients the given stemma so that the given node is the root (archetype). Returns the
information structure for the new stemma.

=cut

sub reroot :Local :Args(2) {
    my ($self, $c, $textid, $stemmaid) = @_;
    if ($c->request->method ne 'POST') {
        json_error($c, 405, "Call this method with POST");
    }
    my $textinfo = load_tradition($c, $textid);
    if ($textinfo->{permission} eq 'full') {
        my $location = sprintf("/tradition/%s/stemma/%s/reorient/%s",
            $textid, $stemmaid, $c->req->param('root'));
        try {
            my $stemmadata = $c->model('Directory')->ajax('post', $location);
            $c->stash->{'result'} = stemma_info($stemmadata);
            $c->forward('View::JSON');
        }
        catch (stemmaweb::Error $e ) {
            return json_error($c, $e->status, $e->message);
        }
    } else {
        return json_error($c, 403,
            'You do not have permission to update stemmata for this tradition');
    }
}

=head2 delete

 POST /stemma/delete/$textid/$stemmaid

Deletes the stemma with the given identifier.
Returns a list of the remaining stemmata (if any) for this text.

=cut

sub delete :Local :Args(2) {
    my ($self, $c, $textid, $stemmaid) = @_;
    if ($c->request->method ne 'POST') {
        json_error($c, 405, "Call this method with POST");
    }
    my $m = $c->model('Directory');
    my $textinfo = load_tradition($c, $textid);
    if ($textinfo->{permission} eq 'full') {
        # Delete the requested stemma
        my $location = sprintf("/tradition/%s/stemma/%s", $textid, $stemmaid);
        my @remaining;
        try {
            $m->ajax('delete', $location);
            foreach my $stemma (@{ $m->ajax('get', "/tradition/$textid/stemmata") }) {
                push(@remaining, stemma_info($stemma));
            }
        } catch (stemmaweb::Error $e) {
            return json_error($c, $e->status, $e->message);
        }
        # Return the remaining stemmata
        $c->stash->{'result'} = \@remaining;
        $c->forward('View::JSON');
    } else {
        return json_error($c, 403,
            'You do not have permission to update stemmata for this tradition');
    }
}

=encoding utf8

=head1 AUTHOR

Tara L Andrews

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

__PACKAGE__->meta->make_immutable;

1;
