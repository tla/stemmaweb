package stemmaweb::Controller::Stemweb;
use Moose;
use namespace::autoclean;
use JSON qw/ from_json /;
use Safe::Isa;
use TryCatch;

BEGIN { extends 'Catalyst::Controller' }

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
			$answer = from_json( $pdata );
		} else {
			$answer = from_json( $c->request->body );
		}
		# Find a tradition with the defined Stemweb job ID.
		# TODO: Maybe get Stemweb to pass back the tradition ID...
		my $m = $c->model('Directory');
		my @traditions;
		$m->scan( sub{ push( @traditions, $_[0] )
						if $_[0]->$_isa('Text::Tradition')
						&& $_[0]->has_stemweb_jobid 
						&& $_[0]->stemweb_jobid eq $answer->{job_id}; 
					} );
		if( @traditions == 1 ) {
			my $tradition = shift @traditions;
			if( $answer->{status} == 0 ) {
				try {
					$tradition->record_stemweb_result( $answer );
					$m->save( $tradition );
				} catch( Text::Tradition::Error $e ) {
					return _json_error( $c, 500, $e->message );
				} catch {
					return _json_error( $c, 500, $@ );
				}
				# If we got here, success!
				$c->stash->{'result'} = { 'status' => 'success' };
				$c->forward('View::JSON');
			} else {
				return _json_error( $c, 500,
					"Stemweb failure not handled: " . $answer->{result} );
			}
		} elsif( @traditions ) {
			return _json_error( $c, 500, 
				"Multiple traditions with Stemweb job ID " . $answer->{job_id} . "!" );
		} else {
			return _json_error( $c, 400, 
				"No tradition found with Stemweb job ID " . $answer->{job_id} );
		}
	} else {
		return _json_error( $c, 403, 'Please use POST!' );
	}
}

# Helper to throw a JSON exception
sub _json_error {
	my( $c, $code, $errmsg ) = @_;
	$c->response->status( $code );
	$c->stash->{'result'} = { 'error' => $errmsg };
	$c->forward('View::JSON');
	return 0;
}

1;