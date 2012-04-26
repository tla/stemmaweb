package stemmaweb::Controller::Relation;
use Moose;
use namespace::autoclean;
use TryCatch;

BEGIN { extends 'Catalyst::Controller' }


=head1 NAME

stemmaweb::Controller::Relation - Controller for the relationship mapper

=head1 DESCRIPTION

The reading relationship mapper with draggable nodes.

=head1 METHODS

=head2 index

 GET relation/$textid
 
Renders the application for the text identified by $textid.

=cut

sub index :Path :Args(0) {
	my( $self, $c ) = @_;
	$c->stash->{'template'} = 'relate.tt';
}

=head2 help

 GET relation/help

Returns the help window HTML.

=cut

sub help :Local :Args(0) {
	my( $self, $c ) = @_;
	$c->stash->{'template'} = 'relatehelp.tt';
}

=head2 definitions

 GET relation/definitions
 
Returns a data structure giving the valid types and scopes for a relationship.

=cut

sub definitions :Local :Args(0) {
	my( $self, $c ) = @_;
	my $valid_relationships = [ qw/ spelling orthographic grammatical lexical transposition / ];
	my $valid_scopes = [ qw/ local global / ];
	$c->stash->{'result'} = { 'types' => $valid_relationships, 'scopes' => $valid_scopes };
	$c->forward('View::JSON');
}

=head2 text

 GET relation/$textid/
 
 Runs the relationship mapper for the specified text ID.
 
=cut

sub text :Chained('/') :PathPart('relation') :CaptureArgs(1) {
	my( $self, $c, $textid ) = @_;
	# If the tradition has more than 500 ranks or so, split it up.
	my $tradition = $c->model('Directory')->tradition( $textid );
    # Account for a bad interaction between FastCGI and KiokuDB
    unless( $tradition->collation->tradition ) {
        $c->log->warn( "Fixing broken tradition link" );
        $tradition->collation->_set_tradition( $tradition );
        $c->model('Directory')->save( $tradition );
    }
	# See how big the tradition is. Edges are more important than nodes
	# when it comes to rendering difficulty.
	my $numnodes = scalar $tradition->collation->readings;
	my $numedges = scalar $tradition->collation->paths;
	my $length = $tradition->collation->end->rank;
	# We should display no more than roughly 500 nodes, or roughly 700
	# edges, at a time.
	my $segments = $numnodes / 500;
	if( $numedges / 700 > $segments ) {
		$segments = $numedges / 700;
	}
	my $segsize = sprintf( "%.0f", $length / $segments );
	my $margin = sprintf( "%.0f", $segsize / 10 );
	if( $segments > 1 ) {
		# Segment the tradition in order not to overload the browser.
		my @divs;
		my $r = 0;
		while( $r + $margin < $length ) {
			push( @divs, $r );
			$r += $segsize;
		}
		$c->stash->{'textsegments'} = [];
		$c->stash->{'segsize'} = $segsize;
		$c->stash->{'margin'} = $margin;
		foreach my $i ( 0..$#divs ) {
			my $seg = { 'start' => $divs[$i] };
			$seg->{'display'} = "Segment " . ($i+1);
			push( @{$c->stash->{'textsegments'}}, $seg );
		}
	}
	$c->stash->{'textid'} = $textid;
	$c->stash->{'tradition'} = $tradition;
}

sub main :Chained('text') :PathPart('') :Args(0) {
	my( $self, $c ) = @_;
	my $startseg = $c->req->param('start');
	my $tradition = delete $c->stash->{'tradition'};
	my $collation = $tradition->collation;
	my $svgopts;
	if( $startseg ) {
		# Only render the subgraph from startseg to endseg or to END,
		# whichever is less.
		my $endseg = $startseg + $c->stash->{'segsize'} + $c->stash->{'margin'};
		$svgopts = { 'from' => $startseg };
		$svgopts->{'to'} = $endseg if $endseg < $collation->end->rank;
	} elsif( exists $c->stash->{'textsegments'} ) {
		# This is the unqualified load of a long tradition. We implicitly start 
		# at zero, but go only as far as 550.
		my $endseg = $c->stash->{'segsize'} + $c->stash->{'margin'};
		$startseg = 0;
		$svgopts = { 'to' => $endseg };
	}
	my $svg_str = $collation->as_svg( $svgopts );
	$svg_str =~ s/\n//gs;
	$c->stash->{'startseg'} = $startseg if defined $startseg;
	$c->stash->{'svg_string'} = $svg_str;
	$c->stash->{'text_title'} = $tradition->name;
	$c->stash->{'template'} = 'relate.tt';
}

=head2 relationships

 GET relation/$textid/relationships

Returns the list of relationships defined for this text.

 POST relation/$textid/relationships { request }
 
Attempts to define the requested relationship within the text. Returns 200 on
success or 403 on error.

 DELETE relation/$textid/relationships { request }
 

=cut

sub relationships :Chained('text') :PathPart :Args(0) {
	my( $self, $c ) = @_;
	my $tradition = delete $c->stash->{'tradition'};
	my $collation = $tradition->collation;
	my $m = $c->model('Directory');
	if( $c->request->method eq 'GET' ) {
		my @pairs = $collation->relationships; # returns the edges
		my @all_relations;
		foreach my $p ( @pairs ) {
			my $relobj = $collation->relations->get_relationship( @$p );
			next if $relobj->type eq 'collated'; # Don't show these
			next if $p->[0] eq $p->[1]; # HACK until bugfix
			my $relhash = { source => $p->[0], target => $p->[1], 
				  type => $relobj->type, scope => $relobj->scope };
			$relhash->{'note'} = $relobj->annotation if $relobj->has_annotation;
			push( @all_relations, $relhash );
		}
		$c->stash->{'result'} = \@all_relations;
	} elsif( $c->request->method eq 'POST' ) {
		my $node = $c->request->param('source_id');
		my $target = $c->request->param('target_id');
		my $relation = $c->request->param('rel_type');
		my $note = $c->request->param('note');
		my $scope = $c->request->param('scope');
	
		my $opts = { 'type' => $relation,
					 'scope' => $scope };
		$opts->{'annotation'} = $note if $note;
		
		try {
			my @vectors = $collation->add_relationship( $node, $target, $opts );
			$c->stash->{'result'} = \@vectors;
			$m->save( $tradition );
		} catch( Text::Tradition::Error $e ) {
			$c->response->status( '403' );
			$c->stash->{'result'} = { 'error' => $e->message };
		}
	} elsif( $c->request->method eq 'DELETE' ) {
		my $node = $c->request->param('source_id');
		my $target = $c->request->param('target_id');
	
		try {
			my @vectors = $collation->del_relationship( $node, $target );
			$m->save( $tradition );
			$c->stash->{'result'} = \@vectors;
		} catch( Text::Tradition::Error $e ) {
			$c->response->status( '403' );
			$c->stash->{'result'} = { 'error' => $e->message };
		}	
	}
	$c->forward('View::JSON');
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
