package stemmaweb::View::SVG;

use strict;
use base 'Catalyst::View';
use Encode qw/ encode /;

sub process {
    my ($self, $c) = @_;
    $c->res->content_type('image/svg+xml');
    $c->res->content_encoding('UTF-8');
    if ($c->stash->{download}) {
        $c->res->header('Content-Disposition',
            sprintf("attachment; filename=\"%s.svg\"", $c->stash->{name}));
    }
    $c->res->output(encode('UTF-8', $c->stash->{result}));
}

1;
