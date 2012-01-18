use strict;
use warnings;

use stemmaweb;

my $app = stemmaweb->apply_default_middlewares(stemmaweb->psgi_app);
$app;

