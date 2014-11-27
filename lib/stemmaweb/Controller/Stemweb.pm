package stemmaweb::Controller::Stemweb;
use Moose;
use namespace::autoclean;
use Encode qw/ decode_utf8 /;
use File::Which;
use JSON;
use List::Util qw/ max /;
use LWP::UserAgent;
use Safe::Isa;
use Scalar::Util qw/ looks_like_number /;
use Text::Tradition::StemmaUtil qw/ character_input phylip_pars /;
use TryCatch;
use URI;

BEGIN { extends 'Catalyst::Controller' }

has stemweb_url => (
	is => 'ro',
	isa => 'Str',
	default => 'http://slinkola.users.cs.helsinki.fi',
	);
	
has pars_path => (
	is => 'ro',
	isa => 'Str',
	);
	
has pars_pk => (
	is => 'rw',
	isa => 'Int',
	);

=head1 NAME

stemmaweb::Controller::Stemweb - Client listener for Stemweb results

=head1 DESCRIPTION

This is a client listener for the Stemweb API as implemented by the protocol defined at
L<https://docs.google.com/document/d/1aNYGAo1v1WPDZi6LXZ30FJSMJwF8RQPYbOkKqHdCZEc/pub>.

=head1 METHODS

=head2 result

 POST stemweb/result
 Content-Type: application/json
 (On success):
 { jobid: <ID number>
   status: 0
   format: <format>
   result: <data> }
 (On failure):
 { jobid: <ID number>
   status: >1
   result: <error message> }
   
Used by the Stemweb server to notify us that one or more stemma graphs
has been calculated in response to an earlier request.

=cut

sub result :Local :Args(0) {
	my( $self, $c ) = @_;
	if( $c->request->method eq 'POST' ) {
		# TODO: Verify the sender!
		my $answer;
		if( ref( $c->request->body ) eq 'File::Temp' ) {
			# Read in the file and parse that.
			$c->log->debug( "Request body is in a temp file" );
			open( POSTDATA, $c->request->body ) 
				or return _json_error( $c, 500, "Failed to open post data file" );
			binmode( POSTDATA, ':utf8' );
			# JSON should be all one line
			my $pdata = <POSTDATA>;
			chomp $pdata;
			close POSTDATA;
			try {
				$answer = from_json( $pdata );
			} catch {
				return _json_error( $c, 400, 
					"Could not parse POST request '' $pdata '' as JSON: $@" );
			}
		} else {
			$answer = from_json( $c->request->body );
		}
		$c->log->debug( "Received push notification from Stemweb: "
			. to_json( $answer ) );
		return _process_stemweb_result( $c, $answer );
	} else {
		return _json_error( $c, 403, 'Please use POST!' );
	}
}

=head2 available

 GET algorithms/available
 
Queries the Stemweb server for available stemma generation algorithms and their 
parameters. Returns the JSON answer as obtained from Stemweb.

=cut

sub available :Local :Args(0) {
	my( $self, $c ) = @_;
	my $ua = LWP::UserAgent->new();
	my $resp = $ua->get( $self->stemweb_url . '/algorithms/available' );
	my $parameters = [];
	if( $resp->is_success ) {
		$parameters = decode_json( $resp->content );
	} # otherwise we have no available algorithms.
	## Temporary HACK: run Pars too
	if( $self->_has_pars ) {
		# Use the highest passed primary key + 1
		my $parspk = max( map { $_->{pk} } 
			grep { $_->{model} eq 'algorithms.algorithm' } @$parameters ) + 1;
		# Add Pars as an algorithm
		$self->pars_pk( $parspk );
		push( @$parameters, {
			pk => $parspk,
			model => 'algorithms.algorithm',
			fields => {
				args => [],
				name => 'Pars',
				desc => 'The program "pars", from the Phylip bio-statistical software package, produces a maximum-parsimony distance tree of the witnesses. More information on maximum parsimony can be found <a href="https://wiki.hiit.fi/display/stemmatology/Maximum+parsimony">here</a>. Please note that Phylip "pars" only supports a maximum of eight variants readings in any one variant location in the text. If your text displays more divergence than this at any point, please consider disregarding orthographic and spelling variation below, or use one of the other algorithms.'
			}
		});
	}
	$c->stash->{result} = $parameters;
	$c->forward('View::JSON');
}

=head2 query

 GET stemweb/query/<jobid>

A backup method to query the stemweb server to check a particular job status.
Returns a result as in /stemweb/result above, but status can also be -1 to 
indicate that the job is still running.

=cut

sub query :Local :Args(1) {
	my( $self, $c, $jobid ) = @_;
	my $ua = LWP::UserAgent->new();
	my $resp = $ua->get( $self->stemweb_url . "/algorithms/jobstatus/$jobid" );
	if( $resp->is_success ) {
		# Process it
		my $response = decode_utf8( $resp->content );
		$c->log->debug( "Got a response from the server: $response" );
		my $answer;
		try {
			$answer = from_json( $response );
		} catch {
			return _json_error( $c, 500, 
				"Could not parse stemweb response '' $response '' as JSON: $@" );
		}
		return _process_stemweb_result( $c, $answer );
	} elsif( $resp->code == 500 && $resp->header('Client-Warning')
		&& $resp->header('Client-Warning') eq 'Internal response' ) {
		# The server was unavailable.
		return _json_error( $c, 503, "The Stemweb server is currently unreachable." );
	} else {
		return _json_error( $c, 500, "Stemweb error: " . $resp->code . " / "
			. $resp->content );
	}
}


## Helper function for parsing Stemweb result data either by push or by pull
sub _process_stemweb_result {
	my( $c, $answer ) = @_;
	# Find the specified tradition and check its job ID.
	my $m = $c->model('Directory');
	my $tradition = $m->tradition( $answer->{textid} );
	unless( $tradition ) {
		return _json_error( $c, 400, "No tradition found with ID "
			. $answer->{textid} );
	}
	if( $answer->{status} == 0 ) {
		my $stemmata;
		if( $tradition->has_stemweb_jobid 
			&& $tradition->stemweb_jobid eq $answer->{jobid} ) {
			try {
				$stemmata = $tradition->record_stemweb_result( $answer );
				$m->save( $tradition );
			} catch( Text::Tradition::Error $e ) {
				return _json_error( $c, 500, $e->message );
			} catch {
				return _json_error( $c, 500, $@ );
			}
		} else {
			# It may be that we already received a callback meanwhile.
			# Check all stemmata for the given jobid and return them.
			@$stemmata = grep { $_->came_from_jobid && $_->from_jobid eq $answer->{jobid} } $tradition->stemmata;
		}
		if( @$stemmata ) {
			# If we got here, success!
			# TODO Use helper in Root.pm to do this
			my @steminfo = map { { 
					name => $_->identifier, 
					directed => _json_bool( !$_->is_undirected ),
					svg => $_->as_svg() } } 
				@$stemmata;
			$c->stash->{'result'} = { 
				'status' => 'success',
				'stemmata' => \@steminfo };
		} else {
			# Hm, no stemmata found on this tradition with this jobid.
			# Clear the tradition jobid so that the user can try again.
			if( $tradition->has_stemweb_jobid ) {
				$tradition->_clear_stemweb_jobid;
				$m->save( $tradition );
			}
			$c->stash->{'result'} = { status => 'notfound' };
		}
	} elsif( $answer->{status} == 1 || $answer->{status} == -1  ) {
		# 1 means running, -1 means waiting to run. Either way, 'not ready'.
		$c->stash->{'result'} = { 'status' => 'running' };
	} else {
		# Failure. Clear the job ID so that the user can try again.
		$tradition->_clear_stemweb_jobid;
		$m->save( $tradition );
		$c->stash->{'result'} = { 'status' => 'failed', 'message' => $answer->{result} };
	}
	$c->forward('View::JSON');
}

=head2 request

 GET stemweb/request/?
	tradition=<tradition ID> &
	algorithm=<algorithm ID> &
	[<algorithm parameters>]
   
Send a request for the given tradition with the given parameters to Stemweb.
Processes and returns the JSON response given by the Stemweb server.

=cut

sub request :Local :Args(0) {
	my( $self, $c ) = @_;
	# Look up the relevant tradition and check permissions.
	my $reqparams = $c->req->params;
	my $tid = delete $reqparams->{tradition};
	my $t = $c->model('Directory')->tradition( $tid );
	my $ok = _check_permission( $c, $t );
	return unless $ok;
	return( _json_error( $c, 403, 
			'You do not have permission to update stemmata for this tradition' ) )
		unless $ok eq 'full';
	
	my $algorithm = delete $reqparams->{algorithm};
	my $mergetypes = delete $reqparams->{merge_reltypes};
	if( $self->_has_pars && $algorithm == $self->pars_pk ) {
		my $start_time = scalar( gmtime( time() ) );
		$t->set_stemweb_jobid( 'local' );
		my $cdata = character_input( $t, { collapse => $mergetypes } );
		my $newick;
		try {
			$newick = phylip_pars( $cdata, { parspath => $self->_has_pars } );
		} catch ( Text::Tradition::Error $e ) {
			return _json_error( $c, 503, "Parsimony tree generation failed: "
				. $e->message );
		}
		# We have a result, so form an answer to process.
		my $answer = {
			status => 0,
			algorithm => 'pars',
			'format' => 'newick',
			textid => $tid,
			jobid => 'local',
			result => $newick,
			start_time => $start_time
		};
		return _process_stemweb_result( $c, $answer );
	} else {
		# Form the request for Stemweb.
		my $return_uri = URI->new( $c->uri_for( '/stemweb/result' ) );
		my $tsv_options = { noac => 1, ascii => 1 };
		if( $mergetypes && @$mergetypes ) {
			$tsv_options->{mergetypes} = $mergetypes;
		}
		my $stemweb_request = {
			return_path => $return_uri->path,
			return_host => $return_uri->host_port,
			data => $t->collation->as_tsv( $tsv_options ),
			userid => $c->user->get_object->email,
			textid => $tid,
			parameters => _cast_nonstrings( $reqparams ) };
		
		# Call to the appropriate URL with the request parameters.
		my $ua = LWP::UserAgent->new();
		# $c->log->debug( 'Sending request to Stemweb: ' . to_json( $stemweb_request ) ); 
		my $resp = $ua->post( $self->stemweb_url . "/algorithms/process/$algorithm/",
			'Content-Type' => 'application/json; charset=utf-8', 
			'Content' => encode_json( $stemweb_request ) ); 
		if( $resp->is_success ) {
			# Process it
			$c->log->debug( 'Got a response from the server: '
				. decode_utf8( $resp->content ) );
			my $stemweb_response = decode_json( $resp->content );
			try {
				$t->set_stemweb_jobid( $stemweb_response->{jobid} );
			} catch( Text::Tradition::Error $e ) {
				return _json_error( $c, 429, $e->message );
			}
			$c->model('Directory')->save( $t );
			$c->stash->{'result'} = $stemweb_response;
			$c->forward('View::JSON');
		} elsif( $resp->code == 500 && $resp->header('Client-Warning')
			&& $resp->header('Client-Warning') eq 'Internal response' ) {
			# The server was unavailable.
			return _json_error( $c, 503, "The Stemweb server is currently unreachable." );
		} else {
			return _json_error( $c, 500, "Stemweb error: " . $resp->code . " / "
				. $resp->content );
		}
	}
}

# Helper to check what permission, if any, the active user has for
# the given tradition
sub _check_permission {
	my( $c, $tradition ) = @_;
    my $user = $c->user_exists ? $c->user->get_object : undef;
    if( $user ) {
    	return 'full' if ( $user->is_admin || 
    		( $tradition->has_user && $tradition->user->id eq $user->id ) );
    }
	# Text doesn't belong to us, so maybe it's public?
	return 'readonly' if $tradition->public;

	# ...nope. Forbidden!
	return _json_error( $c, 403, 'You do not have permission to view this tradition.' );
}

# QUICK HACK to deal with strict Stemweb validation.
sub _cast_nonstrings {
	my $params = shift;
	foreach my $k ( keys %$params ) {
		my $v = $params->{$k};
		if( looks_like_number( $v ) ) {
			$params->{$k} = $v * 1;
		} elsif ( !defined $v || $v eq 'true' ) {
			$params->{$k} = _json_bool( $v );
		}
	}
	return $params;
}

# Helper to throw a JSON exception
sub _json_error {
	my( $c, $code, $errmsg ) = @_;
	$c->response->status( $code );
	$c->stash->{'result'} = { 'error' => $errmsg };
	$c->forward('View::JSON');
	return 0;
}		

sub _json_bool {
	return $_[0] ? JSON::true : JSON::false;
}

sub _has_pars {
	my $self = shift;
	return $self->pars_path || which('pars');
}


1;
