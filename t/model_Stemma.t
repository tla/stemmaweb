#!/usr/bin/env perl
#
# Tests for stemmaweb::Model::Stemma.
#
# This file used to test Text::Tradition::Stemma, which the application no
# longer uses (or ships); it has been pointed at the model that replaced it.
# The fixtures it referred to for the broken and undirected cases are gone, so
# the undirected case uses besoin_stemweb.dot and the syntax-error case is
# built inline.

use strict;
use warnings;
use Test::More;
use Try::Tiny;

use stemmaweb::Model::Stemma;

BEGIN { use_ok('stemmaweb::Model::Stemma') }

# A directed stemma.
my $stemma = stemmaweb::Model::Stemma->new( dotfile => 't/data/florilegium.dot' );
is( ref $stemma, 'stemmaweb::Model::Stemma', 'Created a stemma from a dotfile' );
is( scalar $stemma->witnesses, 13, 'Found the correct number of extant witnesses' );
is( scalar $stemma->hypotheticals, 8, 'Found the correct number of hypotheticals' );
ok( $stemma->has_name, 'The stemma has a name' );
is( $stemma->name, 'stemma of Tomas', 'The name was read out of the dotfile' );
ok( !$stemma->is_undirected, 'The stemma is recorded as directed' );

{
    my $found_unicode_sigil;
    foreach my $h ( $stemma->hypotheticals ) {
        $found_unicode_sigil = 1 if $h eq "\x{3b1}";
    }
    ok( $found_unicode_sigil, 'Found a correctly encoded Unicode sigil' );
}

# An undirected graph, as produced by a distance-tree algorithm.
my $udstemma =
  stemmaweb::Model::Stemma->new( dotfile => 't/data/besoin_stemweb.dot' );
is( ref $udstemma, 'stemmaweb::Model::Stemma',
    'Created a stemma from an undirected dotfile' );
ok( $udstemma->is_undirected, 'The stemma is recorded as undirected' );
is( scalar $udstemma->witnesses, 13, 'Found the correct number of extant witnesses' );
is( scalar $udstemma->hypotheticals, 12, 'Found the correct number of hypotheticals' );
is( $udstemma->name, 'stemma', 'The undirected graph kept its name' );

# A dot specification with a syntax error is rejected.
{
    my $broken;
    my $error;
    try {
        $broken = stemmaweb::Model::Stemma->new( dot => 'digraph broken { A ->' );
    }
    catch {
        $error = $_;
    };
    ok( !$broken, 'A dot specification with a syntax error produces no stemma' );
    ok( $error, 'Creating it threw an error' );
}

# The rendering path used by the controllers.
{
    my $svg = $stemma->as_svg;
    like( $svg, qr/<svg/, 'The stemma can be rendered to SVG' );
}

# The editable representation round-trips through the model.
{
    my $editable = $stemma->editable;
    like( $editable, qr/^digraph/, 'The editable form is a digraph specification' );
    my $copy = stemmaweb::Model::Stemma->new( dot => $editable );
    is( scalar $copy->witnesses, scalar $stemma->witnesses,
        'Re-reading the editable form gives the same witnesses' );
}

# Re-orienting an undirected stemma.
{
    my $undirected =
      stemmaweb::Model::Stemma->new( dotfile => 't/data/besoin_stemweb.dot' );
    $undirected->root_graph('A');
    ok( !$undirected->is_undirected, 'Re-rooting made the stemma directed' );
    is( $undirected->name, 'stemma', 'Re-rooting kept the stemma name' );
}

done_testing();
