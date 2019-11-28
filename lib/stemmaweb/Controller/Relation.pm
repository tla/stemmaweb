package stemmaweb::Controller::Relation;
use JSON qw/ to_json from_json encode_json /;
use Moose;
use Moose::Util::TypeConstraints qw/ find_type_constraint /;
use Module::Load;
use String::Diff;
use namespace::autoclean;
use stemmaweb::Controller::Util
  qw/ load_tradition json_error json_bool section_metadata /;
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

# Here is the tradition lookup and ACL check...
sub text :Chained('/') :PathPart('relation') :CaptureArgs(1) {
    my ($self, $c, $textid) = @_;
    my $textinfo = load_tradition($c, $textid);

    # Did something go wrong? An error message will be in the stash
    $c->detach() if (exists $c->stash->{'result'});
    unless ($textinfo->{permission}) {
        json_error($c, 403, "You do not have permission to view this text");
        $c->detach();
    }

    $c->stash->{'textid'}     = $textid;
    $c->stash->{'tradition'}  = $textinfo;
    $c->stash->{'permission'} = $textinfo->{permission};
}

# Redirect a request for the text itself into a request for the first section.
sub firstsection :Chained('text') :PathPart('') :Args(0) {
    my ($self, $c) = @_;
    my $textid = $c->stash->{textid};

    # Redirect this to the first section.
    my $first = $c->stash->{tradition}->{sections}->[0]->{id};
    unless (defined($first)) {
        $c->log->warn("No first section ID found for $textid");
        $first = '';
    }
    $c->res->redirect($c->uri_for(sprintf("/relation/%s/%s", $textid, $first)));
}

# Here is the action for when a section has been explicitly specified.
sub section :Chained('text') :PathPart('') :CaptureArgs(1) {
    my ($self, $c, $sectionid) = @_;
    my $section;
    try {
        $section = $c->model('Directory')->ajax(
            'get',
            sprintf(
                '/tradition/%s/section/%s', $c->stash->{textid}, $sectionid
            )
        );
    }
    catch (stemmaweb::Error $e ) {
        return json_error($c, $e->status, $e->message);
    }

    $c->stash->{sectid}  = $sectionid;
    $c->stash->{section} = $section;
}

# ...and here is the page variable initialisation with whichever section
# was requested.
sub main :Chained('section') :PathPart('') :Args(0) {
    my ($self, $c) = @_;
    my $m         = $c->model('Directory');
    my $tradition = delete $c->stash->{'tradition'};
    if ($c->request->method ne 'GET') {
        json_error($c, 405, "Use GET instead");
    }

    # Stash text direction to use in JS.
    $c->stash->{'direction'} = $tradition->{direction} || 'BI';

    # Stash the relationship definitions.
    $c->stash->{'relationship_scopes'} = to_json([qw(local document)]);
    $c->stash->{'ternary_values'}      = to_json([qw(yes maybe no)]);
    # Set some defaults for backwards compatibility
    my $reltypeinfo = [
        {
            name => 'orthographic',
            description =>
              'These are the same reading, neither unusually spelled.'
        },
        {
            name        => 'punctuation',
            description => 'These are the same reading apart from punctuation.'
        },
        {
            name        => 'spelling',
            description => 'These are the same reading, spelled differently.'
        },
        {
            name => 'grammatical',
            description =>
'These readings share a root (lemma), but have different parts of speech (morphologies).'
        },
        {
            name => 'lexical',
            description =>
'These readings share a part of speech (morphology), but have different roots (lemmata).'
        },
        {
            name => 'uncertain',
            description =>
'These readings are related, but a clear category cannot be assigned.'
        },
        {
            name => 'other',
            description =>
'These readings are related in a way not covered by the existing types.'
        },
        {
            name => 'transposition',
            description =>
'This is the same (or nearly the same) reading in a different location.'
        },
        {
            name => 'repetition',
            description =>
              'This is a reading that was repeated in one or more witnesses.'
        },
    ];
    # Add / override the types associated with this tradition
    my $textid = $c->stash->{textid};
    try {
        my $definedtypes = $m->ajax('get', "/tradition/$textid/relationtypes");
        foreach my $type (@$definedtypes) {
            my @existing = grep { $_->{name} eq $type->{name} } @$reltypeinfo;
            if (@existing) {
                $existing[0]->{description} = $type->{description};
            } else {
                push(@$reltypeinfo, { name => $type->{name}, description => $type->{description} });
            }
        }
    } catch (stemmaweb::Error $e ) {
        return json_error($c, $e->status, $e->message);
    }
    $c->stash->{'relationship_types'} = to_json($reltypeinfo);

    # Get the basic info we need
    $c->stash->{'text_title'}    = $tradition->{name};
    $c->stash->{'text_lang'}     = $tradition->{language} || 'Default';
    $c->stash->{'sect_metadata'} = to_json($c->stash->{section});
    $c->stash->{'sections'}      = $tradition->{sections};

    # Spit out the SVG
    # my $svgstr = generate_svg( $c ); # $c contains text & section info
    # try {
    #     my $svgstr = $m->tradition_as_svg($textid,
    #         { section => $c->stash->{sectid} });
    #     $svgstr =~ s/\n//gs;
    #     $c->stash->{'svg_string'} = $svgstr;
    # }
    # catch (stemmaweb::Error $e) {
    #     return json_error($c, $e->status, $e->message);
    # }

    # $c->stash->{'can_morphologize'} = $tradition->{language} ne 'Default';
    # Set the template for the page load
    $c->stash->{'template'} = 'relate.tt';
}

sub get_graph :Chained('section') :PathPart :Args(0) {
    my ($self, $c) = @_;
    my $textid = $c->stash->{textid};
    my $m = $c->model('Directory');
    my $contenttype = delete $c->request->params->{'type'};
    $contenttype ||= 'SVG';

    my $opts = { section => $c->stash->{sectid} };
    foreach my $k (keys %{$c->request->params}) {
        $opts->{$k} = $c->request->params->{$k};
    }

    my $svgstr;
    try {
        $svgstr = $m->tradition_as_svg($textid, $opts);
        $c->stash->{'result'} = $svgstr;
    } catch (stemmaweb::Error $e) {
        return json_error($c, $e->status, $e->message);
    }
    $c->forward("View::$contenttype");
}

=head2 help

 GET relation/help/$language

Returns the help window HTML.

=cut

sub help :Local :Args(1) {
    my ($self, $c, $lang) = @_;
    $c->stash->{'template'} = 'relatehelp.tt';
}

=head2 metadata

 POST relation/$textid/$sectid/info

Update the metadata for a section. At present, this means changing its name.

Accepts a form data post with the new section info, and attempts to change the
name on the server. Returns a JSON structure with the updated info.

  { 'id' => $sectid, 'name' => $new_name }

=cut

sub metadata :Chained('section') :PathPart :Args(0) {
    my ($self, $c) = @_;
    my $textid = $c->stash->{textid};
    my $sectid = $c->stash->{sectid};
    return section_metadata($c, $textid, $sectid);
}

=head2 download

  GET relation/$textid/$sectid/download?format=$format

Downloads the section in the requested format.

=cut

sub download :Chained('section') :PathPart :Args(0) {
    my ($self, $c) = @_;
    # Add the relevant query parameters
    $c->request->params->{tradition} = $c->stash->{textid};
    $c->request->params->{section} = $c->stash->{sectid};
    # and the text name
    $c->stash->{name} = $c->stash->{section}->{name};
    # ...and refer this to the main download routine.
    $c->detach($self->action_for("../download"));
}

=head2 relationships

 GET relation/$textid/$sectid/relationships

Returns a JSON list of relationships defined for this text. Each relationship
is an object that looks like this:

 { 'a_derivable_from_b' => JSON::False
   'alters_meaning' => 0,
   'annotation' => undef,
   'b_derivable_from_a' => JSON::False,
   'displayform' => undef,
   'extra' => undef,
   'id' => 90778,
   'is_significant' => 'no',
   'non_independent' => JSON::False,
   'scope' => 'local',
   'source' => 66220,
   'target' => 66221,
   'type' => 'orthographic'}

 POST relation/$textid/$sectid/relationships { request }

Accepts a form data post with keys as above, and attempts to create the
requested relationship. Required keys are source, target, type, and scope;
others are only necessary if they are non-default.

On success, returns a JSON list of relationships that should be created in
[source_id, target_id, type] tuple form.

 DELETE relation/$textid/$sectid/relationships { request }

Accepts a form data post with a source_id and a target_id to indicate the
relationship to delete.

On success, returns a JSON list of relationships that should be removed in
[source_id, target_id] tuple form.

=cut

sub relationships :Chained('section') :PathPart :Args(0) {
    my ($self, $c) = @_;
    my $textid = $c->stash->{textid};
    my $sectid = $c->stash->{sectid};
    my $m      = $c->model('Directory');
    if ($c->request->method eq 'GET') {
        try {
            $c->stash->{'result'} =
              $m->ajax('get', "/tradition/$textid/section/$sectid/relations");
        }
        catch (stemmaweb::Error $e ) {
            return json_error($c, $e->status, $e->message);
        }
    } else {

        # Check write permissions first of all
        if ($c->stash->{permission} ne 'full') {
            json_error($c, 403,
                'You do not have permission to modify this tradition.');
        } elsif ($c->request->method eq 'POST') {
            my $opts = $c->request->params;
            my $sourceparam = delete $opts->{'source'};
            my @sourcenodes;
            if (ref($sourceparam) eq 'ARRAY') {
                push(@sourcenodes, @$sourceparam);
            } else {
                push(@sourcenodes, $sourceparam);
            }

            # TODO validate relationship type
            # Keep the data clean
            my @booleans =
              qw/ a_derivable_from_b b_derivable_from_a non_independent /;
            foreach my $k (keys %$opts) {
                if ($opts->{$k} && grep { $_ eq $k } @booleans) {
                    $opts->{$k} = $k eq 'false' ? JSON::false : JSON::true;
                }
            }

            delete $opts->{scope}          unless $opts->{scope};
            delete $opts->{annotation}     unless $opts->{annotation};
            delete $opts->{is_significant} unless $opts->{is_significant};

            my $result = {status => 'ok'};
            my @relpairs;
            my @changed_readings;
            my $lastattempted;
            ## Error out on the first failed request.
            try {
                foreach my $s (@sourcenodes) {
                    $lastattempted = $s;
                    my $reqopts = { %$opts };
                    $reqopts->{source} = $s;
                    my $result = $m->ajax(
                        'post',
                        "/tradition/$textid/relation",
                        'Content-Type' => 'application/json',
                        'Content'      => encode_json($reqopts)
                    );
                    push(@relpairs, @{ $result->{relations} });
                    push(@changed_readings, @{ $result->{readings} });
                }
            } catch (stemmaweb::Error $e ) {
                if (@relpairs) {
                    # Return a warning
                    $result->{status} = 'warn';
                    $result->{warning} = sprintf("Could not relate reading %s: %d / %s",
                        $lastattempted, $e->status, $e->message);
                } else {
                    # Return an error
                    return json_error($c, $e->status, $e->message);
                }
            }

            $result->{relationships} = \@relpairs;
            $result->{readings} = \@changed_readings;
            $c->stash->{result} = $result;

        } elsif ($c->request->method eq 'DELETE') {

            # We can delete either by specifying the relationship or by
            # specifying a reading, and deleting all relationships of that
            # reading.
            my $rdg_id = $c->request->param('from_reading');
            if ($rdg_id) {
                try {
                    my $deleted =
                      $m->ajax('delete', "/reading/$rdg_id/relations");
                    my @relpairs =
                      map { [ $_->{source}, $_->{target}, $_->{type} ] }
                      @$deleted;
                    $c->stash->{result} = { relationships => \@relpairs };
                }
                catch (stemmaweb::Error $e ) {
                    return json_error($c, $e->status, $e->message);
                }
            } else {
                my $scopewide = $c->request->param('scopewide')
                  && $c->request->param('scopewide') eq 'true';
                my $opts = {
                    source => $c->request->param('source_id'),
                    target => $c->request->param('target_id'),
                    scope  => $scopewide ? 'document' : 'local'
                };
                my $result;
                try {
                    $result = $m->ajax(
                        'post',
                        "/tradition/$textid/relation/remove",
                        'Content-Type' => 'application/json',
                        'Content'      => encode_json($opts)
                    );
                }
                catch (stemmaweb::Error $e ) {
                    return json_error($c, $e->status, $e->message);
                }
                my @relpairs =
                  map { [ $_->{source}, $_->{target}, $_->{type} ] } @$result;
                $c->stash->{result} = { relationships => \@relpairs };
            }
        } else {
            json_error($c, 405, "You can GET, POST, or DELETE");
        }
    }
    $c->forward('View::JSON');
}

=head2 readings

 GET relation/$textid/section/$sectionid/readings

Returns a JSON dictionary, keyed on the SVG node ID of the reading, of all
readings defined for this section along with their metadata. A typical object in
this dictionary will look like:

  "n1051" => {"id":"1051",
   "witnesses":["Gr314","Kf133","Mu11475","Kr299","MuU151","Er16","Ba96","Wi3818","Mu28315"],
   "text":"dicens.",
   "is_meta":null,
   "variants":[]}

=cut

my %read_write_keys = (
    'id'              => 0,
    'text'            => 1,
    'rank'            => 0,
    'is_meta'         => 0,
    'grammar_invalid' => 1,
    'is_lemma'        => 1,
    'is_nonsense'     => 1,
    'normal_form'     => 1,
    'join_prior'      => 0,
    'join_next'       => 0,
    'annotation'      => 1,
    'display'         => 1,
    'witnesses'       => 0
);

# Return a JSONable struct of the useful keys.  Keys meant to be writable
# have a true value; read-only keys have a false value. If the SVG ID for
# the reading differs from the database ID, an additional key 'svg_id' will
# be put in the hash; this can be used or removed before return to the client.
#   { 'n123' => {id => '123', text => 'foo', is_lemma => JSON::False, ... }}
sub _reading_struct {
    my ($reading) = @_;
    my $struct = {};
    map { $struct->{$_} = $reading->{$_} } keys %read_write_keys;

    # Set known IDs on start/end nodes, that match what will be in the SVG
    if (exists $reading->{is_start} && $reading->{is_start} == JSON::true) {
        $struct->{id} = '__START__';
    } elsif (exists $reading->{is_end} && $reading->{is_end} == JSON::true) {
        $struct->{id} = '__END__';
    } else {
        $struct->{svg_id} = 'n' . $reading->{id};
    }

    # Calculate is_meta
    $struct->{is_meta} =
         $reading->{is_start}
      || $reading->{is_end}
      || $reading->{is_lacuna}
      || $reading->{is_ph};

    # Set the normal form if necessary
    $struct->{normal_form} = $reading->{normal_form} || $reading->{text};

    return $struct;
}

sub readings :Chained('section') :PathPart :Args(0) {
    my ($self, $c) = @_;
    if ($c->request->method ne 'GET') {
        json_error($c, 405, "Use GET instead");
    }
    my $textid = $c->stash->{'textid'};
    my $sectid = $c->stash->{'sectid'};
    my $m      = $c->model('Directory');
    my $rdglist;
    try {
        $rdglist =
          $m->ajax('get', "/tradition/$textid/section/$sectid/readings");
    }
    catch (stemmaweb::Error $e ) {
        return json_error($c, $e->status, $e->message);
    }

    # Get the extra information we need
    my $ret = {};
    foreach my $rdg (@$rdglist) {
        # Exclude emendations
        next if $rdg->{is_emendation};
        # Modify the stemmarest reading into a stemmaweb one
        my $struct = _reading_struct($rdg);

        # The struct we return needs to be keyed on SVG node ID.
        my $nid = delete $struct->{svg_id};
        $ret->{ $nid ? $nid : $struct->{id} } = $struct;
    }
    $c->stash->{result} = $ret;
    $c->forward('View::JSON');
}

=head2 reading

 GET relation/$textid/$sectionid/reading/$id

Returns a JSON object describing the reading identified by $id.

 POST relation/$textid/$sectionid/reading/$id { request }

Accepts form data containing the following fields:

  - id (required)
  - is_lemma (checked or not)
  - grammar_invalid (checked or not)
  - is_nonsense (checked or not)
  - normal_form (text)
  - text (text)
  - display (text)
  - annotation (text)

and updates the reading attributes as indicated.

=cut

sub reading :Chained('section') :PathPart :Args(1) {
    my ($self, $c, $reading_id) = @_;
    my $m = $c->model('Directory');
    my $orig_reading;
    try {
        $orig_reading = $m->ajax('get', "/reading/$reading_id");
    }
    catch (stemmaweb::Error $e ) {
        return json_error($c, $e->status, $e->message);
    }
    if ($c->request->method eq 'GET') {
        my $result = _reading_struct($orig_reading);
        delete $result->{svg_id};
        $c->stash->{'result'} = $result;
    } elsif ($c->request->method eq 'POST') {

        # Auth check
        if ($c->stash->{'permission'} ne 'full') {
            json_error($c, 403,
                'You do not have permission to modify this tradition.');
        }

        # Assemble the properties, being careful of data types
        my @booleans      = qw/ is_nonsense grammar_invalid /;
        my $changed_props = [];
        # We have to handle the lemma setting separately.
        my $changed_lemma;
        foreach my $k (keys %{ $c->request->params }) {
            if ($k eq 'is_lemma') {
                $changed_lemma = $c->request->param($k);
                next;
            }

            # Be careful of data types!
            my $prop = $c->request->param($k);
            if ($prop && grep { $_ eq $k } @booleans) {
                $prop = $prop eq 'false' ? JSON::false : JSON::true;
            }
            push(@$changed_props, { key => $k, property => $prop })
              if $read_write_keys{$k};
        }

        # Change the reading
        my $reading;
        my @changed;
        try {
            ## First update all the non-side-effect properties
            if (@$changed_props) {
                $reading = $m->ajax(
                    'put', "/reading/$reading_id",
                    'Content-Type' => 'application/json',
                    'Content'      => encode_json({ properties => $changed_props })
                );
                push(@changed, $reading);
            }
            ## Now update the properties with side effects
            if (defined $changed_lemma) {
                # Assuming the reading itself changed, it will be in the list
                my $lresult = $m->ajax('post', "/reading/$reading_id/setlemma?value=$changed_lemma");
                push(@changed, @$lresult );
            }
        }
        catch (stemmaweb::Error $e ) {
            return json_error($c, $e->status, $e->message);
        }

        # If our reading is there multiple times from multiple updates,
        # the last version will be kept.
        my $changelist = {};
        map { $changelist->{$_->{id}} = _reading_struct($_) } @changed;

        $c->stash->{result} = { readings => [ values(%$changelist) ] };
    } else {
        json_error($c, 405, "You can GET or POST");
    }
    $c->forward('View::JSON');
}

=head2 lemmatext

 GET relation/$textid/$sectionid/lemmatext

Returns the current lemma text for the section in a JSON object, key 'text'.
If the lemma text has not been marked final, shows the gaps where text is not
yet lemmatised. If any lemmas have changed since the text was last marked final,
shows the differences where they appear.

=cut

sub lemmatext :Chained('section') :PathPart :Args(0) {
    my ($self, $c) = @_;
    my $textid = $c->stash->{'textid'};
    my $sectid = $c->stash->{'sectid'};
    my $m = $c->model('Directory');
    if ($c->request->method eq 'GET') {
        try {
            my $lemmaset = $m->ajax('get', "/tradition/$textid/section/$sectid/lemmatext?final=true");
            my $lemmacurr = $m->ajax('get', "/tradition/$textid/section/$sectid/lemmatext?final=false");
            if ($lemmaset->{text} eq "") {
                # Return the non-final version, no questions asked
                $c->stash->{result} = $lemmacurr;
            } else {
                # Check to see whether there is a difference between the two versions
                my $currnonsp = $lemmacurr->{text};
                $currnonsp =~ s/\[\.\.\.\]\s*//g;
                if ($currnonsp ne $lemmaset->{text}) {
                    my ($old, $new) = String::Diff::diff($lemmaset->{text}, $currnonsp);
                    $c->stash->{result} = {text => $new};
                } else {
                    $c->stash->{result} = $lemmaset;
                }
            }
        } catch (stemmaweb::Error $e) {
            return json_error($c, $e->status, $e->message);
        }
    } else {
        json_error($c, 405, "Use GET instead");
    }
    $c->forward('View::JSON');
}

=head2 witnesstext

  GET relation/$textid/$sectionid/witness/$sigil[?layer=$layer]

Returns the text of the given witness for this section.

=cut

sub witnesstext :Chained('section') :PathPart :Args(1) {
    my ($self, $c, $sigil) = @_;
    my $textid = $c->stash->{'textid'};
    my $sectid = $c->stash->{'sectid'};
    my $m = $c->model('Directory');
    if ($c->request->method eq 'GET') {
        # Is there a layer parameter?
        my $layer = $c->request->param('layer');
        try {
            my $url = "/tradition/$textid/section/$sectid/witness/$sigil/text";
            if ($layer) {
                $url .= "?layer=$layer";
            }
            my $resp = $m->ajax('get', $url);
            $c->stash->{result} = $resp;
        } catch (stemmaweb::Error $e) {
            return json_error($c, $e->status, $e->message);
        }
    } else {
        json_error($c, 405, "Use GET instead");
    }
    $c->forward('View::JSON');
}

=head2 copynormal

  POST relation/$textid/$sectionid/copynormal/$reading/$reltype

Copies the normal form of the given reading to any readings related via the
given relation type. Returns a list of altered readings.

=cut

sub copynormal :Chained('section') :PathPart :Args(2) {
    my ($self, $c, $reading, $reltype) = @_;
    my $m = $c->model('Directory');
    if ($c->request->method eq 'POST') {
        # Auth check
        if ($c->stash->{'permission'} ne 'full') {
            json_error($c, 403,
                'You do not have permission to modify this tradition.');
        }
        # Do the deed
        try {
            my $url = "/reading/$reading/normaliseRelated/$reltype";
            my $resp = $m->ajax('post', $url);
            my $changelist = [ map { _reading_struct($_) } @$resp];
            $c->stash->{result} = $changelist;
        } catch (stemmaweb::Error $e) {
            return json_error($c, $e->status, $e->message);
        }
    } else {
        json_error($c, 405, "Use POST instead");
    }
    $c->forward('View::JSON');
}

=head2 emendations

  GET relation/$textid/$sectionid/emendations

 Returns a list of emendations for a given section.

=cut

sub emendations :Chained('section') :PathPart :Args(0) {
    my ($self, $c) = @_;
    my $textid = $c->stash->{'textid'};
    my $sectid = $c->stash->{'sectid'};
    my $m = $c->model('Directory');
    if ($c->request->method eq 'GET') {
        try {
            my $resp = $m->ajax(
                'get', "/tradition/$textid/section/$sectid/emendations");
            $c->stash->{result} = {
                readings => [map { _reading_struct($_) } @{$resp->{readings}}],
                sequences => $resp->{sequences}
            };
        }
        catch (stemmaweb::Error $e) {
            return json_error($c, $e->status, $e->message);
        }
    } else {
        json_error($c, 405, "Use GET instead");
    }
    $c->forward('View::JSON');
}

=head2 emend

  POST relation/$textid/$sectionid/emend

Accepts form data containing the following:
- fromRank
- toRank
- text
- authority

Adds an emendation to the text at the given location. On success,
returns the new reading and the sequence links to the neighbour readings.

=cut

sub emend :Chained('section') :PathPart :Args(0) {
    my ($self, $c) = @_;
    my $textid = $c->stash->{'textid'};
    my $sectid = $c->stash->{'sectid'};
    my $m = $c->model('Directory');
    if ($c->request->method eq 'POST') {

        # Auth check
        if ($c->stash->{'permission'} ne 'full') {
            json_error($c, 403,
                'You do not have permission to modify this tradition.');
        }

        # The proposed emendation object should be a JSONification
        # of the form params.
        try {
            my $resp = $m->ajax(
                'post', "/tradition/$textid/section/$sectid/emend",
                'Content-Type' => 'application/json',
                'Content'      => encode_json($c->request->params)
            );
            $c->stash->{result} = {
                readings => [map { _reading_struct($_) } @{$resp->{readings}}],
                sequences => $resp->{sequences}
            }
        }
        catch (stemmaweb::Error $e) {
            return json_error($c, $e->status, $e->message);
        }
    } else {
        json_error($c, 405, "Use POST instead");
    }
    $c->forward('View::JSON');
}

=head2 compress

 POST relation/$textid/$sectionid/compress { data }

Accepts form data containing a list of 'readings[]'.

Concatenates the requested readings into a single reading. All sequence
relationships between the affected readings must be removed in visual display;
this is the responsibility of the client.

On success returns a JSON object that looks like this:

  {"nodes":["n158","n159","n160","n161","n162","n163"],
   "success":1}

=cut

## TODO push the >2-node compress operation out to stemmarest
sub compress :Chained('section') :PathPart :Args(0) {
    my ($self, $c) = @_;
    my $m = $c->model('Directory');
    if ($c->request->method eq 'POST') {

        # Auth check
        if ($c->stash->{'permission'} ne 'full') {
            json_error($c, 403,
                'You do not have permission to modify this tradition.');
        }

        my @rids  = $c->request->param('readings[]');
        my $first = shift @rids;

        my @nodes = ($first);
        my $result = { status => 'ok' };
        try {
            while (scalar @rids) {
                my $rid = shift @rids;
                $m->ajax(
                    'post', "/reading/$first/concatenate/$rid",
                    'Content-Type' => 'application/json',
                    'Content'      => encode_json({ character => " " })
                );
                push(@nodes, $rid);
            }
        }
        catch (stemmaweb::Error $e ) {

            # If we have merged anything we should say so in the
            # response, but note a warning too.
            return json_error($c, $e->status, $e->message)
              if scalar(@nodes) == 1;
            $result->{status} = 'warn';
            $result->{warning} = $e->message;
        }
        $result->{nodes} = \@nodes;

        # Return what we have.
        $c->stash->{result} = $result;
        $c->forward('View::JSON');
    } else {
        json_error($c, 405, "Use POST instead");
    }
}

=head2 merge

 POST relation/$textid/$sectionid/merge { data }

Accepts form data identical to the ../relationships POST call, with one extra
Boolean parameter 'single'.

Merges the requested readings, combining the witnesses of both readings into the
target reading. All relationships of the source reading will be transferred to
the target reading; visualising this is the responsibility of the client.

On success returns a JSON object that looks like this:

  {"status":"ok",
   "checkalign":[["n135","n130"],
                 ["n133","n127"],
                 ["n126","n132"]]}

The "checkalign" key will only be included if 'single' does not have a true
value. It contains a list of tuples indicating readings that seem to be
identical, and that the user may want to merge in addition.

=cut

sub merge :Chained('section') :PathPart :Args(0) {
    my ($self, $c) = @_;
    my $m      = $c->model('Directory');
    my $textid = $c->stash->{textid};
    my $sectid = $c->stash->{sectid};
    if ($c->request->method eq 'POST') {

        # Auth check
        if ($c->stash->{'permission'} ne 'full') {
            json_error($c, 403,
                'You do not have permission to modify this tradition.');
        }
        my $main   = $c->request->param('target');
        my @rest = $c->request->param('source');
        my $section_end = $c->stash->{section}->{'endRank'};
        my $extent = 0; # Keep track of how many ranks are crossed, for later mergeability check
        my $rdg_rank = $section_end;
        my @succeeded;
        my $failed = {};
        foreach my $second (@rest) {
            try {
                ## Figure out the range of ranks we are dealing with
                my $main_info   = $m->ajax('get', "/reading/$main");
                my $second_info = $m->ajax('get', "/reading/$second");
                my $mrank = $main_info->{rank};
                my $srank = $second_info->{rank};
                my $magnitude = abs($mrank - $srank);
                $rdg_rank = $mrank < $rdg_rank ? $mrank : $rdg_rank;
                $rdg_rank = $srank < $rdg_rank ? $srank : $rdg_rank;
                $extent = $magnitude > $extent ? $magnitude : $extent;
                ## Do the merge
                $m->ajax('post', "/reading/$main/merge/$second");
                push(@succeeded, $second);
            }
            catch (stemmaweb::Error $e) {
                $failed->{$second} = [$e->status, $e->message];
            }
        }

        my $response = { status => 'ok' };
        if (keys %$failed) {
            # Don't do the mergeability check, just return the results.
            if (@succeeded) {
                $response->{status} = 'warn';
                $response->{warning} = assemble_warnings($failed);
                $response->{failed} = [ keys %$failed ];
            } else {
                my $error = assemble_failures($failed);
                json_error($c, @$error);
            }
        } elsif (!$c->request->param('single')) {
            # Now look for any mergeable readings on the tradition.
            my $mergeable;
            try {
                $mergeable = $m->ajax('get',
"/tradition/$textid/section/$sectid/mergeablereadings/$rdg_rank/$section_end?threshold=$extent"
                );
            }
            catch (stemmaweb::Error $e ) {
                $response->{status} = 'warn';
                $response->{warning} =
                  'Could not check for mergeable readings: ' . $e->message;
            }

            # Look for readings that are now identical.
            if (@$mergeable) {
                # Bug diagnostics
                try {
                    # Flip the order of the pairs, since Stemmaweb takes the first argument as the
                    # reading to get rid of
                    my @pairs =
                      map { [ $_->[1]->{id}, $_->[0]->{id} ] } @$mergeable;
                    $response->{checkalign} = \@pairs;
                } catch ($e) {
                    use Data::Dumper;
                    $c->log->warn("Caught bug in mergeables; response was");
                    $c->log->warn(Dumper($mergeable));
                }
            }
        }
        $c->stash->{'result'} = $response;
        $c->forward('View::JSON');
    } else {
        json_error($c, 405, "Use POST instead");
    }
}

=head2 duplicate

 POST relation/$textid/$sectionid/duplicate { data }

Accepts form data with a list of 'readings[]' and a list of 'witnesses[]'.

Duplicates the requested readings, detaching the witnesses specified in the list
to use the new reading(s) instead of the old.

Returns a JSON object that contains a key for each new reading thus created
(which is its SVG ID), as well as a key 'DELETED' that contains a list of tuples
indicating the relationships that should be removed from the graph. For example:

  {"DELETED":[["135","130","transposition"]],
   "n476":{"id":"476",
          "variants":[],
          "orig_rdg":"130",
          "is_meta":null,
          "witnesses":["Ba96"],
          "text":"et "}}


=cut

sub duplicate :Chained('section') :PathPart :Args(0) {
    my ($self, $c) = @_;
    my $m      = $c->model('Directory');
    my $textid = $c->stash->{textid};
    if ($c->request->method eq 'POST') {

        # Auth check
        if ($c->stash->{'permission'} ne 'full') {
            json_error($c, 403,
                'You do not have permission to modify this tradition.');
        }

        # Pass all the listed readings to stemmarest and let it sort
        # out the logic of what can be duplicated
        my @readings = $c->request->param('readings[]');
        my @wits = $c->request->param('witnesses[]');
        my $url = sprintf("/reading/%s/duplicate", $readings[0]);
        my $req = {
            readings  => \@readings,
            witnesses => \@wits
        };
        my $response;
        try {
            $response = $m->ajax(
                'post', $url,
                'Content-Type' => 'application/json',
                'Content'      => encode_json($req)
            );
        }
        catch (stemmaweb::Error $e) {
            json_error($c, $e->status, $e->message);
        }

        # Massage the response into the expected form. For this response
        # we use database IDs, for consistency.
        my @deleted_rels = map { [ $_->{source}, $_->{target}, $_->{type} ] }
          @{ $response->{relations} };
        $c->stash->{result} = { DELETED => \@deleted_rels };
        foreach my $r (@{ $response->{readings} }) {
            my $rinfo = _reading_struct($r);
            my $nid = delete $rinfo->{svg_id};

            # Add in the orig_reading information that was passed back
            $rinfo->{orig_reading} = $r->{orig_reading};
            $c->stash->{result}->{$nid} = $rinfo;
        }
    } else {
        json_error($c, 405, "Use POST instead");
    }
    $c->forward('View::JSON');
}

# TODO implement reading split in the UI

=head2 split

 POST relation/$textid/$sectionid/split { data }

Accepts form data with a reading ID, its text (for sanity checking; this should
be a hidden field on the web form), a character index at which to split the text
of the given reading, and (if the character index is zero) a regex on which to
split the text.

Splits the requested reading into multiple sequential ones. All relationships on
the reading must be removed first.

Returns a JSON structure of new or modified readings or relationships, whose
structure should be reflected in the updated visual display of the client.

  {"relationships":[{"source":"n131","target":"n131_0","id":"51", ...},
                    {"source":"n131_0","target":"n135","id":"52", ...}],
   "n131":{"id":"n131",
             "variants":[],
             "is_meta":null,
             "witnesses":["Ba96"],
             "text":"et",
             ...},
   "n131_0":{"id":"n131_0",
             "variants":[],
             "orig_rdg":"n131",
             "is_meta":null,
             "witnesses":["Ba96"],
             "text":"cetera",
             ...}}


=cut

sub split :Chained('section') :PathPart :Args(0) {
    my ($self, $c) = @_;
    my $m      = $c->model('Directory');
    my $textid = $c->stash->{textid};
    if ($c->request->method eq 'POST') {

        # Auth check
        if ($c->stash->{'permission'} ne 'full') {
            json_error($c, 403,
                'You do not have permission to modify this tradition.');
        }

        # Get and check the parameters
        my $rid      = $c->request->param('reading');
        my $rtext    = $c->request->param('rtext');
        my $index    = $c->request->param('index') || 0;
        my $regex    = $c->request->param('regex') || '\\s+';
        my $separate = $c->request->param('separate');

        # If index is nonzero, we ignore regex and split at the index location.
        my $model = {
            character => '',
            separate  => json_bool($separate),
            isRegex   => JSON::false
        };

        # If index is zero, we need to check that the match is zero-length,
        # i.e. that we will have the same string when we put the split pieces
        # back together. Our defaults are to split on whitespace.
        if ($index == 0) {
            my @test = split($regex, $rtext);
            my $joinchar = $separate ? ' ' : '';
            if (join($joinchar, @test) ne $rtext) {
                json_error($c, 400,
                    'The specified regular expression must be zero-length');
            }
            $model->{character} = $regex;
            $model->{isRegex}   = JSON::true;
        }

        # Do the deed
        my $url = "/reading/$rid/split/$index";
        my $response;
        try {
            $response = $m->ajax(
                'post', $url,
                'Content-Type' => 'application/json',
                'Content'      => encode_json($model)
            );
        }
        catch (stemmaweb::Error $e) {
            json_error($c, $e->status, $e->message);
        }

        # Fill out the readings and return the result. This response
        # uses database IDs.
        $c->stash->{result}->{relationships} = $response->{sequences};
        foreach my $r (@{ $response->{readings} }) {
            my $rinfo = _reading_struct($r);
            delete $rinfo->{svg_id};

            # Add in the orig_reading information that was passed back
            $rinfo->{orig_reading} = $r->{orig_reading};
            $c->stash->{result}->{ $r->{id} } = $rinfo;
        }

    } else {
        json_error($c, 405, "Use POST instead");
    }
    $c->forward('View::JSON');
}

=head2 assemble_warnings

Make a single warning message from a set of failed operations. Returns a collected string.

=cut

sub assemble_warnings {
    my ($failures) = @_;
    my $result = "";
    foreach my $r (keys %$failures) {
        $result .= sprintf("Reading %s: %d / %s\n", $r, $failures->{$r}->[0], $failures->{$r}->[1]);
    }
    return $result;
}

=head2 assemble_failures

Make a single warning message from a set of failed operations. Returns a status code + message.

=cut

sub assemble_failures {
    my ($failures) = @_;
    my $result = "";
    my $code;
    my $errmsg;
    foreach my $r (keys %$failures) {
        my( $c, $e ) = @{$failures->{$r}};
        if ($code && $code != $c) {
            $code = 500;
        } else {
            $code = $c;
        }
        if ($errmsg && $errmsg ne $e) {
            $errmsg = "Multiple errors returned";
        } else {
            $errmsg = $e;
        }
    }
    return [$code, $errmsg];
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
