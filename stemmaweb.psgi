use strict;
use warnings;

use lib '/var/www/catalyst/stemmaweb/lib';
use stemmaweb;
use Plack::Builder;

builder {
	enable( "Plack::Middleware::ReverseProxyPath" );
	my $app = stemmaweb->apply_default_middlewares(stemmaweb->psgi_app);
	$app;
}
