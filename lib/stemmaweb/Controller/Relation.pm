package stemmaweb::Controller::Relation;
use JSON qw/ to_json from_json encode_json /;
use Moose;
use Moose::Util::TypeConstraints qw/ find_type_constraint /;
use Module::Load;
use namespace::autoclean;
use stemmaweb::Controller::Util qw/ load_tradition json_error json_bool generate_svg /;
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
    my( $self, $c, $textid ) = @_;
    my $textinfo = load_tradition( $c, $textid );
    # Did something go wrong? An error message will be in the stash
    $c->detach() if (exists $c->stash->{'result'});
    unless($textinfo->{permission}) {
        json_error( $c, 403, "You do not have permission to view this text");
        $c->detach();
    }

    $c->stash->{'textid'} = $textid;
    $c->stash->{'tradition'} = $textinfo;
    $c->stash->{'permission'} = $textinfo->{permission};
}

# Redirect a request for the text itself into a request for the first section.
sub firstsection :Chained('text') :PathPart('') :Args(0) {
    my( $self, $c ) = @_;
    my $textid = $c->stash->{textid};
    # Redirect this to the first section.
    my $first = $c->stash->{tradition}->{sections}->[0]->{id};
    $c->res->redirect($c->uri_for(sprintf("/relation/%s/%s", $textid, $first)));
}

# Here is the action for when a section has been explicitly specified.
sub section :Chained('text') :PathPart('') :CaptureArgs(1) {
    my( $self, $c, $sectionid ) = @_;
    my $section;
    try {
        $section = $c->model('Directory')->ajax('get', sprintf('/tradition/%s/section/%s',
            $c->stash->{textid}, $sectionid));
    } catch( stemmaweb::Error $e ) {
        return json_error( $c, $e->status, $e->message );
    }

    $c->stash->{sectid} = $sectionid;
    $c->stash->{section} = $section;
}

# ...and here is the page variable initialisation with whichever section
# was requested.
sub main :Chained('section') :PathPart('') :Args(0) {
    my( $self, $c, $sectid ) = @_;
    my $m = $c->model('Directory');
    my $tradition = delete $c->stash->{'tradition'};
    if( $c->request->method ne 'GET' ) {
        json_error( $c, 405, "Use GET instead");
    }

    # Stash text direction to use in JS.
    $c->stash->{'direction'} = $tradition->{direction} || 'BI';

    # Stash the relationship definitions. TODO make these configurable.
    $c->stash->{'relationship_scopes'} = to_json([ qw(local document) ]);
    $c->stash->{'ternary_values'} = to_json([ qw(yes maybe no) ]);
    my $reltypeinfo = [
        { name => 'orthographic', description => 'These are the same reading, neither unusually spelled.' },
        { name => 'punctuation', description  => 'These are the same reading apart from punctuation.' },
        { name => 'spelling', description  => 'These are the same reading, spelled differently.' },
        { name => 'grammatical', description  => 'These readings share a root (lemma), but have different parts of speech (morphologies).' },
        { name => 'lexical', description  => 'These readings share a part of speech (morphology), but have different roots (lemmata).' },
        { name => 'uncertain', description  => 'These readings are related, but a clear category cannot be assigned.' },
        { name => 'other', description  => 'These readings are related in a way not covered by the existing types.' },
        { name => 'transposition', description  => 'This is the same (or nearly the same) reading in a different location.' },
        { name => 'repetition', description => 'This is a reading that was repeated in one or more witnesses.' },
    ];
    $c->stash->{'relationship_types'} = to_json( $reltypeinfo );

    # Get the basic info we need
    $c->stash->{'text_title'} = $tradition->{name};
    $c->stash->{'text_lang'} = $tradition->{language} || 'Default';
    $c->stash->{'sect_metadata'} = to_json($c->stash->{section});
    $c->stash->{'sections'} = $tradition->{sections};
    # Spit out the SVG
    my $svgstr = generate_svg( $c ); # $c contains text & section info
    $svgstr =~ s/\n//gs;
    $c->stash->{'svg_string'} = $svgstr;
    # $c->stash->{'can_morphologize'} = $tradition->{language} ne 'Default';
    # Set the template for the page load
    $c->stash->{'template'} = 'relate.tt';
}

=head2 help

 GET relation/help/$language

Returns the help window HTML.

=cut

sub help :Local :Args(1) {
    my( $self, $c, $lang ) = @_;
    $c->stash->{'template'} = 'relatehelp.tt';
}


=head2 metadata

 POST relation/$textid/$sectid/info

 Update the metadata for a section. At present, this means changing its name.

 Accepts a form data post with the new section info, and attempts to change
 the name on the server. Returns a JSON structure with the updated info.

  { 'id' => $sectid, 'name' => $new_name }

=cut

sub metadata :Chained('section') :PathPart :Args(0) {
    my( $self, $c ) = @_;
    my $textid = $c->stash->{textid};
    my $sectid = $c->stash->{sectid};
    my $m = $c->model('Directory');

    if ($c->request->method eq 'POST') {
        if( $c->stash->{permission} ne 'full' ) {
            json_error( $c, 403, 'You do not have permission to modify this tradition.' );
        } else {
            # Take the old section, update its values, and PUT the result.
            my $request = $c->req->params();
            my $struct = $c->stash->{section};
            map { $struct->{$_} = $request->{$_} } keys %$request;
            try {
                $c->stash->{result} = $m->ajax('put', "/tradition/$textid/section/$sectid",
                    'Content-Type' => 'application/json',
                    'Content' => encode_json( $request ));
            } catch (stemmaweb::Error $e ) {
                return json_error( $c, $e->status, $e->message );
            }

        }
    }
    $c->forward('View::JSON');
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

Accepts a form data post with keys as above, and attempts to create the requested
relationship. Required keys are source, target, type, and scope; others are
only necessary if they are non-default. On success, returns a JSON list of
relationships that should be created in [source_id, target_id, type] tuple form.

 DELETE relation/$textid/$sectid/relationships { request }

Accepts a form data post with a source_id and a target_id to indicate the
relationship to delete. On success, returns a JSON list of relationships that
should be removed in [source_id, target_id] tuple form.

=cut

sub relationships :Chained('section') :PathPart :Args(0) {
    my( $self, $c ) = @_;
    my $textid = $c->stash->{textid};
    my $sectid = $c->stash->{sectid};
    my $m = $c->model('Directory');
    if( $c->request->method eq 'GET' ) {
        try {
            $c->stash->{'result'} =
                $m->ajax('get', "/tradition/$textid/section/$sectid/relations");
        } catch (stemmaweb::Error $e ) {
                return json_error( $c, $e->status, $e->message );
        }
    } else {
        # Check write permissions first of all
        if( $c->stash->{permission} ne 'full' ) {
            json_error( $c, 403,
                'You do not have permission to modify this tradition.' );
        } elsif( $c->request->method eq 'POST' ) {
            my $opts = $c->request->params;

            # TODO validate relationship type
            # Keep the data clean
            my @booleans = qw/ a_derivable_from_b b_derivable_from_a non_independent /;
            foreach my $k ( keys %$opts ) {
                if( $opts->{$k} && grep { $_ eq $k } @booleans ) {
                    $opts->{$k} = $k eq 'false' ? JSON::false : JSON::true;
                }
            }

            delete $opts->{scope} unless $opts->{scope};
            delete $opts->{annotation} unless $opts->{annotation};
            delete $opts->{is_significant} unless $opts->{is_significant};
            # $opts->{propagate} = 1;

            my $result;
            try {
                $result = $m->ajax('post',
                    "/tradition/$textid/relation",
                    'Content-Type' => 'application/json',
                    'Content' => encode_json( $opts ));
            } catch (stemmaweb::Error $e ) {
                return json_error( $c, $e->status, $e->message );
            }

            # TODO should any propagation be done?
            # TODO should any normal forms be propagated?
            # Massage the server result into what the JS expects
            my @relpairs = map { [$_->{source}, $_->{target}, $_->{type}] } @{$result->{relations}};
            $c->stash->{result} = { relationships => \@relpairs, readings => $result->{readings}};

        } elsif( $c->request->method eq 'DELETE' ) {
            # We can delete either by specifying the relationship or by
            # specifying a reading, and deleting all relationships of that
            # reading.
            my $rdg_id = $c->request->param('from_reading');
            if( $rdg_id ) {
                try {
                    my $deleted = $m->ajax('delete', "/reading/$rdg_id/relations");
                    my @relpairs = map { [$_->{source}, $_->{target}, $_->{type}] } @$deleted;
                    $c->stash->{result} = { relationships => \@relpairs };
                } catch (stemmaweb::Error $e ) {
                    return json_error( $c, $e->status, $e->message );
                }
            } else {
                my $scopewide = $c->request->param('scopewide')
                    && $c->request->param('scopewide') eq 'true';
                my $opts = {
                    source => $c->request->param('source_id'),
                    target => $c->request->param('target_id'),
                    scope => $scopewide ? 'document' : 'local'
                };
                my $result;
                try {
                    $result = $m->ajax( 'delete',
                        "/tradition/$textid/relation",
                        'Content-Type' => 'application/json',
                        'Content' => encode_json( $opts ) );
                } catch (stemmaweb::Error $e ) {
                    return json_error( $c, $e->status, $e->message );
                }
                my @relpairs = map { [$_->{source}, $_->{target}, $_->{type}] } @$result;
                $c->stash->{result} = { relationships => \@relpairs };
            }
        } else {
            json_error( $c, 405, "You can GET, POST, or DELETE");
        }
    }
    $c->forward('View::JSON');
}

=head2 readings

 GET relation/$textid/readings

Returns a JSON dictionary, keyed on the SVG node ID of the reading, of all readings
defined for this section along with their metadata. A typical object in this dictionary
will look like:

  "n1051" => {"id":"1051",
   "witnesses":["Gr314","Kf133","Mu11475","Kr299","MuU151","Er16","Ba96","Wi3818","Mu28315"],
   "lexemes":[],
   "text":"dicens.",
   "is_meta":null,
   "variants":[]}

=cut

my %read_write_keys = (
    'id' => 0,
    'text' => 0,
    'rank' => 0,
    'is_meta' => 0,
    'grammar_invalid' => 1,
    'is_lemma' => 1,
    'is_nonsense' => 1,
    'lexemes' => 1,
    'normal_form' => 1,
    'join_prior' => 0,
    'join_next' => 0,
    'annotation' => 1,
    'witnesses' => 0
);

sub _lemma_change {
    my( $reading, $changed ) = @_;
    # No other reading at this rank should be a lemma now.
}

sub _normal_form_change {
    my( $reading, $changed ) = @_;
    # All spelling- or orthographic-related readings should have the same normal form.
    # TODO generalise this somehow
}

my %has_side_effect = (
    'is_lemma' => \&_lemma_change,
    'normal_form' => \&_normal_form_change,
);


# Return a JSONable struct of the useful keys.  Keys meant to be writable
# have a true value; read-only keys have a false value. If the SVG ID for
# the reading differs from the database ID, an additional key 'svg_id' will
# be put in the hash; this can be used or removed before return to the client.
#   { 'n123' => {id => '123', text => 'foo', is_lemma => JSON::False, ... }}
sub _reading_struct {
    my( $c, $reading ) = @_;
    my $m = $c->model('Directory');
    my $struct = {};
    map { $struct->{$_} = $reading->{$_} } keys %read_write_keys;

    # Set known IDs on start/end nodes, that match what will be in the SVG
    if ($reading->{is_start} == JSON::true) {
        $struct->{id} = '__START__';
    } elsif ($reading->{is_end} == JSON::true) {
        $struct->{id} = '__END__';
    } else {
        $struct->{svg_id} = 'n' . $reading->{id};
    }

    # Calculate is_meta
    $struct->{is_meta} = $reading->{is_start} || $reading->{is_end}
        || $reading->{is_lacuna} || $reading->{is_ph};
    # Set the normal form if necessary
    $struct->{normal_form} = $reading->{normal_form} || $reading->{text};
    # Initialise the lexemes if necessary
    $struct->{lexemes} = $reading->{lexemes} || [];
    # Now add the list data
    return $struct;
}

sub readings :Chained('section') :PathPart :Args(0) {
    my( $self, $c ) = @_;
    if( $c->request->method ne 'GET' ) {
        json_error( $c, 405, "Use GET instead");
    }
    my $textid = $c->stash->{'textid'};
    my $sectid = $c->stash->{'sectid'};
    my $m = $c->model('Directory');
    my $rdglist;
    try {
        $rdglist = $m->ajax('get', "/tradition/$textid/section/$sectid/readings");
    } catch (stemmaweb::Error $e ) {
            return json_error( $c, $e->status, $e->message );
    }
    # Get the extra information we need
    my $ret = {};
    foreach my $rdg (@$rdglist) {
        my $struct = _reading_struct( $c, $rdg );
        # The struct we return needs to be keyed on SVG node ID.
        my $nid = delete $struct->{svg_id};
        $ret->{$nid ? $nid : $struct->{id}} = $struct;
    }
    $c->stash->{result} = $ret;
    $c->forward('View::JSON');
}

=head2 reading

 GET relation/$textid/reading/$id

Returns a JSON object describing the reading identified by $id.

 POST relation/$textid/reading/$id { request }

Accepts form data containing the following fields:

  - id (required)
  - is_lemma (checked or not)
  - grammar_invalid (checked or not)
  - is_nonsense (checked or not)
  - normal_form (text)

and updates the reading attributes as indicated.

=cut

sub reading :Chained('section') :PathPart :Args(1) {
    my( $self, $c, $reading_id ) = @_;
    my $m = $c->model('Directory');
    my $orig_reading;
    try {
        $orig_reading = $m->ajax('get', "/reading/$reading_id");
    } catch (stemmaweb::Error $e ) {
        return json_error( $c, $e->status, $e->message );
    }
    if( $c->request->method eq 'GET' ) {
        my $result = _reading_struct($c, $orig_reading);
        delete $result->{svg_id};
        $c->stash->{'result'} = $result;
    } elsif ( $c->request->method eq 'POST' ) {
        # Auth check
        if( $c->stash->{'permission'} ne 'full' ) {
            json_error( $c, 403,
                'You do not have permission to modify this tradition.' );
        }
        # Assemble the properties, being careful of data types
        my @booleans = qw/ is_lemma is_nonsense grammar_invalid /;
        my $changed_props = [];
        foreach my $k ( keys %{$c->request->params} ) {
            # Be careful of data types!
            my $prop = $c->request->param($k);
            if ($prop && grep { $_ eq $k } @booleans) {
                $prop = $prop eq 'false' ? JSON::false : JSON::true;
            }
            push( @$changed_props,
                { key => $k, property => $prop } )
                if $read_write_keys{$k};
        }

        # Change the reading
        my $reading;
        try {
            $reading = $m->ajax('put', "/reading/$reading_id",
                'Content-Type' => 'application/json',
                'Content' => encode_json( { properties => $changed_props } ) );
        } catch (stemmaweb::Error $e ) {
            return json_error( $c, $e->status, $e->message );
        }

        my $changed = { $reading->{id} => $reading };
        # Check for side effects from the changes
        foreach my $k (keys %has_side_effect) {
            next unless exists $reading->{$k};
            if( !defined($orig_reading->{$k}) || $reading->{$k} ne $orig_reading->{$k} ) {
                my $handler = $has_side_effect{$k};
                $handler->($reading, $changed);
            }
        }
        $c->stash->{result} = { readings => [ values( %$changed ) ] };
    } else {
        json_error( $c, 405, "You can GET or POST");
    }
    $c->forward('View::JSON');
}

=head2 compress

 POST relation/$textid/compress { data }

Accepts form data containing a list of 'readings[]'.
Concatenates the requested readings into a single reading, All sequence
relationships between the affected readings must be removed in visual display;
this is the responsibility of the client.
On success returns a JSON object that looks like this:

  {"nodes":["n158","n159","n160","n161","n162","n163"],
   "success":1}

=cut

sub compress :Chained('section') :PathPart :Args(0) {
    my( $self, $c ) = @_;
    my $m = $c->model('Directory');
    if( $c->request->method eq 'POST' ) {
        # Auth check
        if( $c->stash->{'permission'} ne 'full' ) {
            json_error( $c, 403,
                'You do not have permission to modify this tradition.' );
        }

        my @rids = $c->request->param('readings[]');
        my $first = shift @rids;

        my @nodes = ( $first );
        my $result = { success => 1 };
        try {
            while( scalar @rids ) {
                my $rid = shift @rids;
                $m->ajax('post', "/reading/$first/concatenate/$rid",
                    'Content-Type' => 'application/json',
                    'Content' => encode_json( {character => " "} ));
                push( @nodes, $rid );
            }
        } catch (stemmaweb::Error $e ) {
            # If we have merged anything we should say so in the
            # response, but note a warning too.
            return json_error( $c, $e->status, $e->message )
                if scalar(@nodes) == 1;
            $result->{success} = 0;
            $result->{warning} = $e->message;
        }
        $result->{nodes} = \@nodes;

        # Return what we have.
        $c->stash->{result} = $result;
        $c->forward('View::JSON');
    } else {
        json_error( $c, 405, "Use POST instead");
    }
}

=head2 merge

 POST relation/$textid/merge { data }

Accepts form data identical to the ../relationships POST call, with one extra
Boolean parameter 'single'.
Merges the requested readings, combining the witnesses of both readings into
the target reading. All relationships of the source reading will be transferred
to the target reading; visualising this is the responsibility of the client. On
success returns a JSON object that looks like this:

  {"status":"ok",
   "checkalign":[["n135","n130"],
                 ["n133","n127"],
                 ["n126","n132"]]}

The "checkalign" key will only be included if 'single' does not have a true
value. It contains a list of tuples indicating readings that seem to be identical,
and that the user may want to merge in addition.

=cut

sub merge :Chained('section') :PathPart :Args(0) {
    my( $self, $c ) = @_;
    my $m = $c->model('Directory');
    my $textid = $c->stash->{textid};
    my $sectid = $c->stash->{sectid};
    if( $c->request->method eq 'POST' ) {
        # Auth check
        if( $c->stash->{'permission'} ne 'full' ) {
            json_error( $c, 403,
                'You do not have permission to modify this tradition.' );
        }

        my $main = $c->request->param('target');
        my $second = $c->request->param('source');
        my $extent;
        my $rdg_rank;
        try {
            ## Figure out the range of ranks we are dealing with
            my $main_info = $m->ajax('get', "/reading/$main");
            my $second_info = $m->ajax('get', "/reading/$second");
            my @ordered = sort { $a->{rank} <=> $b->{rank} } ($main_info, $second_info);
            $rdg_rank = $ordered[0]->{rank};
            $extent = $rdg_rank + (2 * ($ordered[1]->{rank} - $rdg_rank));
            if ($extent > $c->stash->{section}->{'endRank'}) {
                $extent = $c->stash->{section}->{'endRank'};
            }
            ## Do the merge
            $m->ajax('post', "/reading/$main/merge/$second");
        } catch (stemmaweb::Error $e) {
            return json_error( $c, $e->status, $e->message );
        }

        my $response = { status => 'ok' };

        # Now look for any mergeable readings on the tradition.
        unless( $c->request->param('single') ) {
            my $mergeable;
            try {
                $mergeable = $m->ajax('get', "/tradition/$textid/section/$sectid/mergeablereadings/$rdg_rank/$extent");
            } catch (stemmaweb::Error $e ) {
                $response->{status} = 'warn';
                $response->{warning} = 'Could not check for mergeable readings: ' . $e->message;
            }

            # Look for readings that are now identical.
            if( @$mergeable ) {
                my @pairs = map { [$_->[0]->{id}, $_->[1]->{id}] } @$mergeable;
                $response->{checkalign} = \@pairs;
            }
        }
        $c->stash->{'result'} = $response;
        $c->forward('View::JSON');
    } else {
        json_error( $c, 405, "Use POST instead");
    }
}

=head2 duplicate

 POST relation/$textid/duplicate { data }

Accepts form data with a list of 'readings[]' and a list of 'witnesses[]'.
Duplicates the requested readings, detaching the witnesses specified in
the list to use the new reading(s) instead of the old. Returns a JSON object
that contains a key for each new reading thus created (which is its SVG ID),
as well as a key 'DELETED' that contains a list of tuples indicating the
relationships that should be removed from the graph. For example:

  {"DELETED":[["135","130","transposition"]],
   "n476":{"id":"476",
          "variants":[],
          "orig_rdg":"130",
          "is_meta":null,
          "lexemes":[],
          "witnesses":["Ba96"],
          "text":"et "}}


=cut

sub duplicate :Chained('section') :PathPart :Args(0) {
    my( $self, $c ) = @_;
    my $m = $c->model('Directory');
    my $textid = $c->stash->{textid};
    if( $c->request->method eq 'POST' ) {
        # Auth check
        if( $c->stash->{'permission'} ne 'full' ) {
            json_error( $c, 403,
                'You do not have permission to modify this tradition.' );
        }

        # Sort out which readings need to be duplicated from the set given, and
        # ensure that all the given wits bear each relevant reading.
        my @readings;
        foreach my $rid ($c->request->param('readings[]')) {
            try {
                my $rdginfo = $m->ajax('get', "/reading/$rid");
                push( @readings, $rdginfo );
            } catch (stemmaweb::Error $e ) {
                return json_error( $c, $e->status, $e->message );
            }
        }

        my %wits = ();
        map { $wits{$_} = 1 } $c->request->param('witnesses[]');
        my %rdgranks = ();
        foreach my $rdg ( @readings ) {
            my $rid = $rdg->{id};
            my $numwits = 0;
            foreach my $rwit ( @{$rdg->{witnesses}} ) {
                $numwits++ if exists $wits{$rwit};
            }
            next unless $numwits; # Disregard readings with none of our witnesses
            if( $numwits < keys( %wits ) ) {
                # TODO decide if this should really be an error
                json_error( $c, 400, "Reading $rid contains some but not all of the specified witnesses." );
            } elsif( exists $rdgranks{ $rdg->{rank} } ) {
                json_error( $c, 400, "More than one reading would be detached along with $rid at rank " . $rdg->{rank} );
            } else {
                $rdgranks{ $rdg->{rank} } = $rid;
            }
        }

        # Now check that the readings make a single sequence.
        my $prior;
        foreach my $rank ( sort { $a <=> $b } keys %rdgranks ) {
            my $rid = $rdgranks{$rank};
            if( $prior ) {
                # Check that there is only one path between $prior and $rdg.
                foreach my $wit ( keys %wits ) {
                    my $prdg;
                    try {
                        $prdg = $m->ajax('get', "/reading/$rid/prior/$wit");
                    } catch (stemmaweb::Error $e) {
                        json_error( $c, $e->status, $e->message );
                    }
                    json_error( $c, 400, "Diverging witness paths from $prior to $rid at $wit")
                        unless $prdg->{id} eq $prior;
                }
            }
            $prior = $rid;
        }

        # If we got this far, do the deed.
        my $url = sprintf("/reading/%s/duplicate", $readings[0]->{id});
        my $req = {
            readings => [ values %rdgranks ],
            witnesses => [ keys %wits ]
        };
        my $response;
        try {
            $response = $m->ajax('post', $url,
                'Content-Type' => 'application/json',
                'Content' => encode_json($req));
        } catch (stemmaweb::Error $e) {
            json_error( $c, $e->status, $e->message );
        }

        # Massage the response into the expected form. For this response
        # we use database IDs, for consistency.
        my @deleted_rels = map { [$_->{source}, $_->{target}, $_->{type}] } @{$response->{relations}};
        $c->stash->{result} = {DELETED => \@deleted_rels};
        foreach my $r (@{$response->{readings}}) {
            my $rinfo = _reading_struct($c, $r);
            my $nid = delete $rinfo->{svg_id};
            # Add in the orig_reading information that was passed back
            $rinfo->{orig_reading} = $r->{orig_reading};
            $c->stash->{result}->{$nid} = $rinfo;
        }
    } else {
        json_error( $c, 405, "Use POST instead");
    }
    $c->forward('View::JSON');
}

# TODO implement reading split in the UI

=head2 split

 POST relation/$textid/split { data }

Accepts form data with a reading ID, its text (for sanity checking; this should
be a hidden field on the web form), a character index at which to split the
text of the given reading, and (if the character index is zero) a regex on
which to split the text.
Splits the requested reading into multiple sequential ones. All relationships
on the reading must be removed first.
Returns a JSON structure of new or modified readings or relationships, whose
structure should be reflected in the updated visual display of the client.

  {"relationships":[{"source":"n131","target":"n131_0","id":"51", ...},
                    {"source":"n131_0","target":"n135","id":"52", ...}],
   "n131":{"id":"n131",
             "variants":[],
             "is_meta":null,
             "lexemes":[],
             "witnesses":["Ba96"],
             "text":"et",
             ...},
   "n131_0":{"id":"n131_0",
             "variants":[],
             "orig_rdg":"n131",
             "is_meta":null,
             "lexemes":[],
             "witnesses":["Ba96"],
             "text":"cetera",
             ...}}


=cut

sub split :Chained('section') :PathPart :Args(0) {
    my( $self, $c ) = @_;
    my $m = $c->model('Directory');
    my $textid = $c->stash->{textid};
    if( $c->request->method eq 'POST' ) {
        # Auth check
        if( $c->stash->{'permission'} ne 'full' ) {
            json_error( $c, 403,
                'You do not have permission to modify this tradition.' );
        }

        # Get and check the parameters
        my $rid = $c->request->param('reading');
        my $rtext = $c->request->param('rtext');
        my $index = $c->request->param('index') || 0;
        my $regex = $c->request->param('regex') || '\\s+';
        my $separate = $c->request->param('separate');

        # If index is nonzero, we ignore regex and split at the index location.
        my $model = {character => '',
            separate => json_bool($separate),
            isRegex => JSON::false};

        # If index is zero, we need to check that the match is zero-length,
        # i.e. that we will have the same string when we put the split pieces
        # back together. Our defaults are to split on whitespace.
        if ($index == 0) {
            my @test = split($regex, $rtext);
            my $joinchar = $separate ? ' ' : '';
            if (join($joinchar, @test) ne $rtext) {
                json_error( $c, 400,
                    'The specified regular expression must be zero-length');
            }
            $model->{character} = $regex;
            $model->{isRegex} = JSON::true;
        }
        # Do the deed
        my $url = "/reading/$rid/split/$index";
        my $response;
        try {
            $response = $m->ajax('post', $url,
                'Content-Type' => 'application/json',
                'Content' => encode_json($model));
        } catch (stemmaweb::Error $e) {
            json_error( $c, $e->status, $e->message );
        }

        # Fill out the readings and return the result. This response
        # uses database IDs.
        $c->stash->{result}->{relationships} = $response->{relations};
        foreach my $r (@{$response->{readings}}) {
            my $rinfo = _reading_struct($c, $r);
            delete $rinfo->{svg_id};
            # Add in the orig_reading information that was passed back
            $rinfo->{orig_reading} = $r->{orig_reading};
            $c->stash->{result}->{$r->{id}} = $rinfo;
        }

    } else {
        json_error( $c, 405, "Use POST instead");
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
