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

=head2 definitions

 GET relation/definitions
 
Returns a data structure giving the valid types and scopes for a relationship.

=cut

sub definitions :Local :Args(0) {
	my( $self, $c ) = @_;
	my $valid_relationships = [ qw/ spelling orthographic grammatical meaning 
									lexical transposition / ];
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
	$c->stash->{'tradition'} = $c->model('Directory')->tradition( $textid );
}

sub main :Chained('text') :PathPart('') :Args(0) {
	my( $self, $c ) = @_;
	my $tradition = delete $c->stash->{'tradition'};
	my $collation = $tradition->collation;
	my $svg_str = $collation->as_svg;
	$svg_str =~ s/\n//gs;
	$c->stash->{'svg_string'} = $svg_str;
	$c->stash->{'text_title'} = $tradition->name;
	$c->stash->{'template'} = 'relate.tt';

}

=head2 relationships

 GET $textid/relationships

Returns the list of relationships defined for this text.

 POST $textid/relationships { request }
 
Attempts to define the requested relationship within the text. Returns 200 on
success or 403 on error.

 DELETE $textid/relationships { request }
 

=cut

sub relationships :Chained('text') :PathPart :Args(0) {
	my( $self, $c ) = @_;
	my $tradition = delete $c->stash->{'tradition'};
	my $collation = $tradition->collation;
	if( $c->request->method eq 'GET' ) {
		my @pairs = $collation->relationships; # returns the edges
		my @all_relations;
		foreach my $p ( @pairs ) {
			my $relobj = $collation->relations->get_relationship( @$p );
			push( @all_relations, 
				{ source => $p->[0], target => $p->[1], 
				  type => $relobj->type, scope => $relobj->scope } );
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
		
		try {
			my @vectors = $collation->add_relationship( $node, $target, $opts );
			$c->stash->{'result'} = \@vectors;
		} catch( Text::Tradition::Error $e ) {
			$c->response->status( '403' );
			$c->stash->{'result'} = { 'error' => $e->message };
		}
	} elsif( $c->request->method eq 'DELETE' ) {
		my $node = $c->request->param('source_id');
		my $target = $c->request->param('target_id');
	
		try {
			my @vectors = $collation->del_relationship( $node, $target );
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
