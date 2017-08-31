package stemmaweb::Controller::Relation;
use JSON qw/ to_json from_json /;
use Moose;
use Moose::Util::TypeConstraints qw/ find_type_constraint /;
use Module::Load;
use namespace::autoclean;
use stemmaweb::Controller::Util qw/ load_tradition json_error generate_svg /;
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

# Here is the template...
sub index :Path :Args(0) {
	my( $self, $c ) = @_;
	$c->stash->{'template'} = 'relate.tt';
}

# ...and here is the tradition lookup and ACL check...
sub text :Chained('/') :PathPart('relation') :CaptureArgs(1) {
	my( $self, $c, $textid ) = @_;
	my $textinfo = load_tradition( $c, $textid );
	
	$c->stash->{'textid'} = $textid;
	$c->stash->{'tradition'} = $textinfo;
}

# Redirect a request for the text itself into a request for the first section.
sub getsections :Chained('text') :PathPart('') :Args(0) {
	my( $self, $c ) = @_;
	my $textid = $c->stash->{textid};	
	# Redirect this to the first section.
	my $first = $c->stash->{tradition}->{textsections}->[0]->{id};
	$c->res->redirect($c->url_for(sprintf("/relation/%s/%s", $textid, $first)));
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
sub main :Chained('section') :Args(0) {
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
		{ 'orthographic' => 'These are the same reading, neither unusually spelled.' },
		{ 'punctuation' => 'These are the same reading apart from punctuation.' },
		{ 'spelling' => 'These are the same reading, spelled differently.' },
		{ 'grammatical' => 'These readings share a root (lemma), but have different parts of speech (morphologies).' },
		{ 'lexical' => 'These readings share a part of speech (morphology), but have different roots (lemmata).' },
		{ 'uncertain' => 'These readings are related, but a clear category cannot be assigned.' },
		{ 'other' => 'These readings are related in a way not covered by the existing types.' },
		{ 'transposition' => 'This is the same (or nearly the same) reading in a different location.' },
		{ 'repetition' => 'This is a reading that was repeated in one or more witnesses.' },
	];
	$c->stash->{'relationship_types'} = to_json( $reltypeinfo );
	
	# Spit out the SVG
	$c->stash->{'svg_string'} = generate_svg( $c ); # $c contains text & section info
	# and the rest of the bits of info we need.	
	$c->stash->{'text_title'} = $tradition->{name};
	$c->stash->{'text_lang'} = $tradition->{language} || 'Default';
	# $c->stash->{'can_morphologize'} = $tradition->{language} ne 'Default';
}

=head2 help

 GET relation/help/$language

Returns the help window HTML.

=cut

sub help :Local :Args(1) {
	my( $self, $c, $lang ) = @_;
	$c->stash->{'template'} = 'relatehelp.tt';
}

=head2 relationships

 GET relation/$textid/relationships

Returns a JSON list of relationships defined for this text. Each relationship
is an object that looks like this:

 {"target_id":"n345",
  "target_text":"scilicet ",
  "source_id":"n341",
  "source_text":"scilicet ",
  "scope":"local",
  "type":"transposition",
  "non_independent":null,
  "b_derivable_from_a":null,
  "a_derivable_from_b":null,
  "is_significant":"no"}

 POST relation/$textid/section/$sectid/relationships { request }
 
Accepts a form data post with keys as above, and attempts to create the requested 
relationship. On success, returns a JSON list of relationships that should be 
created in [source_id, target_id, type] tuple form.

 DELETE relation/$textid/section/$sectid/relationships { request }
 
Accepts a form data post with a source_id and a target_id to indicate the 
relationship to delete. On success, returns a JSON list of relationships that 
should be removed in [source_id, target_id] tuple form.

=cut

sub relationships :Chained('text') :PathPart :Args(0) {
	my( $self, $c ) = @_;
	my $textid = $c->stash->{textid};
	my $sectid = $c->stash->{sectid};
	my $m = $c->model('Directory');
	if( $c->request->method eq 'GET' ) {
# 		my @pairs = $collation->relationships; # returns the edges
# 		my @all_relations;
# 		foreach my $p ( @pairs ) {
# 			my $relobj = $collation->relations->get_relationship( @$p );
# 			next if $relobj->type eq 'collated'; # Don't show these
# 			next if $p->[0] eq $p->[1]; # HACK until bugfix
# 			my $relhash = { source_id => $p->[0], target_id => $p->[1], 
# 				  source_text => $collation->reading( $p->[0] )->text,
# 				  target_text => $collation->reading( $p->[1] )->text,
# 				  type => $relobj->type, scope => $relobj->scope,
# 				  a_derivable_from_b => $relobj->a_derivable_from_b,
# 				  b_derivable_from_a => $relobj->b_derivable_from_a,
# 				  non_independent => $relobj->non_independent,
# 				  is_significant => $relobj->is_significant
# 				  };
# 			$relhash->{'note'} = $relobj->annotation if $relobj->has_annotation;
# 			push( @all_relations, $relhash );
# 		}
		try {
			$c->stash->{'result'} = 
				$m->ajax('get', "/tradition/$textid/section/$sectid/relationships");
		} catch (stemmaweb::Error $e ) {
				return json_error( $c, $e->status, $e->message );
		}
	} else {
		# Check write permissions first of all
		if( $c->stash->{tradition}->{permission} ne 'full' ) {
			json_error( $c, 403, 
				'You do not have permission to modify this tradition.' );
		} elsif( $c->request->method eq 'POST' ) {
			my $opts = $c->request->params; 
			
			# TODO validate relationship type
			# Keep the data clean, TODO is this necessary?
			my @booleans = qw/ a_derivable_from_b b_derivable_from_a non_independent /;
			foreach my $k ( keys %$opts ) {
				if( $opts->{$k} && grep { $_ eq $k } @booleans ) {
					$opts->{$k} = JSON::true;
				}
			}
		
			delete $opts->{scope} unless $opts->{scope};
			delete $opts->{annotation} unless $opts->{annotation};
			delete $opts->{is_significant} unless $opts->{is_significant};
			# $opts->{propagate} = 1;
			
			try {
				$c->stash->{'result'} = $m->ajax('post', 
					"/tradition/$textid/section/$sectid/relation", 
					'Content-Type' => 'application/json',
					'Content' => to_json( $opts ));
			} catch (stemmaweb::Error $e ) {
				return json_error( $c, $e->status, $e->message );
			}
			
		} elsif( $c->request->method eq 'DELETE' ) {
			# We can delete either by specifying the relationship or by
			# specifying a reading, and deleting all relationships of that
			# reading.
			my $rdg_id = $c->request->param('from_reading');
			if( $rdg_id ) {
				try {
					$c->stash->{result} = $m->ajax('delete', 
						'/reading/$rdg_id/relations');
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
				try {
					$c->stash->{result} = $m->ajax( 'delete',
						"/tradition/$textid/section/$sectid/relation", 
						'Content-Type' => 'application/json',
						'Content' => to_json( $opts ) );
				} catch (stemmaweb::Error $e ) {
					return json_error( $c, $e->status, $e->message );
				}
			}
		} else {
			json_error( $c, 405, "You can GET, POST, or DELETE");			
		}
	}
	$c->forward('View::JSON');
}

=head2 readings

 GET relation/$textid/readings

Returns a JSON dictionary, keyed on reading ID, of all readings defined for this 
text along with their metadata. A typical object in this dictionary will look like:

  {"witnesses":["Gr314","Kf133","Mu11475","Kr299","MuU151","Er16","Ba96","Wi3818","Mu28315"],
   "lexemes":[],
   "text":"dicens.",
   "id":"n1051",
   "is_meta":null,
   "variants":[]}

=cut

my %read_write_keys = (
	'id' => 0,
	'text' => 0,
	'is_meta' => 0,
	'grammar_invalid' => 1,
	'is_lemma' => 1,
	'is_nonsense' => 1,
	'normal_form' => 1,
);

sub _lemma_change {
	my( $reading, $changed ) = @_;
}

sub _normal_form_change {
	my( $reading, $changed ) = @_;
}

my %has_side_effect = (
	'is_lemma' => &_lemma_change,
	'normal_form' => &_normal_form_change,
);



sub _reading_struct {
	my( $reading ) = @_;
	# Return a JSONable struct of the useful keys.  Keys meant to be writable
	# have a true value; read-only keys have a false value.
	my $struct = {};
	map { $struct->{$_} = _clean_booleans( $reading, $_, $reading->$_ )
		if $reading->can( $_ ) } keys( %read_write_keys );
	# Special case
	$struct->{'lexemes'} = $reading->can( 'lexemes' ) ? [ $reading->lexemes ] : [];
	# Look up any words related via spelling or orthography
	my $sameword = sub { 
		my $t = $_[0]->type;
		return $t eq 'spelling' || $t eq 'orthographic';
	};
	# Now add the list data
	$struct->{'variants'} = [ map { $_->text } $reading->related_readings( $sameword ) ];
	$struct->{'witnesses'} = [ $reading->witnesses ];
	return $struct;
}

sub readings :Chained('text') :PathPart :Args(0) {
	my( $self, $c ) = @_;
	if( $c->request->method ne 'GET' ) {
		json_error( $c, 405, "Use GET instead");
	}
	my $textid = $c->stash->{'textid'};
	my $sectid = $c->stash->{'sectid'};
	my $m = $c->model('Directory');
	try {
		$c->stash->{'result'} = $m->ajax('get', "/tradition/$textid/section/$sectid/readings");
	} catch (stemmaweb::Error $e ) {
			return json_error( $c, $e->status, $e->message );
	}
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

sub reading :Chained('text') :PathPart :Args(1) {
	my( $self, $c, $reading_id ) = @_;
	my $m = $c->model('Directory');
	my $orig_reading;
	try {
		$orig_reading = $m->ajax('get', '/reading/$reading_id');
	} catch (stemmaweb::Error $e ) {
		return json_error( $c, $e->status, $e->message );
	}
	if( $c->request->method eq 'GET' ) {
		$c->stash->{'result'} = $orig_reading;
	} elsif ( $c->request->method eq 'PUT' ) {
		# Auth check
		if( $c->stash->{'tradition'}->{'permission'} ne 'full' ) {
			json_error( $c, 403, 
				'You do not have permission to modify this tradition.' );
		}
				
		# Assemble the properties
		my $changed_props = [];
		foreach my $k ( keys %{$c->request->params} ) {
			# TODO careful of data types!
			push( @$changed_props, 
				{ key => $k, property => $c->request->param($k) } )
				if $read_write_keys{$k};
		}
		
		# Change the reading
		my $reading;
		try {
			$reading = { 'put', "/reading/$reading_id",
				'Content-Type' => 'application/json',
				'Content' => to_json( $changed_props ) };
		} catch (stemmaweb::Error $e ) {
			return json_error( $c, $e->status, $e->message );
		}	
		
		my $changed = { $reading->{id} => $reading };
		# Check for side effects from the changes
		foreach my $k (keys %has_side_effect) {
			if( $reading->{$k} ne $orig_reading->{$k} ) {
				my $handler = $has_side_effect{$k};
				&$handler($reading, $changed);
			}
		}
		$c->stash->{result} = [ values( %$changed ) ];
	} else {
		json_error( $c, 405, "You can GET or PUT");		
	}
	$c->forward('View::JSON');
}

=head2 compress

 POST relation/$textid/compress { data }
 
Accepts form data containing a list of 'readings[]'.
Concatenates the requested readings into a single reading, All relationships of 
the affected readings must be removed in visual display; this is the 
responsibility of the client. 
On success returns a JSON object that looks like this:

  {"nodes":["n158","n159","n160","n161","n162","n163"],
   "success":1}

=cut

sub compress :Chained('text') :PathPart :Args(0) {
	my( $self, $c ) = @_;
	my $m = $c->model('Directory');
	if( $c->request->method eq 'POST' ) {
		# Auth check
		if( $c->stash->{'tradition'}->{'permission'} ne 'full' ) {
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
				$m->ajax('get', '/reading/$first/compress/$rid/1');
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

sub merge :Chained('text') :PathPart :Args(0) {
	my( $self, $c ) = @_;
	my $m = $c->model('Directory');
	my $textid = $c->stash->{textid};
	my $sectid = $c->stash->{sectid};
	if( $c->request->method eq 'POST' ) {
		# Auth check
		if( $c->stash->{'tradition'}->{'permission'} ne 'full' ) {
			json_error( $c, 403, 
				'You do not have permission to modify this tradition.' );
		}
		
		my $errmsg;
		my $response;
		
		my $main = $c->request->param('target_id');
		my $second = $c->request->param('source_id');
		my $endrank = $c->stash->{section}->{'endRank'};
		my $rdg_rank;
		try {
			my $main_info = $m->ajax('get', "/reading/$main");
			my $second_info = $m->ajax('get', "/reading/$second");
			$rdg_rank = $main_info->{rank} > $second_info->{rank}
				? $main_info->{rank} : $second_info->{rank};
			$m->ajax("/reading/$main/merge/$second");
		} catch (stemmaweb::Error $e) {
			return json_error( $c, $e->status, $e->message );
		}
		
		my $result = { status => 'ok' };
		
		# Now look for any mergeable readings on the tradition.
		my $mergeable;
		try {
			$mergeable = $m->ajax("/tradition/$textid/section/$sectid/mergeablereadings/$rdg_rank/$endrank");
		} catch (stemmaweb::Error $e ) {
			return json_error( $c, $e->status, $e->message );
		}
		
		# Look for readings that are now identical.
		$response = { status => 'ok' };
		unless( $c->request->param('single') ) {
			if( @$mergeable ) {
				$response->{'checkalign'} = $mergeable;
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
that contains a key for each new reading thus created, as well as a key
'DELETED' that contains a list of tuples indicating the relationships that
should be removed from the graph. For example:

  {"DELETED":[["n135","n130"]],
   "n131_0":{"id":"n131_0",
             "variants":[],
             "orig_rdg":"n131",
             "is_meta":null,
             "lexemes":[],
             "witnesses":["Ba96"],
             "text":"et "}}


=cut

sub duplicate :Chained('text') :PathPart :Args(0) {
	my( $self, $c ) = @_;
	my $m = $c->model('Directory');
	my $textid = $c->stash->{textid};
	if( $c->request->method eq 'POST' ) {
		# Auth check
		if( $c->stash->{'tradition'}->{'permission'} ne 'full' ) {
			json_error( $c, 403, 
				'You do not have permission to modify this tradition.' );
		}
		
		# Sort out which readings need to be duplicated from the set given, and
		# ensure that all the given wits bear each relevant reading.
		my @readings;
		foreach my $rid ($c->request->param('readings[]')) {
			try {
				my $rdginfo = $m->ajax('get', "/reading/$rid");
				$rdginfo->{witnesses} = $m->ajax('get', "/reading/$rid/witnesses");
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
			readings => $c->request->param('readings[]'),
			witnesses => $c->request->param('witnesses[]')
		};
		my $response;
		try {
			$response = $m->ajax('post', $url, 
				'Content-Type' => 'application/json', 
				'Content' => to_json($req));
		} catch (stemmaweb::Error $e) {
			json_error( $c, $e->status, $e->message );
		}
		
		# Massage the response into the expected form.
		$c->stash->{result} = {DELETED => $response->{relationships}};
		foreach my $r (@{$response->{readings}}) {
			$c->stash->{result}->{$r->{id}} = $r;
		}
	} else {
		json_error( $c, 405, "Use POST instead");		
	}
	$c->forward('View::JSON');
}



sub _clean_booleans {
	my( $obj, $param, $val ) = @_;
	return $val unless $obj->meta->get_attribute( $param );
	if( $obj->meta->get_attribute( $param )->type_constraint->name eq 'Bool'
		&& defined( $val ) ) {
		$val = 1 if $val eq 'true';
		$val = undef if $val eq 'false' || $val eq '0';
	} 
	return $val;
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
