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

@EXPORT = qw/ load_tradition load_old_tradition load_stemma json_error json_bool /;

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
	my $textinfo;
	try {
		$textinfo = $c->model('Directory')->ajax('get', "/tradition/$textid");
	} catch( stemmaweb::Error $e ) {
			return json_error( $c, $e->status, $e->message );
	}
	my $ok = _check_permission( $c, $textinfo );
	return( $textinfo, $ok );
}

sub load_old_tradition {
	my ($c, $textid) = @_;
	my $graphml;
	$graphml = $c->model('Directory')->ajax('get', "/tradition/$textid/stemmaweb");
	return Text::Tradition->new(input => 'self', string => $graphml);
}

sub load_stemma {
	my( $stemmadata ) = @_;
	return Text::Tradition::Stemma->new(
		dot => $stemmadata->{dot},
		is_undirected => $stemmadata->{is_undirected} == JSON::true,
		identifier => $stemmadata->{identifier}
	);
}

# Get (and parse) the GraphML directly, to turn it into the sort of graph we need for the
# relationship mapper.
sub generate_svg {
	my( $c, $textid, $sectionid ) = @_;
	my( $graph, $textinfo );
	try {
		my $graphml = $c->model('Directory')->ajax('get', "/tradition/$textid/section/$sectionid/graphml");
		my $parser = XML::LibXML->new();
		$graph = $parser->parse_string( $graphml )->documentElement();
		$textinfo = $c->model('Directory')->ajax('get', "/tradition/$textid");
	} catch (stemmaweb::Error $e) {
		return json_error( $c, $e->status, $e->message );
	} catch {
		return json_error( $c, 500, "Error on parse of tradition XML");
	}
	
	my $xpc = XML::LibXML::XPathContext->new( $graphml );
	$xpc->registerNs( 'g', 'http://graphml.graphdrawing.org/xmlns' );
	
    # First get the key mappings for node/edge properties
    foreach my $k ( $xpc->findnodes( '//g:key' ) ) {
        # Each key has a 'for' attribute to say whether it is for graph,
        # node, or edge.
        my $keyid = $k->getAttribute( 'id' );
        my $keyname = $k->getAttribute( 'attr.name' );

		# Keep track of the XML identifiers for the data carried
		# in each node element.
		my $dtype = $k->getAttribute( 'for' );
		if( $dtype eq 'node' ) {
            $nodedata->{$keyid} = $keyname; 
        } else {
            $edgedata->{$keyid} = $keyname;
        }
    }
		
    my $graph_name = $textinfo->{name};
    $graph_name =~ s/[^\w\s]//g;
    $graph_name = join( '_', split( /\s+/, $graph_name ) );

    my %graph_attrs = (
        'bgcolor' => 'none',
    );
    unless( $textinfo->{direction} eq 'BI' ) {
        $graph_attrs{rankdir} = $self->direction;
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

    # Output substitute start/end readings if necessary
	if( $STRAIGHTENHACK ) {
		## HACK part 1
		$dot .= "\tsubgraph { rank=same \"__START__\" \"#SILENT#\" }\n";  
		$dot .= "\t\"#SILENT#\" [ shape=diamond,color=white,penwidth=0,label=\"\" ];"
	}
	
	# Now collect the reading nodes.
	my %used;  # Keep track of the readings that actually appear in the graph
	# Sort the readings by rank if we have ranks; this speeds layout.
	my @all_readings = $self->end->has_rank 
		? sort { $a->rank <=> $b->rank } $self->readings
		: $self->readings;
	# TODO Refrain from outputting lacuna nodes - just grey out the edges.
    foreach my $reading ( @all_readings ) {
    	# Only output readings within our rank range.
    	next if $startrank && $reading->rank < $startrank;
    	next if $endrank && $reading->rank > $endrank;
        $used{$reading->id} = 1;
        # Need not output nodes without separate labels
        next if $reading->id eq $reading->text;
        my $rattrs;
        my $label = $reading->text;
        unless( $label =~ /^[[:punct:]]+$/ ) {
	        $label .= '-' if $reading->join_next;
    	    $label = "-$label" if $reading->join_prior;
    	}
        $label =~ s/\"/\\\"/g;
		$rattrs->{'label'} = $label;
		$rattrs->{'id'} = $reading->id;
		$rattrs->{'fillcolor'} = '#b3f36d' if $reading->is_common && $color_common;
        $dot .= sprintf( "\t\"%s\" %s;\n", $reading->id, _dot_attr_string( $rattrs ) );
    }
    
	# Add the real edges. 
    my @edges = $self->paths;
	my( %substart, %subend );
    foreach my $edge ( @edges ) {
    	# Do we need to output this edge?
    	if( $used{$edge->[0]} && $used{$edge->[1]} ) {
    		my $label = $self->_path_display_label( $opts,
    			$self->path_witnesses( $edge ) );
			my $variables = { %edge_attrs, 'label' => $label };
			
			# Account for the rank gap if necessary
			my $rank0 = $self->reading( $edge->[0] )->rank
				if $self->reading( $edge->[0] )->has_rank;
			my $rank1 = $self->reading( $edge->[1] )->rank
				if $self->reading( $edge->[1] )->has_rank;
			if( defined $rank0 && defined $rank1 && $rank1 - $rank0 > 1 ) {
				$variables->{'minlen'} = $rank1 - $rank0;
			}
			
			# EXPERIMENTAL: make edge width reflect no. of witnesses
			my $extrawidth = scalar( $self->path_witnesses( $edge ) ) * 0.2;
			$variables->{'penwidth'} = $extrawidth + 0.8; # gives 1 for a single wit

			my $varopts = _dot_attr_string( $variables );
			$dot .= sprintf( "\t\"%s\" -> \"%s\" %s;\n", 
				$edge->[0], $edge->[1], $varopts );
        } elsif( $used{$edge->[0]} ) {
        	$subend{$edge->[0]} = $edge->[1];
        } elsif( $used{$edge->[1]} ) {
        	$substart{$edge->[1]} = $edge->[0];
        }
    }
    
	# HACK part 2
	if( $STRAIGHTENHACK ) {
		my $endlabel = $endrank ? '__SUBEND__' : '__END__';
		$dot .= "\t\"$endlabel\" -> \"#SILENT#\" [ color=white,penwidth=0 ];\n";
	}       

    $dot .= "}\n";
    return $dot;
		

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
