package stemmaweb::Model::Directory;

use base 'Catalyst::Model::Adaptor';
__PACKAGE__->config( class => 'stemmaweb::Neo4J::Directory' );