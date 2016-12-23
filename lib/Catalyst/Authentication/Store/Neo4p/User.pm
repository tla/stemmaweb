use strictures 2;

package Catalyst::Authentication::Store::Neo4p::User;
use Moose;
use Carp qw( croak );

use namespace::clean;

has user_id => (is => 'ro');
has user_data => (is => 'ro');

has [qw(auth_realm store)] => (
    is => 'rw',
);

# auth user object and backend user object are the same
sub get_object { shift }

sub email {
    my ($self) = @_;
    return $self->user_data->{email};
}

sub id {
    my ($self) = @_;
    return $self->user_id;
}

sub roles {
    my ($self) = @_;
    return $self->user_data->{role};
}

sub check_password {
    my ($self, $password) = @_;
    return $self->user_data->{active}
        && $self->user_data->{passphrase} eq $password;
}

my %supports = (
    password => 'self_check',
    roles   => ["roles"],
    session => 1,
);

sub supports {
    my ($self, @spec) = @_;
 
    my $cursor = \%supports;
 
    return 1 if @spec == 1 and $self->can($spec[0]);
 
    # XXX is this correct?
    for (@spec) {
        return if ref($cursor) ne "HASH";
        $cursor = $cursor->{$_};
    }
 
    if (ref $cursor) {
        die "Bad feature spec: '@spec'" unless ref $cursor eq "ARRAY";
        foreach my $key (@$cursor) {
            return undef unless $self->can($key);
        }
        return 1;
    }
    else {
        return $cursor;
    }
}

sub for_session {
    my ($self) = @_;
    return $self->user_id;
}

1;
