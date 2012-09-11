package stemmaweb::Controller::Stexaminer;
use Moose;
use namespace::autoclean;
use Encode qw/ decode_utf8 /;
use File::Temp;
use JSON;
use Text::Tradition::Analysis qw/ run_analysis wit_stringify /;
use Text::Tradition::Stemma;

BEGIN { extends 'Catalyst::Controller' }


=head1 NAME

stemmaweb::Controller::Stexaminer - Simple controller for stemma display

=head1 DESCRIPTION

The stemma analysis tool with the pretty colored table.

=head1 METHODS

=head2 index

 GET stexaminer/$textid/$stemmaid
 
Renders the application for the text identified by $textid, using the stemma
graph identified by $stemmaid.

=cut

sub index :Path :Args(2) {
    my( $self, $c, $textid, $stemid ) = @_;
    my $m = $c->model('Directory');
	$c->stash->{template} = 'stexaminer.tt'; 
	
	# Make sure the tradition exists and is viewable
	my $tradition = $m->tradition( $textid );
	unless( $tradition ) {
		$c->response->status( 404 );
		$c->stash->{'error'} = "No tradition with ID $textid";
		return;
	}	
	my $ok = _check_permission( $c, $tradition );
	return unless $ok;
	
	if( $tradition->stemma_count ) {
		my $stemma = $tradition->stemma( $stemid );
		$c->stash->{svg} = $stemma->as_svg( { size => [ 600, 350 ] } );
		$c->stash->{graphdot} = $stemma->editable({ linesep => ' ' });
		$c->stash->{text_id} = $textid;
		$c->stash->{text_title} = $tradition->name;
		
		# Get the analysis options
		my( $use_type1, $ignore_sort ) = ( 0, 'none' );
		$use_type1 = $c->req->param( 'show_type1' ) ? 1 : 0;
		$ignore_sort = $c->req->param( 'ignore_variant' ) || '';
		$c->stash->{'show_type1'} = $use_type1;
		$c->stash->{'ignore_variant'} = $ignore_sort;
		# TODO Run the analysis as AJAX from the loaded page.
		my %analysis_options = ( 
			stemma_id => $stemid,
			exclude_type1 => !$use_type1 );
		if( $ignore_sort eq 'spelling' ) {
			$analysis_options{'merge_types'} = [ qw/ spelling orthographic / ];
		} elsif( $ignore_sort eq 'orthographic' ) {
			$analysis_options{'merge_types'} = 'orthographic';
		}

		# Do the deed
		my $t = run_analysis( $tradition, %analysis_options );
		# Stringify the reading groups
		foreach my $loc ( @{$t->{'variants'}} ) {
			my $mst = wit_stringify( $loc->{'missing'} );
			$loc->{'missing'} = $mst;
			foreach my $rhash ( @{$loc->{'readings'}} ) {
				my $gst = wit_stringify( $rhash->{'group'} );
				$rhash->{'group'} = $gst;
				_stringify_element( $rhash, 'independent_occurrence' );
				_stringify_element( $rhash, 'reversions' );
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

sub _stringify_element {
	my( $hash, $key ) = @_;
	return undef unless exists $hash->{$key};
	if( ref( $hash->{$key} ) eq 'ARRAY' ) {
		my $str = join( ', ', @{$hash->{$key}} );
		$hash->{$key} = $str;
	}
}

sub _check_permission {
	my( $c, $tradition ) = @_;
    my $user = $c->user_exists ? $c->user->get_object : undef;
    if( $user ) {
    	return 'full' if ( $user->is_admin || 
    		( $tradition->has_user && $tradition->user->id eq $user->id ) );
    }
	# Text doesn't belong to us, so maybe it's public?
	return 'readonly' if $tradition->public;

	# ...nope. Forbidden!
	$c->response->status( 403 );
	$c->stash->{'error'} = 'You do not have permission to view this tradition';
	return 0;
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
	my $tempstemma = Text::Tradition::Stemma->new( 'dot' => $stemma_fh );
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
