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

sub find_user_by_id {
    my ($self, $userinfo, $c) = @_;

    my $id = $userinfo->{id};
    $id = $userinfo->{username}
        unless defined $id;

    croak "No user ID specified"
        unless defined $id;

    my $user_data = $self->get_model($c)->ajax(get => '/user/' . $id)
        or return undef;

    return $self->wrap($c, $id, $user_data);
}

sub wrap {
    my ($self, $c, $id, $user_data) = @_;
    return User->new(
        user_id => $id,
        user_data => $user_data,
    );
}

sub find_user {
    my ($self, $userinfo, $c) = @_;
    my $user = $self->find_user_by_id($userinfo, $c);
    return $user;
}

sub from_session {
    my ( $self, $c, $id ) = @_;
    return $self->find_user({ id => $id }, $c);
}

sub auto_create_user {
    my ($self, $userinfo, $c) = @_;

    my $id = $userinfo->{id};
    $id = $userinfo->{username}
        unless defined $id;

    die "TODO: Needs proper data layout for user to create";
    $self->get_model($c)->ajax(
        'put',
        '/user/' . $id,
        Content => to_json({
            id => $id,
        }),
    );
}

1;
