package stemmaweb::Controller::Stexaminer;
use Moose;
use namespace::autoclean;
use Encode qw/ decode_utf8 /;
use File::Temp;
use JSON;
use Text::Tradition::Analysis qw/ run_analysis wit_stringify /;
use Text::Tradition::Collation;
use Text::Tradition::Stemma;

BEGIN { extends 'Catalyst::Controller' }


=head1 NAME

stemmaweb::Controller::Stexaminer - Simple controller for stemma display

=head1 DESCRIPTION

The stemma analysis tool with the pretty colored table.

=head1 METHODS

=head2 index

 GET stexaminer/$textid
 
Renders the application for the text identified by $textid.

=cut

sub index :Path :Args(1) {
    my( $self, $c, $textid ) = @_;
    my $m = $c->model('Directory');
	my $tradition = $m->tradition( $textid );
	if( $tradition->stemma_count ) {
		my $stemma = $tradition->stemma(0);
		$c->stash->{svg} = $stemma->as_svg( { size => [ 600, 350 ] } );
		$c->stash->{graphdot} = $stemma->editable({ linesep => ' ' });
		$c->stash->{text_title} = $tradition->name;
		$c->stash->{template} = 'stexaminer.tt'; 
		# TODO Run the analysis as AJAX from the loaded page.
		my $t = run_analysis( $tradition, 'exclude_type1' => 1 );
		# Stringify the reading groups
		foreach my $loc ( @{$t->{'variants'}} ) {
			my $mst = wit_stringify( $loc->{'missing'} );
			$loc->{'missing'} = $mst;
			foreach my $rhash ( @{$loc->{'readings'}} ) {
				my $gst = wit_stringify( $rhash->{'group'} );
				$rhash->{'group'} = $gst;
				my $roots = join( ', ', @{$rhash->{'independent_occurrence'}} );
				$rhash->{'independent_occurrence'} = $roots;
				unless( $rhash->{'text'} ) {
					$rhash->{'text'} = $rhash->{'readingid'};
				}
			}
		}
		# Values for TT rendering
		$c->stash->{variants} = $t->{'variants'};
		$c->stash->{total} = $t->{'variant_count'};
		$c->stash->{genealogical} = $t->{'genealogical_count'};
		$c->stash->{conflict} = $t->{'conflict_count'};		
		# Also make a JSON stash of the data for the statistics tables
		$c->stash->{reading_statistics} = to_json( $t->{'variants'} );
	} else {
		$c->stash->{error} = 'Tradition ' . $tradition->name 
			. 'has no stemma for analysis.';
	}
}

=head2 graphsvg

  POST stexaminer/graphsvg
  	dot: <stemmagraph dot string> 
  	layerwits: [ <a.c. witnesses ] 
  
Returns an SVG string of the given graph, extended to include the given 
layered witnesses.

=cut

sub graphsvg :Local {
	my( $self, $c ) = @_;
	my $dot = $c->request->param('dot');
	my @layerwits = $c->request->param('layerwits[]');
	open my $stemma_fh, '<', \$dot;
	binmode( $stemma_fh, ':encoding(UTF-8)' );
	my $emptycoll = Text::Tradition::Collation->new();
	my $tempstemma = Text::Tradition::Stemma->new( 
		collation => $emptycoll, 'dot' => $stemma_fh );
	my $svgopts = { size => [ 600, 350 ] };
	if( @layerwits ) {
		$svgopts->{'layerwits'} = \@layerwits;
	}
	$c->stash->{'result'} = $tempstemma->as_svg( $svgopts );
	$c->forward('View::SVG');
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
