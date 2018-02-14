use strictures 2;

package Catalyst::Authentication::Store::Neo4p::User;
use Moose;
use Carp qw( croak );
use Digest;
use URI::Escape;

use namespace::clean;

has user_id => (is => 'ro');
has user_data => (is => 'ro');

has [qw(auth_realm store)] => (
    is => 'rw',
);

around BUILDARGS => sub {
    my $orig = shift;
    my $class = shift;
    my $args;
    if( @_ == 1 ) {
        $args = shift;
    } else {
        $args = { @_ };
    }

    my $udata = $args->{user_data};
    if( exists $udata->{sub} ) {
        # It's a Google login. Extract id and email from the passed info.
        $args->{user_id} = $udata->{sub};
        $args->{user_data} = {
            email => $udata->{email},
            role => 'user'
        };
    } elsif( exists $udata->{url} ) {
        # It's an OpenID login. Extract id; there is no email.
        $args->{user_id} = uri_escape($udata->{url});
        $args->{user_data} = {
            role => 'user'
        };
        if( exists $udata->{display} ) {
            $args->{user_data}->{email} = $udata->{display};
        }
    } elsif( exists $udata->{username} && !exists $args->{user_id} ) {
        # It's a username (and maybe password) from the registration form. Shift
        # them around appropriately and encrypt the password.
        my $email = delete $udata->{username};
        $args->{user_id} = $email;
        $udata->{email} = $email;
        if (exists $udata->{password}) {
            my $ctx = Digest->new('SHA-256');
            $ctx->add(delete $udata->{password});
            $udata->{passphrase} = $ctx->b64digest();
        }
    }
    # The user data will look somewhat different if it comes from Google or OpenID.
    $class->$orig( $args );
};

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

sub is_admin {
    my $self = shift;
    return $self->user_data->{role} eq 'admin';
}

sub get {
    my ($self, $arg) = @_;
    if ($self->can($arg)) {
        return $self->$arg;
    } elsif ($arg eq 'password') {
        return $self->user_data->{passphrase};
    }
    return undef;
}

sub to_hash {
    my $self = shift;
    my $ret = {
        id => $self->id,
        email => $self->email,
        role => $self->roles || 'user',
    };
    $ret->{active} = JSON::false
        if exists $self->user_data->{'active'} && !$self->user_data->{'active'};
    $ret->{passphrase} = $self->user_data->{passphrase}
        if exists $self->user_data->{passphrase};
    return $ret;
}

my %supports = (
    password => 'hashed',
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
