package stemmaweb::Controller::Util;
use strict;
use warnings;
use Exporter qw/ import /;
use JSON;
use Text::Tradition;
use Text::Tradition::Stemma;
use TryCatch;
use XML::LibXML;
use XML::LibXML::XPathContext;
use vars qw/ @EXPORT /;

@EXPORT = qw/ load_tradition load_stemma generate_svg json_error json_bool /;

=head1 NAME

stemmaweb::Controller::Util - Catalyst Controller utility functions

=head1 DESCRIPTION

Useful helpers for the Catalyst controllers

=head1 METHODS

=cut


# Helper to check what permission, if any, the active user has for
# the given tradition
sub _check_permission {
	my( $c, $textinfo ) = @_;
    my $user = $c->user_exists ? $c->user->get_object : undef;
    if( $user ) {
    	return 'full' if ( $user->is_admin ||
    		( $textinfo->{owner} eq $user->id ) );
    }
	# Text doesn't belong to us, so maybe it's public?
	return 'readonly' if $textinfo->{is_public};

	# ...nope. Forbidden!
	return json_error( $c, 403, 'You do not have permission to view this tradition.' );
}

# Helper to load and check the permissions on a tradition
sub load_tradition {
	my( $c, $textid ) = @_;
	my $m = $c->model('Directory');
	my $textinfo;
	my $sections;
	try {
		$textinfo = $m->ajax('get', "/tradition/$textid");
		$sections = $m->ajax('get', "/tradition/$textid/sections");
	} catch( stemmaweb::Error $e ) {
			return json_error( $c, $e->status, $e->message );
	}
	foreach my $s ( @$sections ) {
		my $sect = { 'start' => $s->{id}, 'display' => $s->{name} };
		push( @{$c->stash->{'textsections'}}, $sect );
	}
	$textinfo->{permission} = _check_permission( $c, $textinfo );
	return $textinfo;
}

sub load_stemma {
	my( $stemmadata ) = @_;
	return Text::Tradition::Stemma->new(
		dot => $stemmadata->{dot},
		is_undirected => $stemmadata->{is_undirected} == JSON::true,
		identifier => $stemmadata->{identifier}
	);
}

# Given a GraphML node or edge element, return one of its labeled properties.
sub _nodeprop {
	my( $map, $xpc, $nodexml, $property ) = @_;
	return undef if !exists($map->{$property});
	my $xp = sprintf('./g:data[@key="%s"]/text()', $map->{$property});
	return $xpc->findvalue($xp, $nodexml);
}
# Return the witness list, and an absolute count of witnesses, for a particular edge element.
sub _path_witnesses {
	my ($map, $xpc, $edgexml, $majority) = @_;
	my $witxp = './g:data[@key="%s"]/text()';
	my $xp = sprintf($witxp, $map->{witnesses});
	my $witstr = $xpc->findvalue($xp, $edgexml);
	$witstr =~ s/^\[(.*)\]$/$1/;
	my @wits = split(/, /, $witstr);
	my $count = scalar @wits;
	if (scalar @wits > $majority ) {
		@wits = ('majority');
	}
	# Now add in any qualified witnesses.
	foreach my $datum ($xpc->findnodes('./g:data', $edgexml)) {
		my $tag = $datum->getAttribute('key');
		next if $tag eq $map->{neolabel};
		next if $tag eq $map->{witnesses};
		my $extrastr = $datum->textContent;
		$extrastr =~ s/^\[(.*)\]$/$1/;
		my @extrawits = split(/, /, $extrastr );
		$count += scalar @extrawits;
		push(@wits, map { $_ . " ($tag)"} @extrawits);
	}
	return ($count, @wits);
}
# Return an attribute string suitable for a dot file.
sub _dot_attr_string {
        my( $hash ) = @_;
        my @attrs;
        foreach my $k ( sort keys %$hash ) {
                my $v = $hash->{$k};
                push( @attrs, $k.'="'.$v.'"' );
        }
        return( '[ ' . join( ', ', @attrs ) . ' ]' );
}

# Get (and parse) the GraphML directly, to turn it into the sort of graph we need for the
# relationship mapper.
sub generate_svg {
	my $c = shift;
	my $m = $c->model('Directory');
	my $textid = $c->stash->{textid};
	my $sectid = $c->stash->{sectid};
	my $textinfo = $c->stash->{tradition};
	my $sectinfo = $c->stash->{section};
	my $graph;
	try {
		my $graphml = $m->ajax('get', "/tradition/$textid/section/$sectid/graphml?include_witnesses=true");
		my $parser = XML::LibXML->new();
		$graph = $parser->parse_string( $graphml )->documentElement();
	} catch (stemmaweb::Error $e) {
		return json_error( $c, $e->status, $e->message );
	} catch {
		return json_error( $c, 500, "Error on parse of section XML");
	}
	
	my $xpc = XML::LibXML::XPathContext->new( $graph );
	$xpc->registerNs( 'g', 'http://graphml.graphdrawing.org/xmlns' );
	
    # First get the key mappings for node/edge properties
	my $nodedata = {};
	my $edgedata = {};
    foreach my $k ( $xpc->findnodes( '//g:key' ) ) {
        # Each key has a 'for' attribute to say whether it is for graph,
        # node, or edge.
        my $keyid = $k->getAttribute( 'id' );
        my $keyname = $k->getAttribute( 'attr.name' );

		# Keep track of the XML identifiers for the data carried
		# in each node element.
		my $dtype = $k->getAttribute( 'for' );
		if( $dtype eq 'node' ) {
            $nodedata->{$keyname} = $keyid; 
        } else {
            $edgedata->{$keyname} = $keyid;
        }
    }
	
	# Name the graph - use section name if it exists.
    my $graph_name = $sectinfo->{name} || $textinfo->{name}; 
    $graph_name =~ s/[^\w\s]//g;
    $graph_name = join( '_', split( /\s+/, $graph_name ) );

	# Set default graph/node/edge attributes
    my %graph_attrs = (
        'bgcolor' => 'none',
    );
    unless( $textinfo->{direction} eq 'BI' ) {
        $graph_attrs{rankdir} = $textinfo->{direction};
    }
    my %node_attrs = (
        'fontsize' => 14,
        'fillcolor' => 'white',
        'style' => 'filled',
        'shape' => 'ellipse'
        );
    my %edge_attrs = ( 
        'arrowhead' => 'open',
        'color' => '#000000',
        'fontcolor' => '#000000',
        );

    my $dot = sprintf( "digraph %s {\n", $graph_name );
    $dot .= "\tgraph " . _dot_attr_string( \%graph_attrs ) . ";\n";
    $dot .= "\tnode " . _dot_attr_string( \%node_attrs ) . ";\n";

    # Horrible hack to render long graphs relatively straight
	my $STRAIGHTENHACK = $sectinfo->{endRank} > 50;
	if( $STRAIGHTENHACK ) {
		## HACK part 1
		$dot .= "\tsubgraph { rank=same \"__START__\" \"#SILENT#\" }\n";  
		$dot .= "\t\"#SILENT#\" [ shape=diamond,color=white,penwidth=0,label=\"\" ];"
	}
	
	# Now collect the reading nodes.
	my %used;  # Keep track of the readings that actually appear in the graph
	# Sort the readings by rank if we have ranks; this speeds layout.
	my $xpreading = sprintf('//g:node[contains(./g:data[@key="%s"]/text(), "READING")]', 
		$nodedata->{neolabel});
    foreach my $reading ( $xpc->findnodes($xpreading) ) {
		my $rid = $reading->getAttribute('id');
        $used{$rid} = 1;
        my $label = _nodeprop($nodedata, $xpc, $reading, 'text');
        unless( $label =~ /^[[:punct:]]+$/ ) {
	        $label .= '-' if _nodeprop($nodedata, $xpc, $reading, 'join_next');
    	    $label = "-$label" if _nodeprop($nodedata, $xpc, $reading, 'join_prior');
    	}
        $label =~ s/\"/\\\"/g;
		my $rattrs = { label => $label, id => $rid };
		$rattrs->{'fillcolor'} = '#b3f36d' if _nodeprop($nodedata, $xpc, $reading, 'is_common') ne 'false';
        $dot .= sprintf( "\t\"%s\" %s;\n", $rid, _dot_attr_string( $rattrs ) );
    }
    
	# See how many witnesses we have, for edge labeling purposes.
	my $xpwitness = sprintf('//g:node[contains(./g:data[@key="%s"]/text(), "WITNESS")]', 
		$nodedata->{neolabel});
	my @witnesses = $xpc->findnodes($xpwitness);
	my $majority = scalar(@witnesses) / 2 + 1;
	
	# Add the real edges. 
	my $xprelation = sprintf('//g:edge[./g:data[@key="%s"]/text() = "SEQUENCE"]', $edgedata->{neolabel});
    foreach my $edge ( $xpc->findnodes($xprelation) ) {
		my $sourceid = $edge->getAttribute('source');
		my $targetid = $edge->getAttribute('target');
		my $source = $xpc->findnodes(sprintf('//g:node[@id="%s"]', $sourceid))->[0];
		my $target = $xpc->findnodes(sprintf('//g:node[@id="%s"]', $targetid))->[0];
		my ($count, @pathwits) = _path_witnesses( $edgedata, $xpc, $edge, $majority );
		my $label =  join(', ', @pathwits);
		my $variables = { %edge_attrs, 'label' => $label };
		
		# Account for the rank gap if necessary
		my $rank0 = _nodeprop($nodedata, $xpc, $source, 'rank');
		my $rank1 = _nodeprop($nodedata, $xpc, $target, 'rank');
		if( defined $rank0 && defined $rank1 && $rank1 - $rank0 > 1 ) {
			$variables->{'minlen'} = $rank1 - $rank0;
		}
		
		# EXPERIMENTAL: make edge width reflect no. of witnesses
		my $extrawidth = $count * 0.2;
		$variables->{'penwidth'} = $extrawidth + 0.8; # gives 1 for a single wit

		my $varopts = _dot_attr_string( $variables );
		$dot .= sprintf( "\t\"%s\" -> \"%s\" %s;\n", 
			$sourceid, $targetid, $varopts );
     }
    
	# HACK part 2
	if( $STRAIGHTENHACK ) {
		$dot .= "\t\"__END__\" -> \"#SILENT#\" [ color=white,penwidth=0 ];\n";
	}       

    $dot .= "}\n";
	return $m->dot_to_svg($dot);
}

# Helper to throw a JSON exception
sub json_error {
	my( $c, $code, $errmsg ) = @_;
	$c->response->status( $code );
	$c->stash->{'result'} = { 'error' => $errmsg };
	$c->forward('View::JSON');
	return 0;
}

sub json_bool {
	return $_[0] ? JSON::true : JSON::false;
}

=encoding utf8

=head1 AUTHOR

Tara Andrews

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

1;
