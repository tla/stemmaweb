package stemmaweb::Controller::Stexaminer;
use Moose;
use namespace::autoclean;
use File::Temp;
use JSON;
use Text::Tradition::Analysis qw/ run_analysis wit_stringify /;

BEGIN { extends 'Catalyst::Controller' }


=head1 NAME

stemmaweb::Controller::Stexaminer - Simple controller for stemma display

=head1 DESCRIPTION

The stemma analysis tool with the pretty colored table.

=head1 METHODS

 GET stexaminer/$textid
 
Renders the application for the text identified by $textid.

=head2 index

=cut

sub index :Path :Args(1) {
    my( $self, $c, $textid ) = @_;
    my $m = $c->model('Directory');
	my $tradition = $m->tradition( $textid );
	if( $tradition->stemma_count ) {
		my $stemma = $tradition->stemma(0);
		# TODO Think about caching the stemma in a session 
		$c->stash->{svg} = $stemma->as_svg;
		$c->stash->{text_title} = $tradition->name;
		$c->stash->{template} = 'stexaminer.tt'; 
		# TODO Run the analysis as AJAX from the loaded page.
		my $t = run_analysis( $tradition );
		# Stringify the reading groups
		foreach my $loc ( @{$t->{'variants'}} ) {
			my $mst = wit_stringify( $loc->{'missing'} );
			$loc->{'missing'} = $mst;
			foreach my $rhash ( @{$loc->{'readings'}} ) {
				my $gst = wit_stringify( $rhash->{'group'} );
				$rhash->{'group'} = $gst;
			}
		}
		$c->stash->{variants} = $t->{'variants'};
		$c->stash->{total} = $t->{'variant_count'};
		$c->stash->{genealogical} = $t->{'genealogical_count'};
		$c->stash->{conflict} = $t->{'conflict_count'};
	} else {
		$c->stash->{error} = 'Tradition ' . $tradition->name 
			. 'has no stemma for analysis.';
	}
}

=head2 end

Attempt to render a view, if needed.

=cut

sub end : ActionClass('RenderView') {}

=head1 AUTHOR

Tara L Andrews

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

__PACKAGE__->meta->make_immutable;

1;
