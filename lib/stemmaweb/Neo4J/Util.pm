package stemmaweb::Neo4J::Util;

use strict;
use warnings;
use feature 'say';
use Exporter 'import';
use JSON qw/ from_json decode_json /;
use vars qw/ @EXPORT /;
use LWP::UserAgent;
use stemmaweb::Error;

@EXPORT = qw/ throw_ua load load_from_response response_content /;

sub throw_ua {
	stemmaweb::Error->throw(
		ident => 'Datastore error',
		response => $_[0]
		);
}

sub load {
	my $object = shift;
	## Load the object from the DB and populate its data fields.
	my $ua = LWP::UserAgent->new();
	my $resp = $ua->get( $object->baseurl );
	load_from_response( $object, $resp );
}

sub load_from_response {
	my( $object, $resp ) = @_;
	my $parameters;
	if( $resp->is_success && $resp->content ) {
		$parameters = decode_json( $resp->content );
	} else {
		throw_ua( $resp );
	}
	foreach my $key ( keys %$parameters ) {
		next if $key eq 'id';
		my $val = $parameters->{$key};
		next unless defined $val;
		if( $object->meta->get_attribute( $key )->type_constraint->name eq 'Bool' ) {
			# Turn the JSON boolean into a Perl boolean.
			$val = $val ? 1 : 0;
		}
		my $setter = "_set_$key";
		$object->$setter( $val );
	}
}

sub response_content {
	my $resp = shift;
	my $decoded = $resp->decode;
	if( $resp->content_type =~ /json/i ) {
		# Get the JSON message and decode it.
		if( $decoded ) {
			return from_json( $resp->decoded_content );
		} else {
			return decode_json( $resp->content );
		}
	} else {
		return $decoded ? $resp->decoded_content : $resp->content;
	}
}