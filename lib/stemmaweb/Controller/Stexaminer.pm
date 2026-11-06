package stemmaweb::Controller::Stexaminer;
use Moose;
use namespace::autoclean;
use JSON;
use stemmaweb::Model::Analysis qw/ run_analysis /;
use stemmaweb::Model::Stemma;
use stemmaweb::Controller::Util qw/ load_tradition load_stemma json_error /;
use TryCatch;
use URI::Escape ();

BEGIN { extends 'Catalyst::Controller' }

has stexaminer_url => (
    is        => 'ro',
    isa       => 'Str',
    predicate => 'has_stexaminer_url',
);

# How many seconds a request for the analysis waits for the calculations before
# displaying incomplete results and the 'pending' message
has wait_timeout => (
    is      => 'ro',
    isa     => 'Int',
    default => 60,
);

=head1 NAME

stemmaweb::Controller::Stexaminer - Simple controller for stemma display

=head1 DESCRIPTION

The stemma analysis tool with the pretty colored table.

=head1 METHODS

=head2 index

 GET stexaminer/$textid/$stemmaid
     normalize: <relation type to normalize on>
     show_type1: <on, to include type-1 variation>

Renders the application for the text identified by $textid, using the stemma
graph identified by $stemmaid. The page is sent at once, with a waiting message
where the table of variants goes; the page then fetches the analysis from
the 'analysis' action.

=cut

sub index :Path :Args(2) {
    my ($self, $c, $textid, $stemid) = @_;
    $c->stash->{template} = 'stexaminer.tt';

    my $textinfo = load_tradition($c, $textid);
    return if exists $c->stash->{'result'};

    if ($stemid eq 'help') {

        # Just show the 'Help/About' popup.
        $c->stash->{template} = 'stexaminer_help.tt';
        $c->stash->{text_id}  = $textid;
        return;
    }

    my $stemma = _fetch_stemma($c, $textid, $stemid);
    return if exists $c->stash->{'result'};
    my $svgstr = $stemma->as_svg();
    $svgstr =~ s/\n/ /g;
    $c->stash->{svg}        = $svgstr;
    $c->stash->{graphdot}   = $stemma->editable({ linesep => ' ' });
    $c->stash->{text_id}    = $textid;
    $c->stash->{stem_id}    = $stemid;
    $c->stash->{text_title} = $textinfo->{name};
    $c->stash->{show_type1} = $c->req->param('show_type1') ? 1 : 0;
    _normalize_option($c, $textid);
}

=head2 analysis

 GET stexaminer/analysis/$textid/$stemmaid
     normalize: <relation type to normalize on>
     show_type1: <on, to include type-1 variation>

Runs the analysis for the text and stemma and returns it as JSON: 
- the C<variants> table data,
- the C<total> (of locations that have been analyzed), 
- C<genealogical> and
- C<conflict> counts. 
 
Any locations whose calculation is still running are returned unsolved (with
C<unsolved> set to C<pending>) and counted in C<incomplete>.

Populate C<error> if the analysis failed.

=cut

sub analysis :Local :Args(2) {
    my ($self, $c, $textid, $stemid) = @_;
    my $m = $c->model('Directory');

    my $textinfo = load_tradition($c, $textid);
    return if exists $c->stash->{'result'};
    my $stemma = _fetch_stemma($c, $textid, $stemid);
    return if exists $c->stash->{'result'};
    unless ($self->has_stexaminer_url) {
        return json_error($c, 500, 'No Stexaminer service has been configured.');
    }

    my %analysis_options = (
        exclude_type1  => $c->req->param('show_type1') ? 0 : 1,
        stexaminer_url => $self->stexaminer_url,
        wait_timeout   => $self->wait_timeout,
    );
    # Validate the relation type we were asked to normalise on
    my $normalize = _normalize_option($c, $textid);
    return if exists $c->stash->{'result'};
    my $conflate = $normalize ? '?conflate=' . URI::Escape::uri_escape($normalize) : '';

    # Get the alignment of each section of the text from the repository
    my @sections;
    my $t;
    try {
        foreach my $section (@{ $textinfo->{sections} }) {
            my $sid = $section->{id};
            push(@sections, {
                id        => $sid,
                name      => $section->{name},
                alignment => $m->ajax('get', "/tradition/$textid/section/$sid/json$conflate"),
                relations => $m->ajax('get', "/tradition/$textid/section/$sid/relations"),
            });
        }
        $t = run_analysis($stemma, \@sections, %analysis_options);
    }
    catch (stemmaweb::Error $e ) {
        return json_error($c, $e->status, $e->message);
    }
    catch ($e) {
        $e =~ s/\s+$//;
        return json_error($c, 500, "Could not analyze this text: $e");
    }

    # The page shows these as text
    foreach my $loc (@{ $t->{'variants'} }) {
        foreach my $rhash (@{ $loc->{'readings'} }) {
            _stringify_element($rhash, 'independent_occurrence');
            _stringify_element($rhash, 'reversions');
        }
    }
    $c->stash->{'result'} = {
        variants     => $t->{'variants'},
        total        => $t->{'variant_count'} - $t->{'incomplete'},
        genealogical => $t->{'genealogical_count'},
        conflict     => $t->{'conflict_count'},
        incomplete   => $t->{'incomplete'},
        ($t->{error} ? (error => $t->{error}) : ()),
    };
    $c->forward('View::JSON');
}

# Fetch the stemma from the repository. On failure the error has been answered
# and the caller should check for $c->stash->{'result'}.
sub _fetch_stemma {
    my ($c, $textid, $stemid) = @_;
    my $stemmadata;
    try {
        $stemmadata = $c->model('Directory')->ajax('get', "/tradition/$textid/stemma/$stemid");
    }
    catch (stemmaweb::Error $e ) {
        json_error($c, $e->status, $e->message);
        return undef;
    }
    return load_stemma($stemmadata);
}

# Get the available relation types that can be used for normalisation, and default to 
# the one selected
sub _normalize_option {
    my ($c, $textid) = @_;
    my $reltypes;
    try {
        $reltypes = $c->model('Directory')->ajax('get', "/tradition/$textid/relationtypes");
    }
    catch (stemmaweb::Error $e ) {
        json_error($c, $e->status, $e->message);
        return undef;
    }
    my @normalizable = sort map { $_->{name} } grep { !$_->{is_weak} } @$reltypes;
    my $normalize = $c->req->param('normalize') || '';
    $normalize = '' unless grep { $_ eq $normalize } @normalizable;
    $c->stash->{'normalizable'} = \@normalizable;
    $c->stash->{'normalize'}    = $normalize;
    return $normalize;
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
