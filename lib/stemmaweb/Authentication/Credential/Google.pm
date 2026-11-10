package stemmaweb::Authentication::Credential::Google;

use Crypt::OpenSSL::X509;
use JSON::WebToken;
use Crypt::OpenSSL::RSA;
use IO::All;
use JSON::MaybeXS;
use MIME::Base64;
use LWP::Simple qw(get);
use Date::Parse qw(str2time);

use warnings;
use strict;
use strictures 1;

=head1 NAME

stemmaweb::Authentication::Google - JSON Web Token handler for Google tokens.

=head1 DESCRIPTION

Retrieves Google's public certificates, and then retrieves the key from the
cert using L<Crypt::OpenSSL::X509>. Finally, uses the pubkey to decrypt a
Google token using L<JSON::WebToken>.

=cut

# JSON::WebToken's RSA signing class never asks for PKCS#1 v1.5 padding, which
# Google's RS256 tokens use. Crypt::OpenSSL::RSA 0.35 and later default to PSS
# unless it is requested, so every Google token failed with "Invalid signature".
# Use our own class for the RSA algorithms that sets the padding explicitly.
# (It sets hash and padding itself, so it works on old and new versions alike.)
{
    package stemmaweb::Authentication::Credential::Google::RSA;
    use parent 'JSON::WebToken::Crypt::RSA';

    my %HASH_METHOD = (
        RS256 => 'use_sha256_hash',
        RS384 => 'use_sha384_hash',
        RS512 => 'use_sha512_hash',
    );

    sub sign {
        my ($class, $algorithm, $message, $key) = @_;
        my $rsa = Crypt::OpenSSL::RSA->new_private_key($key);
        my $method = $HASH_METHOD{$algorithm};
        $rsa->$method;
        $rsa->use_pkcs1_padding;
        return $rsa->sign($message);
    }

    sub verify {
        my ($class, $algorithm, $message, $key, $signature) = @_;
        my $rsa = Crypt::OpenSSL::RSA->new_public_key($key);
        my $method = $HASH_METHOD{$algorithm};
        $rsa->$method;
        $rsa->use_pkcs1_padding;
        return $rsa->verify($message, $signature) ? 1 : 0;
    }
}

# Must happen before JSON::WebToken first resolves these algorithms
$JSON::WebToken::ALGORITHM_MAP->{$_} =
    '+stemmaweb::Authentication::Credential::Google::RSA'
    for qw(RS256 RS384 RS512);

sub new {
    my ($class, $config, $app, $realm) = @_;
    $class = ref $class || $class;

    my $self = {
        _config => $config,
        _app    => $app,
        _realm  => $realm,
    };

    bless $self, $class;
}

sub authenticate {
    my ($self, $c, $realm, $authinfo) = @_;

    my $id_token = $authinfo->{id_token};
    $id_token ||=
        $c->req->method eq 'GET'
      ? $c->req->query_params->{id_token}
      : $c->req->body_params->{id_token};

    if (!$id_token) {
        Catalyst::Exception->throw("id_token not specified.");
    }

    my $userinfo = $self->decode($id_token);
    my $email    = $userinfo->{email};
    my $sub      = $userinfo->{sub};

    unless (exists $userinfo->{email}) {
        Catalyst::Exception->throw(
            'No email address associated with login request!');
    }

    if (!$sub) {
        Catalyst::Exception->throw(
            'Could not retrieve sub from token! Is the token correct?');
    }

    return $realm->find_user($userinfo, $c);
}

=head1 METHODS

=head2 retrieve_certs

Retrieves a pair of JSON-encoded certificates from the given URL (defaults to
Google's public cert url), and returns the decoded JSON object.

=head3 ARGUMENTS

=over

=item url

Optional. Location where certificates are located.
Defaults to https://www.googleapis.com/oauth2/v1/certs.

=back

=head3 RETURNS

Decoded JSON object containing certificates.

=cut

sub retrieve_certs {
    my ($self, $url) = @_;

    my $c      = $self->{_app};
    my $cached = 0;
    my $certs;
    my $cache;

    $url ||=
      ($c->config->{'Authentication::Credential::Google'}->{public_cert_url}
          || 'https://www.googleapis.com/oauth2/v1/certs');

    if (   ($c->registered_plugins('Catalyst::Plugin::Cache'))
        && ($cache = $c->cache))
    {
        if ($certs = $cache->get('certs')) {
            $certs = decode_json($certs);

            foreach my $key (keys %$certs) {
                my $cert = $certs->{$key};
                my $x509 = Crypt::OpenSSL::X509->new_from_string($cert);

                if ($self->is_cert_expired($x509)) {
                    $cached = 0;
                    last;
                } else {
                    $cached = 1;
                }
            }
        }
    }

    if (!$cached) {
        my $certs_encoded = get($url);

        if ($cache) {
            $cache->set('certs', $certs_encoded);
        }

        $certs = decode_json($certs_encoded);
    }

    return $certs;
}

=head2 get_key_from_cert

Given a pair of certificates $certs (defaults to L</retrieve_certs>),
this function returns the public key of the cert identified by $kid.

=head3 ARGUMENTS

=over

=item $kid

Required. Index of the certificate hash $hash where the cert we want is
located.

=item $certs

Optional. A (hashref) pair of certificates.
It's retrieved using L</retrieve_certs> if not given,
or if the pair is expired.

=back

=head3 RETURNS

Public key of certificate.

=cut

sub get_key_from_cert {
    my ($self, $kid, $certs) = @_;

    $certs ||= $self->retrieve_certs;
    my $cert = $certs->{$kid};
    my $x509 = Crypt::OpenSSL::X509->new_from_string($cert);

    if ($self->is_cert_expired($x509)) {

        # If we ended up here, we were given
        # an old $certs string from the user.
        # Let's force getting another.
        return $self->get_key_from_cert($kid);
    }

    return $x509->pubkey;
}

=head2 is_cert_expired

Returns if a given L<Crypt::OpenSSL::X509> certificate is expired.

=cut

sub is_cert_expired {
    my ($self, $x509) = @_;

    my $expiry = str2time($x509->notAfter);

    return time > $expiry;
}

=head2 decode

Returns the decoded information contained in a user's token.

=head3 ARGUMENTS

=over

=item $token

Required. The user's token from Google+.

=item $pubkey

Optional. A public key string with which to decode the token.
If not given, the public key will be retrieved from $certs.

=item $certs

Optional. A pair of public key certs retrieved from Google.
If not given, or if the certificates have expired, a new
pair of certificates is retrieved.

=back

=head2 RETURNS

Decoded JSON object from the decrypted token.

=cut

sub decode {
    my ($self, $token, $certs, $pubkey) = @_;

    if (!$pubkey) {
        my $details = decode_json(
            MIME::Base64::decode_base64(
                substr($token, 0, CORE::index($token, '.'))
            )
        );

        my $kid = $details->{kid};
        $pubkey = $self->get_key_from_cert($kid, $certs);
    }

    return JSON::WebToken->decode($token, $pubkey);
}

=head1 AUTHOR

Errietta Kostala <e.kostala@shadowcat.co.uk>

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

1;
