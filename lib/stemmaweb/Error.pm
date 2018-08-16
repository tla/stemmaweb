package stemmaweb::Error;

use strict;
use warnings;
use JSON qw/from_json/;
use Moose;
use overload '""' => \&_stringify, 'fallback' => 1;

with qw/ Throwable::X StackTrace::Auto /;
use Throwable::X -all;

has 'status' => (
    is  => 'ro',
    isa => 'Int'
);

around 'throw' => sub {
    my $orig  = shift;
    my $class = shift;
    my $args;
    if (@_ == 1) {
        $args = $_[0];
    } else {
        $args = {@_};
    }

    ## If we have been passed a UserAgent response, parse it into proper
    ## throw init arguments.
    if (exists $args->{'response'}) {
        my $resp = delete $args->{'response'};
        $args->{'status'} = $resp->code;
        if (   $resp->header('content-type')
            && $resp->header('content-type') =~ /application\/json/)
        {
            my $r = from_json($resp->decoded_content);
            $args->{'message'} = $r->{error} if exists $r->{error};
        }
        if (!exists $args->{'message'}) {
            $args->{'message'} = $resp->content;
        }
    }

    $class->$orig($args);
};

sub _stringify {
    my $self = shift;
    return
        "Error: "
      . $self->ident . " // "
      . $self->message . "\n"
      . $self->stack_trace->as_string;
}

__PACKAGE__->meta->make_immutable;

1;
