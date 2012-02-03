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

sub index :Path :Args(1) {
	my( $self, $c, $textid ) = @_;
	my $m = $c->model('Directory');
	my $tradition = $m->tradition( $textid );
	my $collation = $tradition->collation;
	my $svg_str = $collation->as_svg;
	$svg_str =~ s/\n//gs;
	$c->stash->{'svg_string'} = $svg_str;
	$c->stash->{'template'} = 'relate.tt';
}

sub dispatcher :Path :Args(2) {
	my( $self, $c, $textid, $forward ) = @_;
	$c->stash->{'tradition'} = $c->model('Directory')->tradition( $textid );
	$c->forward( $forward );	
}

=head2 relationship_definition

 GET relation/definitions
 
Returns a data structure giving the valid types and scopes for a relationship.

=cut

sub definitions :Local :Args(0) {
	my( $self, $c ) = @_;
	my $valid_relationships = [ qw/ spelling orthographic grammatical meaning / ];
	my $valid_scopes = [ qw/ local global / ];
	$c->stash->{'result'} = { 'types' => $valid_relationships, 'scopes' => $valid_scopes };
	$c->forward('View::JSON');
}

=head2 relationship

 POST relation/$textid/relationship
   source_id: $source, target_id: $target, rel_type: $type, scope: $scope
   
Sets the specified relationship between the readings in $source and $target.
Returns 200 and a list of node pairs where the relationship was added on success;
returns 403 and an { error: message } struct on failure.

=cut

sub relationship :Private {
	my( $self, $c ) = @_;
	my $tradition = delete $c->stash->{'tradition'};
	my $collation = $tradition->collation;
	my $node = $c->request->param('source_id');
	my $target = $c->request->param('target_id');
	my $relation = $c->request->param('rel_type');
	my $note = $c->request->param('note');
	my $scope = $c->request->param('scope');

	my $opts = { 'type' => $relation,
				 'scope' => $scope };
	
	try {
		my @vectors = $collation->add_relationship( $node, $target, $opts );
		my $m = $c->model('Directory');
		$m->save( $tradition );
		$c->stash->{'result'} = \@vectors;
	} catch( Text::Tradition::Error $e ) {
		$c->response->status( '403' );
		$c->stash->{'result'} = { 'error' => $e->message };
	}
	$c->forward('View::JSON');
}

=head2 relationships

 GET relation/$textid/relationships

Returns a list of relationships that exist in the specified text. Each
relationship is returned in a struct that looks like:

{ source: $sid, target: $tid, type: $rel_type, scope: $rel_scope }

=cut

sub relationships :Private {
	my( $self, $c ) = @_;
	my $tradition = delete $c->stash->{'tradition'};
	my $collation = $tradition->collation;
	# TODO make this API
	my @pairs = $collation->relationships; # returns the edges
	my @all_relations;
	foreach my $p ( @pairs ) {
		my $relobj = $collation->relations->get_relationship( @$p );
		push( @all_relations, 
			{ source => $p->[0], target => $p->[1], 
			  type => $relobj->type, scope => $relobj->scope } );
	}
	$c->stash->{'result'} = \@all_relations;
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
