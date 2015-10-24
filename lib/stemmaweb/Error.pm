package Text::Tradition::Error;

use strict;
use warnings;
use Moose;
use overload '""' => \&_stringify, 'fallback' => 1;

with qw/ Throwable::X StackTrace::Auto /;
use Throwable::X -all;

has 'status' => (
	is => 'ro',
	isa => 'Int'
);

before 'throw' => sub {
	my( $class, $args ) = @_;
	## If we have been passed a UserAgent response, parse it into proper 
	## throw init arguments.
	if( exists $args->{'response'} ) {
		my $resp = delete $args->{'response'};
		$args->{'status'} = $resp->status;
		## TODO see if it is JSON and decode it as such if so.
		$args->{'message'} = $resp->content;
		
	## If we have been passed a Moose error message object, grab the
	## message string out of it. 
# 	} elsif( exists $args->{'message'}) {
# 		my $msg = $args->{'message'};
# 		if( $msg && UNIVERSAL::can( $msg, 'message' ) ) {
# 				$args{message} = $msg->message;
# 		}
	}
}

sub _stringify {
        my $self = shift;
        return "Error: " . $self->ident . " // " . $self->message
                . "\n" . $self->stack_trace->as_string;
}
