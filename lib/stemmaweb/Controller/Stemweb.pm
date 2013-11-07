package stemmaweb::Controller::Stemweb;
use Moose;
use namespace::autoclean;
use Encode qw/ decode_utf8 /;
use JSON;
use LWP::UserAgent;
use Safe::Isa;
use TryCatch;
use URI;

BEGIN { extends 'Catalyst::Controller' }

## TODO Move the /algorithms/available function to the Stemweb module
my $STEMWEB_BASE_URL = 'http://slinkola.users.cs.helsinki.fi';

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
 { job_id: <ID number>
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
			open( POSTDATA, $c->request->body ) or die "Failed to open post data file";
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
		return _process_stemweb_result( $c, $answer );
	} else {
		return _json_error( $c, 403, 'Please use POST!' );
	}
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
	my $resp = $ua->get( $STEMWEB_BASE_URL . "/algorithms/jobstatus/$jobid" );
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
	# Find a tradition with the defined Stemweb job ID.
	# TODO: Maybe get Stemweb to pass back the tradition ID...
	my $m = $c->model('Directory');
	my @traditions;
	## STUPID HACK: unless we load the possible tradition owners
	## within scope of the scan, they will not exist when the affected
	## tradition is saved.
	my @users;
	$m->scan( sub{ push( @traditions, $_[0] )
					if $_[0]->$_isa('Text::Tradition')
					&& $_[0]->has_stemweb_jobid 
					&& $_[0]->stemweb_jobid eq $answer->{job_id}; 
			push( @users, $_[0] ) if $_[0]->$_isa('Text::Tradition::User');
				} );
	if( @traditions == 1 ) {
		my $tradition = shift @traditions;
		if( $answer->{status} == 0 ) {
			my $stemmata;
			try {
				$stemmata = $tradition->record_stemweb_result( $answer );
				$m->save( $tradition );
			} catch( Text::Tradition::Error $e ) {
				return _json_error( $c, 500, $e->message );
			} catch {
				return _json_error( $c, 500, $@ );
			}
			# If we got here, success!
			my @steminfo = map { { 
					name => $_->identifier, 
					directed => _json_bool( !$_->is_undirected ),
					svg => $_->as_svg() } } 
				@$stemmata;
			$c->stash->{'result'} = { 
				'status' => 'success',
				'stemmata' => \@steminfo };
		} elsif( $answer->{status} < 1 ) {
			$c->stash->{'result'} = { 'status' => 'running' };
		} else {
			return _json_error( $c, 500,
				"Stemweb failure not handled: " . $answer->{result} );
		}
	} elsif( @traditions ) {
		return _json_error( $c, 500, 
			"Multiple traditions with Stemweb job ID " . $answer->{job_id} . "!" );
	} else {
		# Possible that the tradition got updated in the meantime...
		if( $answer->{status} == 0 ) {
			$c->stash->{'result'} = { 'status' => 'notfound' };
		} else {
			return _json_error( $c, 400, 
				"No tradition found with Stemweb job ID " . $answer->{job_id} );
		}
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
	
	# Form the request for Stemweb.
	my $algorithm = delete $reqparams->{algorithm};
	my $return_uri = URI->new( $c->uri_for( '/stemweb/result' ) );
	my $stemweb_request = {
		return_path => $return_uri->path,
		return_host => $return_uri->host_port,
		data => $t->collation->as_tsv,
		userid => $c->user->get_object->email,
		parameters => $reqparams };
		
	# Call to the appropriate URL with the request parameters.
	my $ua = LWP::UserAgent->new();
	$c->log->debug( 'Sending request to Stemweb: ' . to_json( $stemweb_request ) ); 
	my $resp = $ua->post( $STEMWEB_BASE_URL . "/algorithms/process/$algorithm/",
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


1;
