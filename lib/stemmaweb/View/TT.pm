package stemmaweb::View::TT;

use strict;
use warnings;

use base 'Catalyst::View::TT';

__PACKAGE__->config(
    TEMPLATE_EXTENSION => '.tt',
    INCLUDE_PATH => [
    	stemmaweb->path_to( 'root', 'src' ),
    ],
    ENCODING => 'utf-8',
    render_die => 1,
);

=head1 NAME

stemmaweb::View::TT - TT View for stemmaweb

=head1 DESCRIPTION

TT View for stemmaweb.

=head1 SEE ALSO

L<stemmaweb>

=head1 AUTHOR

Tara L Andrews

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

1;
