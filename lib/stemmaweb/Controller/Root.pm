package stemmaweb::Controller::Root;
use Moose;
use namespace::autoclean;
use JSON qw ();
use stemmaweb::Controller::Stemma;
use stemmaweb::Controller::Util qw/ load_tradition json_error json_bool /;
use File::Temp;
use Text::Tradition;
use Text::Tradition::Stemma;
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
		my $user = $c->user->get_object;
		my $list = _alpha_sort($m->ajax( 'get', "/user/" . $user->id . "/traditions" ));
		map { $usertexts{$_->{id}} = 1 } @$list;
			$c->stash->{usertexts} = $list;
			$c->stash->{is_admin} = 1 if $user->is_admin;
	}
	# List public (i.e. readonly) texts separately from any user (i.e.
	# full access) texts that exist.
	my $alltexts;
	if( exists $c->stash->{is_admin} && $c->stash->{is_admin} ) {
		$alltexts = _alpha_sort($m->ajax( 'get', '/traditions' ));
	} else {
		$alltexts = _alpha_sort($m->ajax( 'get', '/traditions?public=true'));
	}
	my @plist = grep { !$usertexts{$_->{id}} } @$alltexts;
	$c->stash->{publictexts} = \@plist;
	$c->stash->{template} = 'directory.tt';
}

sub _alpha_sort {
	my $list = shift;
	my @sorted = sort { $a->{name} cmp $b->{name} } @$list;
	return \@sorted;
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
	return json_error( $c, 403, 'Cannot save a tradition without being logged in' )
		unless $c->user_exists;
	my $m = $c->model('Directory');

  	## Convert the request that Catalyst received into one that
  	## the Neo4J db expects. This involves passing through the
  	## tempfile upload and filling in some defaults.
	my $upload = $c->req->upload('file');
	## If we've been asked to parse a CTE file, cheat by using the old Text::Tradition parser.
	my $fileargs = [ $upload->tempname, $upload->filename ];
	if( $upload->type ) {
		push( @$fileargs, 'Content-Type', $upload->type );
	}
	if( $upload->charset ) {
		push( @$fileargs, 'Content-Encoding', $upload->charset );
	}
	
	my $fh;
	my $filetype = $c->req->param('filetype');
	if( $filetype eq 'cte' ) {
		my $t;
		try {
			$t = Text::Tradition->new(
				name => $c->req->param('name'),
				input => 'CTE',
				file => $upload->tempname
			);
		} catch ( Text::Tradition::Error $e ) {
			return json_error( $c, 400, $e->message )
		}
		$fh = File::Temp->new();
		print $fh $t->collation->as_graphml();
		$fh->seek(0, SEEK_END);
		$fileargs->[0] = $fh->filename; # Remaining fileargs should be the same.
		$filetype = 'stemmaweb';
	} elsif( $filetype eq 'xls' && $upload->filename =~ /xlsx$/ ) {
		$filetype = 'xlsx';
	}

	my %newopts = (
		'userId' => $c->user->id,
		'filetype' => $filetype,
		'file' => $fileargs
  	);
	foreach my $opt (qw/ name language direction public /) {
		if( $c->req->param($opt) ) {
			$newopts{$opt} = $c->req->param($opt);
		}
	}

  	my $result;
	try {
    	$result = $m->ajax('post', '/tradition', 'Content-Type' => 'form-data', Content => \%newopts );
	} catch ( stemmaweb::Error $e ) {
		return json_error( $c, $e->status, $e->message );
	}
  	$c->stash->{result} = $result;
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
	my( $self, $c, $textid ) = @_;
	my( $textinfo, $ok ) = load_tradition( $c, $textid );
	return unless $ok;

	my $m = $c->model('Directory');
	# Update information if we have been asked to
	if( $c->req->method eq 'POST' ) {
		return json_error( $c, 403,
			'You do not have permission to update this tradition' )
			unless $ok eq 'full';
	    my $user = $c->user->get_object;
			my $params = $c->request->parameters;
	    if( !$user->is_admin && exists $params->{owner} ) {
	      return json_error( $c, 403,
	        "Only admin users can change tradition ownership" );
	    }
	    # Now pass through the request
	    try {
	      $textinfo = $m->ajax('put', "/tradition/$textid",
	        'Content-Type' => 'application/json', Content => JSON::to_json($params));
	    } catch (stemmaweb::Error $e) {
	      return json_error( $c, $e->status, $e->message );
	    }
  	} elsif ($c->req->method ne 'GET') {
    	return json_error($c, 400, "Disallowed HTTP method " . $c->req->method);
  	}
	# Add the witness information
	my @witnesses = map { $_->{sigil} }
		@{$m->ajax('get', "/tradition/$textid/witnesses")};
	$textinfo->{witnesses} = \@witnesses;

	# Add the stemma information that exists, if any
	my @stemmata;
	foreach my $stemma ( @{$m->ajax('get', "/tradition/$textid/stemmata")} ) {
		push( @stemmata, stemmaweb::Controller::Stemma::stemma_info($stemma));
	}
	$textinfo->{stemmata} = \@stemmata;
	$c->stash->{'result'} = $textinfo;
	$c->forward('View::JSON');
}

=head2 delete

 POST /delete/$textid

Deletes the tradition and all its data. Cannot be undone.

=cut

sub delete :Local :Args(1) {
	my( $self, $c, $textid ) = @_;
	my( $textinfo, $ok ) = load_tradition( $c, $textid );
	return json_error($c, 400, "Disallowed HTTP method " . $c->req->method)
		unless $c->req->method eq 'POST';
	return json_error( $c, 403,
		'You do not have permission to delete this tradition' )
		unless $ok eq 'full';

	# At this point you had better be sure.
	try {
		$c->model('Directory')->ajax('delete', "/tradition/$textid");
		$c->stash->{result} = {'status' => 'ok'};
		$c->forward('View::JSON');
	} catch (stemmaweb::Error $e) {
		return json_error( $c, $e->status, $e->message );
	}
}

=head2 variantgraph

 GET /variantgraph/$textid

Returns the variant graph for the text specified at $textid, in SVG form.

=cut

sub variantgraph :Local :Args(1) {
	my( $self, $c, $textid ) = @_;
	my( $textinfo, $ok ) = load_tradition( $c, $textid );
	return unless $ok;

	$c->stash->{result} = $c->model('Directory')->tradition_as_svg($textinfo->{id});
	$c->forward('View::SVG');
}


=head2 download

 GET /download/$textid/$format

Returns a file for download of the tradition in the requested format.

=cut

sub download :Local :Args(2) {
	my( $self, $c, $textid, $format ) = @_;
	my( $textinfo, $ok ) = load_tradition( $c, $textid );
	return unless $ok;
  	## Available formats are graphml, json, csv, tsv, dot. Dot -> SVG

	my $view = $format eq 'dot' ? 'View::Plain' : "View::$format";
	$c->stash->{'name'} = $textinfo->{name};
	$c->stash->{'download'} = 1;

	try {
	    if( $format eq 'svg' ) {
			# Get the tradition as SVG, with relationships included
			$c->stash->{'result'} = $c->model('Directory')->tradition_as_svg(
	        	$textid, {include_relations => 1});
	    } else {
	      	my $location = sprintf("/tradition/%s/%s", $textinfo->{id}, lc($format));
			$c->stash->{'result'} = $c->model('Directory')->ajax('get', $location);
	    }
	} catch( stemmaweb::Error $e ) {
		return json_error( $c, $e->status, $e->message );
	}
	$c->forward( $view );
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
