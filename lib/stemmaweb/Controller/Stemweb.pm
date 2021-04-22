package stemmaweb::Controller::Stemweb;
use Moose;
use namespace::autoclean;
use Date::Parse;
use Encode qw/ decode_utf8 /;
use File::Which;
use JSON;
use List::Util qw/ max /;
use LWP::UserAgent;
use Safe::Isa;
use Scalar::Util qw/ looks_like_number /;
use stemmaweb::Controller::Util
  qw/ load_tradition stemma_info json_error json_bool section_metadata /;
use stemmaweb::Model::StemmaUtil qw/ character_input phylip_pars /;
use TryCatch;
use URI;

BEGIN { extends 'Catalyst::Controller' }

has stemweb_url => (
    is      => 'ro',
    isa     => 'Str',
    default => 'http://slinkola.users.cs.helsinki.fi',
);

has pars_path => (
    is  => 'ro',
    isa => 'Str',
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
    my ($self, $c) = @_;
    if ($c->request->method eq 'POST') {

        # TODO: Verify the sender!
        my $answer;
        if (ref($c->request->body) eq 'File::Temp') {

            # Read in the file and parse that.
            $c->log->debug("Request body is in a temp file");
            open(POSTDATA, $c->request->body)
              or return _json_error($c, 500, "Failed to open post data file");
            binmode(POSTDATA, ':utf8');

            # JSON should be all one line
            my $pdata = <POSTDATA>;
            chomp $pdata;
            close POSTDATA;
            try {
                $answer = from_json($pdata);
            }
            catch {
                return _json_error($c, 400,
                    "Could not parse POST request '' $pdata '' as JSON: $@");
            }
        } else {
            $answer = from_json($c->request->body);
        }
        $c->log->debug(
            "Received push notification from Stemweb: " . to_json($answer));
        return _process_stemweb_result($c, $answer);
    } else {
        return _json_error($c, 403, 'Please use POST!');
    }
}

=head2 available

 GET algorithms/available

Queries the Stemweb server for available stemma generation algorithms and their
parameters. Returns the JSON answer as obtained from Stemweb.

=cut

sub available :Local :Args(0) {
    my ($self, $c) = @_;
    my $ua         = LWP::UserAgent->new();
    my $resp       = $ua->get($self->stemweb_url . '/algorithms/available');
    my $parameters = [];
    if ($resp->is_success && $resp->content_type =~ /json/) {
        $parameters = decode_json($resp->content);
    }    # otherwise we have no available algorithms.
    ## Temporary HACK: run Pars too
    if ($self->_has_pars) {

        # Use 100 as the special pars key
        # Add Pars as an algorithm
        push(
            @$parameters,
            {
                pk     => 100,
                model  => 'algorithms.algorithm',
                fields => {
                    args => [],
                    name => 'Pars',
                    desc =>
'The program "pars", from the Phylip bio-statistical software package, produces a maximum-parsimony distance tree of the witnesses. More information on maximum parsimony can be found <a href="https://wiki.hiit.fi/display/stemmatology/Maximum+parsimony">here</a>. Please note that Phylip "pars" only supports a maximum of eight variants readings in any one variant location in the text. If your text displays more divergence than this at any point, please consider disregarding orthographic and spelling variation below, or use one of the other algorithms.'
                }
            }
        );
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
    my ($self, $c, $jobid) = @_;
    my $ua   = LWP::UserAgent->new();
    my $resp = $ua->get($self->stemweb_url . "/algorithms/jobstatus/$jobid");
    if ($resp->is_success) {

        # Process it
        my $response = decode_utf8($resp->content);
        $c->log->debug("Got a response from the server: $response");
        my $answer;
        try {
            $answer = from_json($response);
        }
        catch {
            return _json_error($c, 500,
                "Could not parse stemweb response '' $response '' as JSON: $@");
        }
        return _process_stemweb_result($c, $answer);
    } elsif ($resp->code == 500
        && $resp->header('Client-Warning')
        && $resp->header('Client-Warning') eq 'Internal response')
    {
        # The server was unavailable.
        return _json_error($c, 503,
            "The Stemweb server is currently unreachable.");
    } else {
        return _json_error($c, 500,
            "Stemweb error: " . $resp->code . " / " . $resp->content);
    }
}

## Helper function for parsing Stemweb result data either by push or by pull
sub _process_stemweb_result {
    my ($c, $answer) = @_;

    # Find the specified tradition and check its job ID.
    # No permission check because Stemweb won't have a user cookie.
    my $m = $c->model('Directory');
    my $textid = $answer->{textid};
    my $textinfo = load_tradition($c, $textid,
        {skip_permission => 1, load_stemmata => 1});
    unless ($textinfo) {
        return _json_error($c, 400,
            "No tradition found with ID " . $answer->{textid});
    }
    if ($answer->{status} == 0) {
        my @stemmata;
        # Get the resulting Newick trees, separate them and give them names
        my $newickspecs = {};
        my $title = sprintf("%s %d", $answer->{algorithm}, str2time($answer->{start_time}));
        my $ct = 0;
        foreach my $tree (split(/\s*;\s*/, $answer->{result})) {
            $newickspecs->{$title . "_$ct"} = "$tree;";
        }
        if (exists($textinfo->{stemweb_jobid})
            && $textinfo->{stemweb_jobid} eq $answer->{jobid}) {
            foreach my $s (keys %$newickspecs) {
                my $req = {
                    identifier => $s,
                    newick => $newickspecs->{$s},
                    from_jobid => $answer->{jobid}
                };
                try {
                    my $returned = $m->ajax(
                        'post', "/tradition/$textid/stemma",
                        'Content-Type' => 'application/json',
                        Content        => JSON::encode_json($req)
                    );
                    push(@stemmata, stemma_info($returned));
                } catch (stemmaweb::Error $e) {
                    return _json_error($c, $e->status, $e->message);
                } catch {
                    return _json_error($c, 500, $@);
                }
            }
        } else {
            # It may be that we already received a callback meanwhile
            # and deleted the tradition jobid.
            # Check all stemmata for the given jobid and return them.
            @stemmata =
              grep { exists $_->{from_jobid} &&
                     $_->{from_jobid} eq $answer->{jobid} }
              @{$textinfo->{stemmata}};
        }
        if (@stemmata) {
            # If we got here, success!
            $c->stash->{'result'} = {
                'status'   => 'success',
                'stemmata' => \@stemmata,
            };
        } else {
            # Hm, either there was a mismatch between this tradition's
            # job ID and the one returned in the answer, or
            if ($textinfo->{stemweb_jobid}) {
                try {
                    _set_stemweb_jobid($m, $textid, -1);
                } catch (stemmaweb::Error $e ) {
                    return _json_error($c, $e->status, $e->message);
                }
            }
            $c->stash->{'result'} = { status => 'notfound' };
        }
    } elsif ($answer->{status} == 1 || $answer->{status} == -1) {

        # 1 means running, -1 means waiting to run. Either way, 'not ready'.
        $c->stash->{'result'} = { 'status' => 'running' };
    } else {

        # Failure. Clear the job ID so that the user can try again.
        try {
            _set_stemweb_jobid($m, $textid, -1);
        } catch (stemmaweb::Error $e ) {
            return _json_error($c, $e->status, $e->message);
        }
        $c->stash->{'result'} =
          { 'status' => 'failed', 'message' => $answer->{result} };
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

Possible parameters are those offered by the Stemweb service, as well as
the following:

  * conflate - which relation (and all closer ones) to normalise on, if any
  * section  - if we want to process particular sections, pass them here.

=cut

sub request :Local :Args(0) {
    my ($self, $c) = @_;
    my $m = $c->model('Directory');
    # Look up the relevant tradition and check permissions.
    my $reqparams = $c->req->params;
    my $tid       = delete $reqparams->{tradition};
    my $textinfo  = load_tradition($c, $tid);
    my $ok        = $textinfo->{permission};
    return (
        _json_error(
            $c,
            403,
            'You do not have permission to update stemmata for this tradition'
        )
    ) unless $ok eq 'full';

    my $algorithm  = delete $reqparams->{algorithm};
    if ($self->_has_pars && $algorithm == 100) {
        $reqparams->{'exclude_layers'} = "true";
        my $start_time = scalar(gmtime(time()));
        my $newick;
        try {
            my $cdata = _get_alignment($m, $tid, 'matrix', $reqparams);
            $newick = phylip_pars($cdata, { parspath => $self->_has_pars });
        } catch (stemmaweb::Error $e ) {
            return _json_error($c, $e->status,
                "Parsimony tree generation failed: " . $e->message);
        }

        # We have a result, so form an answer to process.
        my $answer = {
            status     => 0,
            algorithm  => 'pars',
            'format'   => 'newick',
            textid     => $tid,
            jobid      => -1,
            result     => $newick,
            start_time => $start_time
        };
        return _process_stemweb_result($c, $answer);
    } else {
        # Split out TSV generation options from algorithm run options.
        my $tsvopts = {'exclude_layers' => 'true'};
        $tsvopts->{'section'} = delete $reqparams->{'section'}
            if exists $reqparams->{'section'};
        $tsvopts->{'conflate'} = delete $reqparams->{'conflate'}
            if exists $reqparams->{'conflate'};

        # Form the request for Stemweb.
        my $return_uri = URI->new($c->uri_for('/stemweb/result'));
        my $stemweb_request = {
            return_path => $return_uri->path,
            return_host => $return_uri->host_port,
            userid      => $c->user->get_object->email,
            textid      => $tid,
            parameters  => _cast_nonstrings($reqparams)
        };
        # Pull the actual alignment data from Stemmarest and add it
        # to the request.
        # n.b. We might need to ASCIIfy the sigla.
        my $tsv;
        try {
            $tsv = _get_alignment($m, $tid, 'tsv', $tsvopts);
        } catch (stemmaweb::Error $e ) {
            return _json_error($c, $e->status,
                "Could not generate TSV data: " . $e->message);
        }
        $stemweb_request->{data} = $tsv;
        # Call to the appropriate URL with the request parameters.
        my $ua = LWP::UserAgent->new();
        $c->log->debug( 'Sending request to Stemweb: ' . to_json( $stemweb_request ) );
        my $resp = $ua->post(
            $self->stemweb_url . "/algorithms/process/$algorithm/",
            'Content-Type' => 'application/json; charset=utf-8',
            'Content'      => encode_json($stemweb_request)
        );
        if ($resp->is_success) {

            # Process it
            $c->log->debug('Got a response from the server: '
                  . decode_utf8($resp->content));
            my $stemweb_response = decode_json($resp->content);
            try {
                _set_stemweb_jobid($m, $tid, $stemweb_response->{jobid});
            }
            catch (stemmaweb::Error $e ) {
                return _json_error($c, $e->status, $e->message);
            }
            $c->stash->{'result'} = $stemweb_response;
            $c->forward('View::JSON');
        } elsif ($resp->code == 500
            && $resp->header('Client-Warning')
            && $resp->header('Client-Warning') eq 'Internal response')
        {
            # The server was unavailable.
            return _json_error($c, 503,
                "The Stemweb server is currently unreachable.");
        } else {
            return _json_error($c, 500,
                "Stemweb error: " . $resp->code . " / " . $resp->content);
        }
    }
}

## Helper to set the Stemweb job ID, which is expected to be an integer.
sub _set_stemweb_jobid {
    my ($m, $textid, $jobid) = @_;
    my $param = {'stemweb_jobid', $jobid};
    my $textinfo = $m->ajax(
        'put', "/tradition/$textid",
        'Content-Type' => 'application/json',
        Content        => JSON::encode_json($param)
    );
    return $textinfo;
}

# Helper to get the alignment data for the given tradition, either as
# tab-separated format or as character matrix data.
sub _get_alignment {
    my ($m, $textid, $type, $opts) = @_;
    my $uri = "/tradition/$textid/$type";
    my $location = URI->new($uri);
    $location->query_form($opts);
    return $m->ajax('get', $location);
}

# QUICK HACK to deal with strict Stemweb validation.
sub _cast_nonstrings {
    my $params = shift;
    foreach my $k (keys %$params) {
        my $v = $params->{$k};
        if (looks_like_number($v)) {
            $params->{$k} = $v * 1;
        } elsif (!defined $v || $v eq 'true') {
            $params->{$k} = _json_bool($v);
        }
    }
    return $params;
}

# Helper to throw a JSON exception
sub _json_error {
    my ($c, $code, $errmsg) = @_;
    $c->response->status($code);
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
