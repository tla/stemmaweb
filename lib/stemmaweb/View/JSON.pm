package stemmaweb::View::JSON;

use strict;
use base 'Catalyst::View::JSON';

use JSON::XS ();

sub encode_json {
	my( $self, $c, $data ) = @_;
	my $json = JSON::XS->new->utf8->convert_blessed(1);
	$json->encode( $data );
}

1;

=head1 NAME

stemmaweb::View::JSON - Catalyst JSON View

=head1 SYNOPSIS

See L<stemmaweb>

=head1 DESCRIPTION

Catalyst JSON View.

=head1 AUTHOR

Tara Andrews

=head1 LICENSE

This library is free software, you can redistribute it and/or modify
it under the same terms as Perl itself.
