package stemmaweb::Controller::Relation;
use JSON qw/ to_json from_json /;
use Moose;
use Moose::Util::TypeConstraints qw/ find_type_constraint /;
use Module::Load;
use namespace::autoclean;
use stemmaweb::Util qw/ load_tradition json_error generate_svg /;
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
	my ($textinfo, $ok) = load_tradition( $c, $textid );
	
	$c->stash->{'textid'} = $textid;
	$c->stash->{'tradition'} = $textinfo;
	$c->stash->{'permission'} = $ok;
}

# ...and here is the page variable initialization.
sub main :Chained('text') :PathPart('') :Args(0) {
	my( $self, $c ) = @_;
	my $m = $c->model('Directory');
	my $tradition = delete $c->stash->{'tradition'};

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
	
	# Get the list of segments that this text contains.
	# TODO give a box here to rename individual sections.
	my $sections = $m->ajax('get', sprintf('/tradition/%s/sections', $tradition->{'id'})); 
	$c->stash->{'textsegments'} = [];
	foreach my $s ( @$sections ) {
		my $seg = { 'start' => $s->{id}, 'display' => $s->{name} };
		push( @{$c->stash->{'textsegments'}}, $seg );
	}
	my $startseg = $c->req->param('start') || $sections->[0]->{id};

	# Spit out the SVG
	
	$c->stash->{'startseg'} = $startseg if defined $startseg;
	$c->stash->{'svg_string'} = generate_svg( $c, $tradition->{id})
	$c->stash->{'text_title'} = $tradition->{name};
	$c->stash->{'text_lang'} = $tradition->{language} || 'Default';
	$c->stash->{'can_morphologize'} = $tradition->{language} ne 'Default';
	$c->stash->{'template'} = 'relate.tt';
}

=head2 help

 GET relation/help/$language

Returns the help window HTML.

=cut

sub help :Local :Args(1) {
	my( $self, $c, $lang ) = @_;
	# Display the morphological help for the language if it is defined.
	if( $lang && $lang ne 'Default' ) {
		my $mod = 'Text::Tradition::Language::' . $lang;
		try {
			load( $mod );
		} catch {
			$c->log->debug("Warning: could not load $mod");
		}
		my $has_mod = $mod->can('morphology_tags');
		if( $has_mod ) {
			my $tagset = &$has_mod;
			$c->stash->{'tagset'} = $tagset;
		}
	}
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

 POST relation/$textid/relationships { request }
 
Accepts a form data post with keys as above, and attempts to create the requested 
relationship. On success, returns a JSON list of relationships that should be 
created in [source_id, target_id, type] tuple form.

 DELETE relation/$textid/relationships { request }
 
Accepts a form data post with a source_id and a target_id to indicate the 
relationship to delete. On success, returns a JSON list of relationships that 
should be removed in [source_id, target_id] tuple form.

=cut

sub relationships :Chained('text') :PathPart :Args(0) {
	my( $self, $c ) = @_;
	my $tradition = delete $c->stash->{'tradition'};
	my $ok = _check_permission( $c, $tradition );
	return unless $ok;
	my $collation = $tradition->collation;
	my $m = $c->model('Directory');
	if( $c->request->method eq 'GET' ) {
		my @pairs = $collation->relationships; # returns the edges
		my @all_relations;
		foreach my $p ( @pairs ) {
			my $relobj = $collation->relations->get_relationship( @$p );
			next if $relobj->type eq 'collated'; # Don't show these
			next if $p->[0] eq $p->[1]; # HACK until bugfix
			my $relhash = { source_id => $p->[0], target_id => $p->[1], 
				  source_text => $collation->reading( $p->[0] )->text,
				  target_text => $collation->reading( $p->[1] )->text,
				  type => $relobj->type, scope => $relobj->scope,
				  a_derivable_from_b => $relobj->a_derivable_from_b,
				  b_derivable_from_a => $relobj->b_derivable_from_a,
				  non_independent => $relobj->non_independent,
				  is_significant => $relobj->is_significant
				  };
			$relhash->{'note'} = $relobj->annotation if $relobj->has_annotation;
			push( @all_relations, $relhash );
		}
		$c->stash->{'result'} = \@all_relations;
	} else {
		# Check write permissions first of all
		if( $c->stash->{'permission'} ne 'full' ) {
			$c->response->status( '403' );
			$c->stash->{'result'} = { 
				'error' => 'You do not have permission to modify this tradition.' };
			$c->detach( 'View::JSON' );
		} elsif( $c->request->method eq 'POST' ) {
			my $opts = $c->request->params; 
			
			# Retrieve the source / target from the options
			my $node = delete $opts->{source_id};
			my $target = delete $opts->{target_id};
			
			# Make sure we didn't send a blank or invalid relationship type
			my $relation = $opts->{type};
			unless( $collation->get_relationship_type( $relation ) ) {
				my $errmsg = $relation ? "No such relationship type $relation" :
					"You must specify a relationship type";
				$c->stash->{'result'} = { error => $errmsg };
				$c->response->status( '400' );
				$c->detach( 'View::JSON' );
			}
			
			# Keep the data clean
			my @booleans = qw/ a_derivable_from_b b_derivable_from_a non_independent /;
			foreach my $k ( keys %$opts ) {
				if( $opts->{$k} && grep { $_ eq $k } @booleans ) {
					$opts->{$k} = 1;
				}
			}
		
			delete $opts->{scope} unless $opts->{scope};
			delete $opts->{annotation} unless $opts->{annotation};
			delete $opts->{is_significant} unless $opts->{is_significant};
			$opts->{propagate} = 1;
			
			try {
				my @changed_readings = ();
				my @vectors = $collation->add_relationship( 
					$node, $target, $opts, \@changed_readings );
				$c->stash->{'result'} = {
					relationships => \@vectors,
					readings => [ map { _reading_struct( $_ ) } @changed_readings ],
				};
				$m->save( $tradition );
			} catch( Text::Tradition::Error $e ) {
				$c->response->status( '403' );
				$c->stash->{'result'} = { error => $e->message };
			} catch {
				$c->response->status( '500' );
				$c->stash->{'result'} = { error => "Something went wrong with the request" };
			}
		} elsif( $c->request->method eq 'DELETE' ) {
			# We can delete either by specifying the relationship or by
			# specifying a reading, and deleting all relationships of that
			# reading.
			my( @pairs, $scopewide );
			my $rdg_id = $c->request->param('from_reading');
			if( $rdg_id ) {
				my $rdg = $collation->reading( $rdg_id );
				foreach my $target ( $rdg->related_readings() ) {
					push( @pairs, [ $rdg, $target ] );
				}
			} else {
				my $node = $c->request->param('source_id');
				my $target = $c->request->param('target_id');
				push( @pairs, [ $node, $target ] );
			}
			$scopewide = $c->request->param('scopewide') 
				&& $c->request->param('scopewide') eq 'true';
			my @vectors;
			foreach my $pair ( @pairs ) {
				my( $node, $target ) = @$pair;
				try {
					push( @vectors, $collation->del_relationship( $node, $target, $scopewide ) );
				} catch( Text::Tradition::Error $e ) {
					$c->response->status( 403 );
					$c->stash->{'result'} = { 'error' => $e->message };
				} catch {
					$c->response->status( 500 );
					$c->stash->{'result'} = { error => "Something went wrong with the request" };
				}
			}
			unless( $c->response->status > 400 ) {
				# If we haven't trapped an error, save the tradition and 
				# stash the result.
				$m->save( $tradition );
				$c->stash->{'result'} = { relationships => \@vectors };
			}
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
	'is_lemma' => 'make_lemma',
	'is_nonsense' => 1,
	'normal_form' => 1,
);

my %has_side_effect = (
	'make_lemma' => 1,
	'normal_form' => 1,
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
	my $tradition = delete $c->stash->{'tradition'};
	my $ok = _check_permission( $c, $tradition );
	return unless $ok;
	my $collation = $tradition->collation;
	my $m = $c->model('Directory');
	if( $c->request->method eq 'GET' ) {
		my $rdginfo = {};
		foreach my $rdg ( $collation->readings ) {
			$rdginfo->{$rdg->id} = _reading_struct( $rdg );
		}
		$c->stash->{'result'} = $rdginfo;
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
	my $tradition = delete $c->stash->{'tradition'};
	my $collation = $tradition->collation;
	my $rdg = $collation->reading( $reading_id );
	
	# Check that the reading exists
	unless( $rdg ) {
		$c->response->status('404');
		$c->stash->{'result'} = { 'error' => 'No reading with ID ' . $reading_id };
		$c->detach('View::JSON');
		return;
	}
		
	my $m = $c->model('Directory');
	if( $c->request->method eq 'GET' ) {
		$c->stash->{'result'} = _reading_struct( $rdg );
		
	# Do an auth check and edit the reading
	} elsif ( $c->request->method eq 'POST' ) {
		if( $c->stash->{'permission'} ne 'full' ) {
			$c->response->status( '403' );
			$c->stash->{'result'} = { 
				'error' => 'You do not have permission to modify this tradition.' };
			$c->detach('View::JSON');
			return;
		}
		my $errmsg;
		my %changed_readings = ( $rdg->id => $rdg );
		my $can_morphologize = $rdg->does('Text::Tradition::Morphology');
		
		# Set all the values that we have for the reading.
		foreach my $p ( keys %{$c->request->params} ) {
			if( $p =~ /^morphology_(\d+)$/ && $can_morphologize ) {
				# Set the form on the correct lexeme. Ignore these keys
				# if we don't have the Morphology module installed.
				my $morphval = $c->request->param( $p );
				next unless $morphval;
				my $midx = $1;
				my $lx = $rdg->lexeme( $midx );
				my $strrep = $rdg->language . ' // ' . $morphval;
				my $idx = $lx->has_form( $strrep );
				unless( defined $idx ) {
					# Make the word form and add it to the lexeme.
					try {
						$idx = $lx->add_matching_form( $strrep ) - 1;
					} catch( Text::Tradition::Error $e ) {
						$c->response->status( '403' );
						$errmsg = $e->message;
					} catch {
						# Something else went wrong, probably a Moose error
						$c->response->status( '500' );
						$errmsg = 'Something went wrong with the request';	
					}
				}
				$lx->disambiguate( $idx ) if defined $idx;
			} elsif( $read_write_keys{$p} ) {
				my $meth = $read_write_keys{$p} eq '1' 
					? $p : $read_write_keys{$p};
				my $val = _clean_booleans( $rdg, $p, $c->request->param( $p ) );
				my @altered;
				try {
					if( $has_side_effect{$meth} ) {
						@altered = $rdg->$meth( $val );
					} else {
						$rdg->$meth( $val );
					}
				} catch( my $e ) {
					$errmsg = $e->message;
				}
				if( @altered ) {
					map { $changed_readings{$_->id} = $_ } @altered;
				}
			}
		}
		# Re-lemmatize if we have been asked to, and are able
		if( $c->request->param('relemmatize') ) {
			if( $can_morphologize ) {
				my $nf = $c->request->param('normal_form');
				if( $nf && $nf ne $rdg->normal_form ) {
					my @altered = $rdg->normal_form( $nf );
					map { $changed_readings{$_->id} = $_ } @altered;
					# TODO throw error if lemmatization fails
					$rdg->lemmatize();
				}
			} else {
				$errmsg = "Morphology package not installed";
				$c->response->status('500');
			}
		} 
		
		# Assemble our return value and save the tradition if no error has occurred.
		if( $errmsg ) {
			$c->stash->{'result'} = { 'error' => $errmsg };
		} else {
			$m->save( $tradition );
			$c->stash->{'result'} = {
				readings => [ map { _reading_struct( $_ ) } 
								values( %changed_readings ) ]
			};
		}
	}
	$c->forward('View::JSON');

}

=head2 compress

 POST relation/$textid/compress { data }
 
Accepts form data containing a list of 'readings[]'.
Concatenates the requested readings into a single reading, All relationships of 
the affected readings must be removed; this is the responsibility of the client. 
On success returns a JSON object that looks like this:

  {"nodes":["n158","n159","n160","n161","n162","n163"],
   "success":1}

=cut

sub compress :Chained('text') :PathPart :Args(0) {
	my( $self, $c ) = @_;
	my $tradition = delete $c->stash->{'tradition'};
	my $collation = $tradition->collation;
	my $m = $c->model('Directory');

	my @rids = $c->request->param('readings[]');
	my @readings;

	foreach my $rid (@rids) {
		my $rdg = $collation->reading( $rid );

		push @readings, $rdg;
	}

	my $len = scalar @readings;

	if( $c->request->method eq 'POST' ) {
		if( $c->stash->{'permission'} ne 'full' ) {
			$c->response->status( '403' );
			$c->stash->{'result'} = { 
				'error' => 'You do not have permission to modify this tradition.' };
			$c->detach('View::JSON');
			return;
		}

		# Sanity check: first save the original text of each witness.
		my %origtext;
		foreach my $wit ( $tradition->witnesses ) {
			$origtext{$wit->sigil} = $collation->path_text( $wit->sigil );
			if( $wit->is_layered ) {
				my $acsig = $wit->sigil . $collation->ac_label;
				$origtext{$acsig} = $collation->path_text( $acsig );
			}
		}

		my $first = 0;

		for (my $i = 0; $i < $len; $i++) {
			my $rdg = $readings[$i];

			if ($rdg->is_combinable) {
				$first = $i;
				last;
			}
		}

		my @nodes;
		push @nodes, "$readings[$first]";

		for (my $i = $first+1; $i < $len; $i++) {
			my $rdg = $readings[$first];
			my $next = $readings[$i];

			last unless $next->is_combinable;
			push @nodes, "$next";

			try {
				$collation->merge_readings( "$rdg", "$next", 1 );
			} catch ($e) {
				$c->stash->{result} = {
					error_msg => $e->message,
				};

				$c->detach('View::JSON');
			}
		}
		
		try {
			# Finally, make sure we haven't screwed anything up.
			foreach my $wit ( $tradition->witnesses ) {
				my $pathtext = $collation->path_text( $wit->sigil );
				Text::Tradition::Error->throw_collation_error( "Text differs for witness " . $wit->sigil )
					unless $pathtext eq $origtext{$wit->sigil};
				if( $wit->is_layered ) {
					my $acsig = $wit->sigil . $collation->ac_label;
					$pathtext = $collation->path_text( $acsig );
					Text::Tradition::Error->throw_collation_error( "Layered text differs for witness " . $wit->sigil )
						unless $pathtext eq $origtext{$acsig};
				}
			}
		} catch (Text::Tradition::Error $e) {
			$c->stash->{result} = {
				error_msg => $e->message,
			};

			$c->detach('View::JSON');
		}


		$collation->relations->rebuild_equivalence();
		$collation->calculate_ranks();

		$m->save($collation);

		$c->stash->{'result'} = {
			success => 1,
			nodes   => \@nodes,
		};

		$c->forward('View::JSON');
	}
}

=head2 merge

 POST relation/$textid/merge { data }
 
Accepts form data identical to the ../relationships POST call, with one extra
Boolean parameter 'single'.
Merges the requested readings, combining the witnesses of both readings into
the target reading. All relationships of the source reading must be transferred
to the target reading; this is the responsibility of the client. On success
returns a JSON object that looks like this:

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
	my $tradition = delete $c->stash->{'tradition'};
	my $collation = $tradition->collation;
	my $m = $c->model('Directory');
	if( $c->request->method eq 'POST' ) {
		if( $c->stash->{'permission'} ne 'full' ) {
			$c->response->status( '403' );
			$c->stash->{'result'} = { 
				'error' => 'You do not have permission to modify this tradition.' };
			$c->detach('View::JSON');
			return;
		}
		my $errmsg;
		my $response;
		
		my $main = $c->request->param('target_id');
		my $second = $c->request->param('source_id');
		# Find the common successor of these, so that we can detect other
		# potentially identical readings.
		my $csucc = $collation->common_successor( $main, $second );

		# Try the merge if these are parallel readings.
		if( $csucc->id eq $main || $csucc->id eq $second ) {
			$errmsg = "Cannot merge readings in the same path";
		} else {
			try {
				$collation->merge_readings( $main, $second );
			} catch( Text::Tradition::Error $e ) {
				$c->response->status( '403' );
				$errmsg = $e->message;
			} catch {
				# Something else went wrong, probably a Moose error
				$c->response->status( '403' );
				$errmsg = 'Something went wrong with the request';	
			}
		}
		
		# Look for readings that are now identical.
		if( $errmsg ) {
			$response = { status => 'error', error => $errmsg };
		} else {
			$response = { status => 'ok' };
			unless( $c->request->param('single') ) {
				my @identical = $collation->identical_readings(
					start => $main, end => $csucc->id );
				if( @identical ) {
					$response->{'checkalign'} = [ 
						map { [ $_->[0]->id, $_->[1]->id ] } @identical ];
				}
			}
			$m->save( $collation );
		}
		$c->stash->{'result'} = $response;
		$c->forward('View::JSON');			
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
	my $tradition = delete $c->stash->{'tradition'};
	my $collation = $tradition->collation;
	my $m = $c->model('Directory');
	if( $c->request->method eq 'POST' ) {
		if( $c->stash->{'permission'} ne 'full' ) {
			$c->response->status( '403' );
			$c->stash->{'result'} = { 
				'error' => 'You do not have permission to modify this tradition.' };
			$c->detach('View::JSON');
			return;
		}
		my $errmsg;
		my $response = {};
		# Sort out which readings need to be duplicated from the set given, and
		# ensure that all the given wits bear each relevant reading.
		
		my %wits = ();
		map { $wits{$_} = 1 } $c->request->param('witnesses[]');
		my %rdgranks = ();
		foreach my $rid ( $c->request->param('readings[]') ) {
			my $numwits = 0;
			my $rdg = $collation->reading( $rid );
			foreach my $rwit ( $rdg->witnesses( $rid ) ) {
				$numwits++ if exists $wits{$rwit};
			}
			next unless $numwits; # Disregard readings with none of our witnesses
			if( $numwits < keys( %wits ) ) {
				$errmsg = "Reading $rid contains some but not all of the specified witnesses.";
				last;
			} elsif( exists $rdgranks{ $rdg->rank } ) {
				$errmsg = "More than one reading would be detached along with $rid at rank " . $rdg->rank;
				last;
			} else {
				$rdgranks{ $rdg->rank } = $rid;
			}
		}
		
		# Now check that the readings make a single sequence.
		unless( $errmsg ) {
			my $prior;
			foreach my $rank ( sort { $a <=> $b } keys %rdgranks ) {
				my $rid = $rdgranks{$rank};
				if( $prior ) {
					# Check that there is only one path between $prior and $rdg.
					foreach my $wit ( keys %wits ) {
						unless( $collation->prior_reading( $rid, $wit ) eq $prior ) {
							$errmsg = "Diverging witness paths from $prior to $rid at $wit";
							last;
						}
					}
				}
				$prior = $rid;
			}
		}
		
		# Abort if we've run into a problem.
		if( $errmsg ) {
			$c->stash->{'result'} = { 'error' => $errmsg };
			$c->response->status( '403' );
			$c->forward('View::JSON');
			return;
		}
		
		# Otherwise, do the dirty work.
		my @witlist = keys %wits;
		my @deleted_relations;
		foreach my $rank ( sort { $a <=> $b } keys %rdgranks ) {
			my $newrdg;
			my $reading_id = $rdgranks{$rank};
			my @delrels;
			try {
				( $newrdg, @delrels ) = 
					$collation->duplicate_reading( $reading_id, @witlist );
			} catch( Text::Tradition::Error $e ) {
				$c->response->status( '403' );
				$errmsg = $e->message;
			} catch {
				# Something else went wrong, probably a Moose error
				$c->response->status( '500' );
				$errmsg = 'Something went wrong with the request';	
			}
			if( $newrdg ) {
				my $data = _reading_struct( $newrdg );
				$data->{'orig_rdg'} = $reading_id;
				$response->{"$newrdg"} = $data;
				push( @deleted_relations, @delrels );
			}
		} 
		if( $errmsg ) {
			$c->stash->{'result'} = { 'error' => $errmsg };
		} else {
			$m->save( $collation );
			$response->{'DELETED'} = \@deleted_relations;
			$c->stash->{'result'} = $response;
		}
	}
	$c->forward('View::JSON');
}



sub _check_permission {
	my( $c, $tradition ) = @_;
    my $user = $c->user_exists ? $c->user->get_object : undef;
    # Does this user have access?
    if( $user ) {
   		if( $user->is_admin || 
    			( $tradition->has_user && $tradition->user->id eq $user->id ) ) {
			$c->stash->{'permission'} = 'full';
			return 1;
		}
    } 
    # Is it public?
    if( $tradition->public ) {
    	$c->stash->{'permission'} = 'readonly';
    	return 1;
    } 
	# Forbidden!
	$c->response->status( 403 );
	$c->response->body( 'You do not have permission to view this tradition.' );
	$c->detach( 'View::Plain' );
	return 0;
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
