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

sub _request {
    my ($self, $c, $method, $path, @args) = @_;

    my $base = $c->model($self->model_name)->tradition_repo;

    my $ua = LWP::UserAgent->new;
    my $res = $ua->$method($base.$path, @args);

    die sprintf "Remote Neo4J returned status %s for user",
        $res->code,
        unless $res->is_success;

    return $res->decoded_content;
}
 
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

    my $user_data = $self->_request($c, get => 'user/'.$id.'/')
        or return undef;
    $user_data = decode_json($user_data);

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

    $self->_request($c, put => '/user/'.$id.'/',
        'Content-Type' => 'application/json',
        'Content' => to_json({
            role => 'user',
            email => $id,
            passphrase => $userinfo->{password},
        }),
    );
}

1;
