package stemmaweb::Controller::Root;
use Moose;
use namespace::autoclean;
use JSON qw ();
use TryCatch;
use XML::LibXML;
use XML::LibXML::XPathContext;


BEGIN { extends 'Catalyst::Controller' }

#
# Sets the actions in this controller to be registered with no prefix
# so they function identically to actions created in MyApp.pm
#
__PACKAGE__->config(namespace => '');

=head1 NAME

stemmaweb::Controller::Root - Root Controller for stemmaweb

=head1 DESCRIPTION

Serves up the main container pages.

=head1 URLs

=head2 index

The root page (/).  Serves the main container page, from which the various
components will be loaded.

=cut

sub index :Path :Args(0) {
    my ( $self, $c ) = @_;

	# Are we being asked to load a text immediately? If so 
	if( $c->req->param('withtradition') ) {
		$c->stash->{'withtradition'} = $c->req->param('withtradition');
	}
    $c->stash->{template} = 'index.tt';
}

=head2 about

A general overview/documentation page for the site.

=cut

sub about :Local :Args(0) {
	my( $self, $c ) = @_;
	$c->stash->{template} = 'about.tt';
}

=head2 help/*

A dispatcher for documentation of various aspects of the application.

=cut

sub help :Local :Args(1) {
	my( $self, $c, $topic ) = @_;
	$c->stash->{template} = "$topic.tt";
}

=head1 Elements of index page

=head2 directory

 GET /directory

Serves a snippet of HTML that lists the available texts.  This returns texts belonging to the logged-in user if any, otherwise it returns all public texts.

=cut

sub directory :Local :Args(0) {
	my( $self, $c ) = @_;
    my $m = $c->model('Directory');
    # Is someone logged in?
    my %usertexts;
    if( $c->user_exists ) {
    	# The Catalyst/Kioku user
    	my $user = $c->user->get_object;
    	# The Neo4J user
    	my $n4ju = $m->find_user( $user->id );
    	my @list = $n4ju->traditionlist;
    	map { $usertexts{$_->{id}} = 1 } @list;
		$c->stash->{usertexts} = \@list;
		$c->stash->{is_admin} = 1 if $user->is_admin;
	}
	# List public (i.e. readonly) texts separately from any user (i.e.
	# full access) texts that exist. 
	# TODO separate out admin texts...
	my @plist = grep { !$usertexts{$_->{id}} } $m->traditionlist('public');
	$c->stash->{publictexts} = \@plist;
	$c->stash->{template} = 'directory.tt';
}

=head1 AJAX methods for traditions and their properties

=head2 newtradition

 POST /newtradition,
 	{ name: <name>,
 	  language: <language>,
 	  public: <is_public>,
 	  direction: <LR|RL|BI>,
 	  file: <fileupload> }
 
Creates a new tradition belonging to the logged-in user, with the given name
and the collation given in the uploaded file. The file type is indicated via
the filename extension (.csv, .txt, .xls, .xlsx, .xml). Returns the ID and 
name of the new tradition.
 
=cut

sub newtradition :Local :Args(0) {
	my( $self, $c ) = @_;
	return _json_error( $c, 403, 'Cannot save a tradition without being logged in' )
		unless $c->user_exists;

	## The Catalyst user
	my $m = $c->model('Directory');
	try {
		$c->stash->{'result'} = $m->newtradition( $c->user, $c->request );
	} catch ( stemmaweb::Error $e ) {
		return _json_error( $c, $e->status, $e->message );
	}

	$c->forward('View::JSON');
}

=head2 textinfo

 GET /textinfo/$textid
 POST /textinfo/$textid, 
 	{ name: $new_name, 
 	  language: $new_language,
 	  public: $is_public, 
 	  direction: $direction,
 	  owner: $new_userid } # only admin users can update the owner
 
Returns information about a particular text.

=cut

sub textinfo :Local :Args(1) {
	my( $self, $c ) = @_;
	my( $tradition, $ok ) = _load_tradition( @_ );
	return unless $ok;
	if( $c->req->method eq 'POST' ) {
		return _json_error( $c, 403, 
			'You do not have permission to update this tradition' ) 
			unless $ok eq 'full';
		my $params = $c->request->parameters;
		if( exists $params->{'owner'} ) {
			unless( $c->user->get_object->is_admin ) {
				return _json_error( $c, 403, 
					"Only admin users can change tradition ownership" );
			}
		}
		try {
			$tradition->set_textinfo( $params );
		} catch( stemmaweb::Error $e ) {
			return _json_error( $c, $e->status, $e->message );
		}
	}

	# Now return the current textinfo, whether GET or successful POST.
	my $textinfo = $tradition->textinfo();
	my @stemmasvg = map { _stemma_info( $_ ) } $tradition->stemmata;
	$textinfo->{stemmata} = \@stemmasvg;
	$c->stash->{'result'} = $tradition->textinfo;
	$c->forward('View::JSON');
}

=head2 variantgraph

 GET /variantgraph/$textid
 
Returns the variant graph for the text specified at $textid, in SVG form.

=cut

sub variantgraph :Local :Args(1) {
	my( $self, $c ) = @_;
	my( $tradition, $ok ) = _load_tradition( @_ );
	return unless $ok;

	$c->stash->{'result'} = $tradition->export('svg');
	$c->forward('View::SVG');
}


## TODO Separate stemma manipulation functionality into its own controller.
	
# Helper method to bundle the newline-stripped stemma SVG and its identifying info.
sub _stemma_info {
	my( $stemma ) = @_;
	my $ssvg = $stemma->as_svg();
	$ssvg =~ s/\n/ /mg;
	my $sinfo = {
		name => $stemma->identifier, 
		directed => _json_bool( !$stemma->is_undirected ),
		svg => $ssvg }; 
	return $sinfo;
}

=head2 stemma

 GET /stemma/$textid/$stemmaid
 POST /stemma/$textid/$stemmaid, { 'dot' => $dot_string }

Returns an SVG representation of the given stemma hypothesis for the text.  
If the URL is called with POST, the stemma at $stemmaseq will be altered
to reflect the definition in $dot_string. If $stemmaid is '*', a new
stemma will be added.

=cut

sub stemma :Local :Args(2) {
	my( $self, $c, $textid, $stemmaid ) = @_;
	my( $tradition, $ok ) = _load_tradition( $c, $textid );
	return unless $ok;

	my $stemma;
	if( $c->req->method eq 'POST' ) {
		if( $ok eq 'full' ) {
			my $dot = $c->request->body_params->{dot};
			try {
				if( $stemmaid eq '*' ) {
					$stemma = $tradition->putstemma( $dot );
				} else {
					$stemma = $tradition->stemma( $stemmaid );
					$stemma->alter( $dot );
				}
			} catch( stemmaweb::Error $e ) {
				return _json_error( $c, $e->status, $e->message );
			}
		} else {
			# No permissions to update the stemma
			return _json_error( $c, 403, 
				'You do not have permission to update stemmata for this tradition' );
		}
	}
	
	# For a GET or a successful POST request, return the SVG representation
	# of the stemma in question, if any.
	# What was requested, XML or JSON?
	my $return_view = 'SVG';
	if( my $accept_header = $c->req->header('Accept') ) {
		$c->log->debug( "Received Accept header: $accept_header" );
		foreach my $type ( split( /,\s*/, $accept_header ) ) {
			# If we were first asked for XML, return SVG
			last if $type =~ /^(application|text)\/xml$/;
			# If we were first asked for JSON, return JSON
			if( $type eq 'application/json' ) {
				$return_view = 'JSON';
				last;
			}
		}
	}
	if( $return_view eq 'SVG' ) {
		$c->stash->{'result'} = $stemma->as_svg();
		$c->forward('View::SVG');
	} else { # JSON
		$c->stash->{'result'} = _stemma_info( $stemma );
		$c->forward('View::JSON');
	}
}

=head2 stemmadot

 GET /stemmadot/$textid/$stemmaseq
 
Returns the 'dot' format representation of the current stemma hypothesis.

=cut

sub stemmadot :Local :Args(2) {
	my( $self, $c, $textid, $stemmaid ) = @_;
	my( $tradition, $ok ) = _load_tradition( $c, $textid );
	return unless $ok;

	my $stemma;
	try {
		$stemma = $tradition->stemma( $stemmaid );
	} catch( stemmaweb::Error $e ) {
			return _json_error( $c, $e->status, $e->message );
	}
	# Get the dot and transmute its line breaks to literal '|n'
	$c->stash->{'result'} = { 'dot' =>  $stemma->editable( { linesep => '|n' } ) };
	$c->forward('View::JSON');
}

=head2 stemmaroot

 POST /stemmaroot/$textid/$stemmaseq, { root: <root node ID> }

Orients the given stemma so that the given node is the root (archetype). Returns the 
information structure for the new stemma.

=cut 

sub stemmaroot :Local :Args(2) {
	my( $self, $c, $textid, $stemmaid ) = @_;
	my( $tradition, $ok ) = _load_tradition( $c, $textid );
	if( $ok eq 'full' ) {
		try {
			my $stemma = $tradition->stemma( $stemmaid );
			$stemma->root_graph( $c->req->param('root') );
			$c->stash->{'result'} = _stemma_info( $stemma );
			$c->forward('View::JSON');
		} catch( stemmaweb::Error $e ) {
			return _json_error( $c, $e->status, $e->message );
		} 
	} else {
		return _json_error( $c, 403,  
				'You do not have permission to update stemmata for this tradition' );
	}
}

=head2 download

 GET /download/$textid/$format
 
Returns a file for download of the tradition in the requested format.
 
=cut

sub download :Local :Args(2) {
	my( $self, $c, $textid, $format ) = @_;
	my( $tradition, $ok ) = _load_tradition( $c, $textid );
	return unless $ok;

	my $view = "View::$format";
	$c->stash->{'name'} = $tradition->name;
	$c->stash->{'download'} = 1;
	my @outputargs;
	if( $format eq 'SVG' ) {
		# Send the list of colors through to the backend.
		# TODO Think of some way not to hard-code this.
		push( @outputargs, { 'show_relations' => 'all',
			'graphcolors' => [ "#5CCCCC", "#67E667", "#F9FE72", "#6B90D4", 
				"#FF7673", "#E467B3", "#AA67D5", "#8370D8", "#FFC173" ] } );
	}
	try {
		$c->stash->{'result'} = $tradition->export( $format, @outputargs );
	} catch( stemmaweb::Error $e ) {
		return _json_error( $c, $e->status, $e->message );
	}
	$c->forward( $view );
}

####################
### Helper functions
####################

# Helper to check what permission, if any, the active user has for
# the given tradition
sub _check_permission {
	my( $c, $tradition ) = @_;
    my $user = $c->user_exists ? $c->user->get_object : undef;
    if( $user ) {
    	return 'full' if ( $user->is_admin || 
    		( $tradition->user->id eq $user->id ) );
    }
	# Text doesn't belong to us, so maybe it's public?
	return 'readonly' if $tradition->is_public;

	# ...nope. Forbidden!
	return _json_error( $c, 403, 'You do not have permission to view this tradition.' );
}

# Helper to load and check the permissions on a tradition
sub _load_tradition {
	my( $c, $textid ) = @_;
	my $tradition;
	try {
		$tradition = $c->model('Directory')->tradition( $textid );
	} catch( stemmaweb::Error $e ) {
			return _json_error( $c, $e->status, $e->message );
	}
	my $ok = _check_permission( $c, $tradition );
	return( $tradition, $ok );
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

=head2 default

Standard 404 error page

=cut

sub default :Path {
    my ( $self, $c ) = @_;
    $c->response->body( 'Page not found' );
    $c->response->status(404);
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
