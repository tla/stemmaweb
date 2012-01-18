package stemmaweb::Controller::Relation;
use Moose;
use namespace::autoclean;

BEGIN { extends 'Catalyst::Controller' }


=head1 NAME

stemmaweb::Controller::Relation - Controller for the relationship mapper

=head1 DESCRIPTION

The stemma analysis tool with the pretty colored table.

=head1 METHODS

 GET relation/$textid
 
Renders the application for the text identified by $textid.

=head2 index

The relationship editor tool.

=cut

sub index :Path :Args(1) {
	my( $self, $c, $textid ) = @_;
	my $m = $c->model('Directory');
	my $tradition = $m->tradition( $textid );
	my $table = $tradition->collation->make_alignment_table();
	my $witlist = map { $_->{'witness'} } @{$table->{'alignment'}};
	$c->stash->{witnesses} = $witlist;
	$c->stash->{alignment} = $table;
	$c->stash->{template} = 'relate.tt';	
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
