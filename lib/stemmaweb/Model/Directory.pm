package stemmaweb::Model::Directory;
use Moose;
use namespace::autoclean;

use strict;
use warnings;
use Encode qw/ decode_utf8 /;
use File::Which;
use File::Temp;
use HTTP::Response;
use IPC::Run qw( run binary );
use JSON qw/ decode_json to_json /;
use LWP::UserAgent;
use URI;
use stemmaweb::Error;

extends 'Catalyst::Model';

has tradition_repo => (
    is  => 'ro',
    isa => 'Str'
);

has basic_auth => (
    is        => 'ro',
    traits    => ['Hash'],
    isa       => 'HashRef[Str]',
    predicate => 'has_basic_auth'
);

sub ajax {

    # Generic and simple LWP request method for our application that returns
    # a decoded-from-JSON object.
    # Args are the same as for LWP::UA but we will fill in the repo URL.
    my $self     = shift;
    my $method   = shift;
    my $location = shift;
    my @lwpargs  = @_;
    my $url      = $self->tradition_repo . $location;
    my $ua       = LWP::UserAgent->new();
    if ($self->has_basic_auth) {

        # Parse out the URL into the hostname / port
        my $n4jurl = URI->new($self->tradition_repo);

        # Now add the credentials
        $ua->ssl_opts('verify_hostname' => 0);
        $ua->credentials(
            $n4jurl->host_port,        $self->basic_auth->{realm},
            $self->basic_auth->{user}, $self->basic_auth->{pass}
        );
    }

    my $resp = $ua->$method($url, @lwpargs);

    # Did it work?
    unless ($resp->is_success) {
        throw_ua($resp);
    }
    if ($resp->code == 204) {
        return undef;
    }

    # If so, return the result.
    if ($resp->content_type =~ /json/) {

        # Force the content to be decoded from utf-8
        return decode_json($resp->content);
    } else {

        # Respect the stated content encoding
        return $resp->decoded_content;
    }
}

### Graphviz transmogrification for passed-in dot
sub tradition_as_svg {
    my ($self, $textid, $opts) = @_;

    # Get the dot from the DB
    my $location =
      exists $opts->{'section'}
      ? sprintf("/tradition/$textid/section/%s/dot", $opts->{'section'})
      : "/tradition/$textid/dot";
    $location .= '?show_normal=true';
    $location .= '&include_relations=true' if $opts->{'include_relations'};
    my $dotstr = $self->ajax('get', $location);
    unless ($dotstr =~ /^digraph/) {
        stemmaweb::Error->throw(
            ident   => 'Datastore error',
            status  => 500,
            message => "Bad dot string: $dotstr"
        );
    }
    return dot_to_svg($dotstr);
}

# Really a generic utility, but this is as good a place as any for that.
sub dot_to_svg {
    my ($dotstr) = @_;
    unless (File::Which::which('dot')) {
        throw_ua(
            HTTP::Response->new(500, "Need GraphViz installed to output SVG"));
    }

    # Transmogrify it to SVG
    my @cmd = qw/dot -Tsvg/;
    my ($svg, $err);
    my $dotfile = File::Temp->new();
    ## USE FOR DEBUGGING
    # $dotfile->unlink_on_destroy(0);
    binmode $dotfile, ':utf8';
    print $dotfile $dotstr;
    push(@cmd, $dotfile->filename);
    run(\@cmd, ">", binary(), \$svg);
    $svg = decode_utf8($svg);
    return $svg;
}

sub throw_ua {
    stemmaweb::Error->throw(
        ident    => 'Datastore error',
        response => $_[0]
    );
}

# TODO move T::T::Stemma interactions here

__PACKAGE__->meta->make_immutable;

1;
