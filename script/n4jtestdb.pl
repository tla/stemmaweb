#!/usr/bin/env perl

use strict;
use warnings;
use feature "say";

use FindBin;
use lib ("$FindBin::Bin/../t/lib");

use stemmaweb::Test::DB;
my $created = stemmaweb::Test::DB::test_data("$FindBin::Bin/../t/data");
say "Tradition IDs created for testing:";
foreach my $key (keys %$created) {
    foreach my $tid (@{$created->{$key}}) {
        say " - $tid ($key)";
    }
}
