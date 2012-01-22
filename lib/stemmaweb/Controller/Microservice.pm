package stemmaweb::Controller::Microservice;
use Moose;
use namespace::autoclean;
use JSON;
use TryCatch;
use Text::Tradition;
#use Text::Tradition::Error;
use Text::Tradition::Stemma;
use Text::Tradition::StemmaUtil qw/ character_input phylip_pars newick_to_svg /;

BEGIN { extends 'Catalyst::Controller' }

=head1 NAME

stemmaweb::Controller::Microservice - Controller for stemmaweb standalone
components

=head1 DESCRIPTION

This package contains the pieces of web functionality relating to text tradition
objects that are useful outside the framework of this application.

=head1 COLLATION PARSING INPUT

Each URL call which operates on a provided collation is called by POST with the
following form parameters in the body: 

=over 4 

=item * type - Can be one of CollateX, CSV, JSON, nCritic, TEI, Tabular.

=item * data - The collation data itself.

=back

=head1 COLLATION URLs

=head2 renderSVG

 POST microservice/renderSVG

Parse the passed collation data and return an SVG of the collated text.

=cut

# Utility function to render SVG from a collation in some recognized format.
sub renderSVG :Local :Args(0) {
	my( $self, $c ) = @_;
	my $tradition = _parse_to_tradition( $c->request );
	try {
		$c->stash->{'result'} = $tradition->collation->as_svg;
		$c->forward('View::SVG');
	} catch( Text::Tradition::Error $e ) {
		$c->detach( 'error', [ $e ] );
	}
}

=head1 STEMMA / DISTANCE TREE URLs

=head2 stemma_svg

 POST microservice/stemma_svg
 
Parameter: dot => a string containing the dot description of the stemma.

=cut

sub stemma_svg :Local :Args(0) {
	my( $self, $c ) = @_;
	my $t = Text::Tradition->new();
	my $stemma;
	try {
		$stemma = $t->add_stemma( 'dot' => $c->req->param('dot') );
	} catch( Text::Tradition::Error $e ) {
		$c->detach( 'error', [ $e ] );
	}
	$c->stash->{'result'} = $stemma->as_svg;
	$c->forward('View::SVG');
}

=head2 character_matrix

 POST microservice/character_matrix

Given an alignment table in JSON form, in the parameter 'alignment', returns a
character matrix suitable for input to Phylip PARS. 

=cut

sub character_matrix :Local :Args(0) {
	my( $self, $c ) = @_;
	my $json = $c->request->params->{'alignment'};
	$c->log->debug( $json );
	my $table = from_json( $json );
	my $matrix = character_input( $table );
	$c->stash->{'result'} = { 'matrix' => $matrix };
	$c->forward( 'View::JSON' );
}

=head2 run_pars 

 POST microservice/run_pars

Runs Phylip PARS on the provided alignment, and returns the result. Parameters include:

=over 4

=item * alignment - A JSON alignment table, as produced by CollateX

=item * matrix - A character matrix suitable for Phylip.

=item * format - The format in which to return the results.  Default is 'newick'; also allowed is 'svg'.

=back

Exactly one of 'alignment' or 'matrix' must be specified.

=cut

sub run_pars :Local :Args(0) {
	my( $self, $c ) = @_;
	my $matrix;
	if( $c->request->param('matrix') ) {
		$matrix = $c->request->param('matrix');
	} elsif( $c->request->param('alignment') ) {
		# Make the matrix from the alignment
		my $table = from_json( $c->request->param('alignment') );
		$matrix = character_input( $table );
	} else {
		$c->detach( 'error', [ "Must pass either an alignment or a matrix" ] );
	}
	
	# Got the matrix, so try to run pars.
	my $output;
	try {
		$output = phylip_pars( $matrix );
	} catch( Text::Tradition::Error $e ) {
		$c->detach( 'error', [ $e ] );
	}
	
	# Did we want newick or a graph?
	my $view = 'View::JSON';
	my $format = 'newick';
	$format = $c->request->param('format') if $c->request->param('format');
	if( $format eq 'svg' ) {
		# Do something
		try {
			$c->stash->{'result'} = newick_to_svg( $output );
			$view = 'View::SVG';
		} catch( Text::Tradition::Error $e ) {
			$c->detach( 'error', [ $e ] );
		}
	} elsif( $format ne 'newick' ) {
		$c->detach( 'error', [ "Requested output format $format unknown" ] );
	} else {
		$c->stash->{'result'} = { 'tree' => $output };
	}

	$c->forward( $view );
}


=head1 OPENSOCIAL URLs

=head2 view_table

Simple gadget to return the analysis table for the stexaminer

=cut

sub view_table :Local :Args(0) {
    my( $self, $c ) = @_;
    my $m = $c->model('Directory');
	my $id = $c->request->params->{'textid'};
	my $t = run_analysis( $m->tradition( $id ), $m->stemma( $id ) );
   	$c->stash->{variants} = $t->{'variants'};
    $c->stash->{template} = 'table_gadget.tt';
}

=head2 view_stemma_svg

Simple gadget to return the SVG for a given stemma

=cut

sub view_svg :Local :Args(0) {
    my( $self, $c ) = @_;
    my $m = $c->model('Directory');
    my $stemma = $m->tradition( $c->request->params->{'textid'} )->stemma;
	if( $stemma ) {
	   	$c->stash->{svg} = $stemma->as_svg;
	}
    $c->stash->{template} = 'stemma_gadget.tt';
}

=head2 error

Default response when actions generate Text::Tradition::Error exceptions

=cut

sub error :Private {
	my( $self, $c, $error ) = @_;
	my $errstr = $error;
	if( ref( $error ) eq 'Text::Tradition::Error' ) {
		$errstr = $error->ident . ": " . $error->message;
	}
	$c->response->code( 500 );
	$c->stash->{'error'} = $errstr;
	$c->stash->{'template'} = 'error.tt';
}

=head2 default

Standard 404 error page

=cut

sub default :Path {
    my ( $self, $c ) = @_;
    $c->response->body( 'Page not found' );
    $c->response->status(404);
}

## Internal utility function

sub _parse_to_tradition {
	my $req = shift;
	my $type = $req->body_params->{'type'};
	my $name = $req->param('name') || 'Collation graph';
	my $data = $req->body_params->{'data'};
	my $opts = { 
		'name' => $name,
		'input' => $type,
		'string' => $data
		};
	$opts->{'sep_char'} = ',' if $type eq 'CSV';
	$opts->{'sep_char'} = "\t" if $type eq 'TabSep';
	return Text::Tradition->new( $opts );
}


=head1 AUTHOR

Tara L Andrews

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

__PACKAGE__->meta->make_immutable;

1;
