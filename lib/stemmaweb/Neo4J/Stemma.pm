package stemmaweb::Neo4J::Stemma;
use strict;
use warnings;
use Graph::Reader::Dot;
use LWP::UserAgent;
use Moose;

has baseurl => (
	is => 'ro',
	isa => 'Str'
);

has identifier => (
	is => 'ro',
	isa => 'Str',
	writer => '_set_identifier'
);

has is_undirected => (
	is => 'ro',
	isa => 'Boolean',
	writer => '_set_is_undirected'
);

has from_jobid => (
	is => 'ro',
	isa => 'Int',
	writer => '_set_from_jobid'
);

has svg => (
	is => 'ro',
	isa => 'Str',
	writer => '_set_svg'
);

sub BUILDARGS {
	my( $self, $tradition_repo, $id ) = @_;
	# We get passed a tradition URL and a name. Construct the init args.
	return {
		baseurl => sprintf("%s/stemma/%s", $tradition_repo, $id),
		identifier => $id
	};	
}

sub BUILD {
	my $self = shift;
	load( $self );
	## Generate the SVG too
	$self->_set_svg( $self->export('svg') );
}

sub alter {
	my( $self, $dot ) = @_;
		
}

sub root_graph {
	my( $self, $archetype ) = @_;
}

# svg, dot
sub export {
	my( $self, $format ) = @_;
	if( $format eq 'svg' ) {
		return $self->as_svg();
	} elsif( $format eq 'dot' ) {
		return $self->display_graph();
	}
}

# i.e. logical dot
# $params = {linesep => '|n'} or what have you
sub editable {
	my( $self, $params ) = @_;
	my $dot = $self->dot;
	if( $params && exists $params->{linesep} ) {
		my $sep = $params->{linesep};
		$dot =~ s/  /$sep/g;
	}
	return $dot;
}

## TODO port graphsvg (i.e. extended with layer wits) logic

sub as_svg {
    my( $self, $opts ) = @_;
    my $dot = $self->display_graph( $opts );
    my @cmd = ( '-Tsvg' );
    unshift( @cmd, $self->is_undirected ? 'neato' : 'dot' );
    my $svg;
    my $dotfile = File::Temp->new();
    binmode $dotfile, ':utf8';
    print $dotfile $dot;
    close $dotfile;
    push( @cmd, $dotfile->filename );
    run( \@cmd, ">", binary(), \$svg );
    return decode_utf8( $svg );
}

=head2 display_graph( $graph, $opts )

Returns a dot specification intended for display, according to the logical 
attributes of the witnesses.

=cut

sub display_graph {
    my( $self, $opts ) = @_;
    
    # Get our logical DOT into a Graph object
    my $graph = read_graph( $self->dot );
    
    # Get default and specified options
    my %graphopts = (
        # 'ratio' => 1,
        'bgcolor' => 'transparent',
    );
    my %nodeopts = (
                'fontsize' => 11,
                'style' => 'filled',
                'fillcolor' => 'white',
                'color' => 'white',
                'shape' => 'ellipse',   # Shape for the extant nodes
	);
	my %edgeopts = (
			'arrowhead' => 'none',
	);
	@graphopts{ keys %{$opts->{'graph'}} } = values %{$opts->{'graph'}} 
		if $opts->{'graph'};
	@nodeopts{ keys %{$opts->{'node'}} } = values %{$opts->{'node'}} 
		if $opts->{'node'};
	@edgeopts{ keys %{$opts->{'edge'}} } = values %{$opts->{'edge'}} 
		if $opts->{'edge'};
			
	my $gdecl = $graph->is_directed ? 'digraph' : 'graph';
	my $gname = $opts->{'name'} ? '"' . $opts->{'name'} . '"' : 'stemma';
	my @dotlines;
	push( @dotlines, "$gdecl $gname {" );
	## Print out the global attributes
	push( @dotlines, _make_dotline( 'graph', %graphopts ) ) if keys %graphopts;
	push( @dotlines, _make_dotline( 'edge', %edgeopts ) ) if keys %edgeopts;
	push( @dotlines, _make_dotline( 'node', %nodeopts ) ) if keys %nodeopts;

	# Add each of the nodes.
    foreach my $n ( $graph->vertices ) {
        my %vattr = ( 'id' => $n );  # Set the SVG element ID to the sigil itself
        if( $graph->has_vertex_attribute( $n, 'label' ) ) {
            $vattr{'label'} = $graph->get_vertex_attribute( $n, 'label' );
        }
        push( @dotlines, _make_dotline( $n, %vattr ) );
    }
    # Add each of our edges.
    foreach my $e ( $graph->edges ) {
        my( $from, $to ) = map { _dotquote( $_ ) } @$e;
        my $connector = $graph->is_directed ? '->' : '--';
        push( @dotlines, "  $from $connector $to;" );
    }
    push( @dotlines, '}' );
    
    return join( "\n", @dotlines );
}

sub _make_dotline {
	my( $obj, %attr ) = @_;
	my @pairs;
	foreach my $k ( keys %attr ) {
		my $v = _dotquote( $attr{$k} );
		push( @pairs, "$k=$v" );
	}
	return sprintf( "  %s [ %s ];", _dotquote( $obj ), join( ', ', @pairs ) );
}
        
sub _dotquote {
	my( $str ) = @_;
	return $str if $str =~ /^[A-Za-z0-9_]+$/;
	$str =~ s/\"/\\\"/g;
	$str = '"' . $str . '"';
	return $str;
}

sub _by_vertex {
	return $a->[0].$a->[1] cmp $b->[0].$b->[1];
}

__PACKAGE__->meta->make_immutable;

1;