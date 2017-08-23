use strictures 2;

package Catalyst::Authentication::Store::Neo4p;
use Moose;
use JSON qw/ decode_json to_json /;

use aliased 'Catalyst::Authentication::Store::Neo4p::User';
use Carp qw( croak );

use namespace::clean;

sub BUILDARGS {
    my ($class, $conf, $app, $realm) = @_;
 
    return {
        app => $app,
        realm => $realm,
        %$conf,
    }
}
 
has realm => (
    is => "ro",
);

has model_name => (
    isa => "Str",
    is  => "ro",
    required => 1,
    default => 'Directory',
);

sub get_model {
    my ( $self, $c ) = @_;
 
    $c->model($self->model_name);
}

sub find_user {
    my ($self, $userinfo, $c) = @_;
	my $user = User->new(user_data => $userinfo);
    return $self->find_user_by_id($user->id, $c);
}

sub find_user_by_id {
    my ($self, $userid, $c) = @_;

	# TODO return Catalyst error, don't croak
    croak "No user ID specified"
        unless defined $userid;

	my $user_data = $c->model($self->model_name)->ajax('get', '/user/'.$userid.'/');
	return $user_data ? $self->wrap($c, $userid, $user_data) : undef;
}

sub wrap {
    my ($self, $c, $id, $user_data) = @_;
    return User->new(
        user_id => $id,
        user_data => $user_data,
    );
}

sub from_session {
    my ( $self, $c, $id ) = @_;
    return $self->find_user_by_id($id, $c);
}

sub auto_create_user {
    my ($self, $userinfo, $c) = @_;
	
	my $new_user = User->new(
		user_data => $userinfo
	);

	$c->model($self->model_name)->ajax('put', '/user/' . $new_user->id . '/',
        'Content-Type' => 'application/json',
        'Content' => to_json($new_user->to_hash)
    );
}

1;
