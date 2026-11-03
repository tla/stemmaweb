package stemmaweb::Controller::Stexaminer;
use Moose;
use namespace::autoclean;
use JSON;
use stemmaweb::Model::Analysis qw/ run_analysis wit_stringify /;
use stemmaweb::Model::Stemma;
use stemmaweb::Controller::Util qw/ load_tradition json_error /;
use TryCatch;

BEGIN { extends 'Catalyst::Controller' }

has stexaminer_url => (
    is        => 'ro',
    isa       => 'Str',
    predicate => 'has_stexaminer_url',
);

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
    my ($self, $c, $textid, $stemid) = @_;
    my $m = $c->model('Directory');
    $c->stash->{template} = 'stexaminer.tt';

    # load_tradition answers the error itself; carry on only if it did not.
    my $textinfo = load_tradition($c, $textid);
    return if exists $c->stash->{'result'};

    if ($stemid eq 'help') {

        # Just show the 'Help/About' popup.
        $c->stash->{template} = 'stexaminer_help.tt';
        $c->stash->{text_id}  = $textid;
        return;
    }

    my $stemmadata;
    try {
        $stemmadata = $m->ajax('get', "/tradition/$textid/stemma/$stemid");
    }
    catch (stemmaweb::Error $e ) {
        return json_error($c, $e->status, $e->message);
    }
    my $stemma = stemmaweb::Model::Stemma->new(
        dot           => $stemmadata->{dot},
        is_undirected => $stemmadata->{is_undirected} == JSON::true,
        stemmaid      => $stemmadata->{id},
        name          => $stemmadata->{name},
    );
    my $svgstr = $stemma->as_svg();
    $svgstr =~ s/\n/ /g;
    $c->stash->{svg}        = $svgstr;
    $c->stash->{graphdot}   = $stemma->editable({ linesep => ' ' });
    $c->stash->{text_id}    = $textid;
    $c->stash->{text_title} = $textinfo->{name};

    # Get the analysis options
    my $use_type1   = $c->req->param('show_type1') ? 1 : 0;
    my $ignore_sort = $c->req->param('ignore_variant') || '';
    $c->stash->{'show_type1'}     = $use_type1;
    $c->stash->{'ignore_variant'} = $ignore_sort;
    my %analysis_options = (exclude_type1 => !$use_type1);
    if ($ignore_sort eq 'spelling') {
        $analysis_options{'merge_types'} = [qw/ spelling orthographic /];
    } elsif ($ignore_sort eq 'orthographic') {
        $analysis_options{'merge_types'} = ['orthographic'];
    }
    unless ($self->has_stexaminer_url) {
        return json_error($c, 500, 'No Stexaminer service has been configured.');
    }
    $analysis_options{'stexaminer_url'} = $self->stexaminer_url;

    # Get the alignment of each section of the text from the repository
    my @sections;
    my $t;
    try {
        foreach my $section (@{ $textinfo->{sections} }) {
            my $sid = $section->{id};
            push(@sections, {
                id        => $sid,
                name      => $section->{name},
                alignment => $m->ajax('get', "/tradition/$textid/section/$sid/json"),
                relations => $m->ajax('get', "/tradition/$textid/section/$sid/relations"),
            });
        }
        # TODO Run the analysis as AJAX from the loaded page.
        $t = run_analysis($stemma, \@sections, %analysis_options);
    }
    catch (stemmaweb::Error $e ) {
        return json_error($c, $e->status, $e->message);
    }
    catch ($e) {
        $e =~ s/\s+$//;
        return json_error($c, 500, "Could not analyze this text: $e");
    }
    $c->stash->{error} = $t->{error} if $t->{error};

    # Stringify the reading groups
    foreach my $loc (@{ $t->{'variants'} }) {
        $loc->{'missing'} = wit_stringify($loc->{'missing'});
        foreach my $rhash (@{ $loc->{'readings'} }) {
            $rhash->{'group'} = wit_stringify($rhash->{'group'});
            _stringify_element($rhash, 'independent_occurrence');
            _stringify_element($rhash, 'reversions');
        }
    }

    # Values for TT rendering
    $c->stash->{variants}     = $t->{'variants'};
    $c->stash->{total}        = $t->{'variant_count'};
    $c->stash->{genealogical} = $t->{'genealogical_count'};
    $c->stash->{conflict}     = $t->{'conflict_count'};

    # Also make a JSON stash of the data for the statistics tables
    $c->stash->{reading_statistics} = to_json($t->{'variants'});
}

sub _stringify_element {
    my ($hash, $key) = @_;
    return undef unless exists $hash->{$key};
    if (ref($hash->{$key}) eq 'ARRAY') {
        my $str = join(', ', @{ $hash->{$key} });
        $hash->{$key} = $str;
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
    my ($self, $c) = @_;
    my $dot        = $c->request->param('dot');
    my @layerwits  = $c->request->param('layerwits[]');
    my $tempstemma = stemmaweb::Model::Stemma->new('dot' => $dot);
    my $svgopts    = {};
    if (@layerwits) {
        $svgopts->{'layerwits'} = \@layerwits;
    }
    $c->stash->{'result'} = $tempstemma->as_svg($svgopts);
    $c->forward('View::SVG');
}

=head2 end

Attempt to render a view, if needed.

=cut

sub end :ActionClass('RenderView') { }

=head1 AUTHOR

Tara L Andrews

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

__PACKAGE__->meta->make_immutable;

1;
