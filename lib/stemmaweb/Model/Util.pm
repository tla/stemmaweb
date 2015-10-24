package stemmaweb::Model::Util;

use strict;
use warnings;
use Exporter 'import';
use vars qw/ @EXPORT /;
use LWP::UserAgent;
use stemmaweb::Error;

@EXPORT = qw/ throw_ua load response_content /;

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
	my $parameters ;
	if( $resp->is_success ) {
		$parameters = decode_json( $resp->content );
	} else {
		throw_ua( $resp );
	}
	foreach my $key ( keys %$parameters ) {
		my $setter = "_set_$key";
		$object->$setter( $parameters->{$key} );
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