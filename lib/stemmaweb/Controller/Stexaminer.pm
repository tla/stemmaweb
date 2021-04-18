package stemmaweb::Controller::Stexaminer;
use Moose;
use namespace::autoclean;
use Encode qw/ decode_utf8 /;
use File::Temp;
use JSON;
use stemmaweb::Model::Stemma;
use stemmaweb::Controller::Util qw/ stemma_info json_error /;
# use Text::Tradition::Analysis qw/ run_analysis wit_stringify /;
use TryCatch;

BEGIN { extends 'Catalyst::Controller' }

has idp_solver_url => (
    is        => 'ro',
    isa       => 'Str',
    predicate => 'has_idp_solver_url',
);

has idp_calcdsn => (
    is        => 'ro',
    isa       => 'Str',
    predicate => 'has_idp_calcdsn',
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

    my ($textinfo, $ok) = load_tradition($c, $textid);
    return unless $ok;

    if ($stemid eq 'help') {

        # Just show the 'Help/About' popup.
        $c->stash->{template} = 'stexaminer_help.tt';
        $c->stash->{text_id}  = $textid;
    } else {

        # Load our old-fashioned tradition object
        my $tradition = load_tradition($c, $textid);
        my $stemmadata = $m->ajax('get', "/tradition/$textid/stemma/$stemid");
        my $stemma = stemma_info($stemmadata);
        $tradition->clear_stemmata;
        $tradition->add_stemma($stemma);

        # Continue as before
        my $svgstr = $stemma->as_svg();
        $svgstr =~ s/\n/ /g;
        $c->stash->{svg}        = $svgstr;
        $c->stash->{graphdot}   = $stemma->editable({ linesep => ' ' });
        $c->stash->{text_id}    = $textid;
        $c->stash->{text_title} = $tradition->name;

        # Get the analysis options
        my ($use_type1, $ignore_sort) = (0, 'none');
        $use_type1 = $c->req->param('show_type1') ? 1 : 0;
        $ignore_sort = $c->req->param('ignore_variant') || '';
        $c->stash->{'show_type1'}     = $use_type1;
        $c->stash->{'ignore_variant'} = $ignore_sort;

        # TODO Run the analysis as AJAX from the loaded page.
        my %analysis_options = (
            stemma_id => '0',    # the selected stemma is the only stemma now
            exclude_type1 => !$use_type1
        );
        if ($ignore_sort eq 'spelling') {
            $analysis_options{'merge_types'} = [qw/ spelling orthographic /];
        } elsif ($ignore_sort eq 'orthographic') {
            $analysis_options{'merge_types'} = 'orthographic';
        }
        if ($self->has_idp_solver_url) {
            $analysis_options{'solver_url'} = $self->idp_solver_url;
        } elsif ($self->has_idp_calcdsn) {
            $analysis_options{'calcdsn'} = $self->idp_calcdsn;
        }

        my $t = run_analysis($tradition, %analysis_options);

        # Stringify the reading groups
        foreach my $loc (@{ $t->{'variants'} }) {
            my $mst = wit_stringify($loc->{'missing'});
            $loc->{'missing'} = $mst;
            foreach my $rhash (@{ $loc->{'readings'} }) {
                my $gst = wit_stringify($rhash->{'group'});
                $rhash->{'group'} = $gst;
                _stringify_element($rhash, 'independent_occurrence');
                _stringify_element($rhash, 'reversions');
                unless ($rhash->{'text'}) {
                    $rhash->{'text'} = $rhash->{'readingid'};
                }
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
    my $tempstemma = stemmaweb::Controller::Stemma->new('dot' => $dot);
    my $svgopts    = {};
    if (@layerwits) {
        $svgopts->{'layerwits'} = \@layerwits;
    }
    $c->stash->{'result'} = $tempstemma->as_svg($svgopts);
    $c->forward('View::SVG');
}

sub run_analysis {
    my @args = @_;
    print "Not implemented\n";
}

sub wit_stringify {
    my @args = @_;
    print "Not implemented\n";
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
