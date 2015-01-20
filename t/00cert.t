use Test::More;
use Data::Dumper;
use JSON::XS;
use Crypt::OpenSSL::X509;
use JSON::WebToken;

my $certs = decode_json(
    '{
     "4e52ce30245be85fb398b133a37d84392f4a2607": "-----BEGIN CERTIFICATE-----\nMIICITCCAYqgAwIBAgIIPnpYeis8e6kwDQYJKoZIhvcNAQEFBQAwNjE0MDIGA1UE\nAxMrZmVkZXJhdGVkLXNpZ25vbi5zeXN0ZW0uZ3NlcnZpY2VhY2NvdW50LmNvbTAe\nFw0xNTAxMTMyMzU4MzRaFw0xNTAxMTUxMjU4MzRaMDYxNDAyBgNVBAMTK2ZlZGVy\nYXRlZC1zaWdub24uc3lzdGVtLmdzZXJ2aWNlYWNjb3VudC5jb20wgZ8wDQYJKoZI\nhvcNAQEBBQADgY0AMIGJAoGBAJ/GN15iEorjqAoWY1oZbvKp9RbnlOpXgVobTmzG\nYe3Qts4TCW+kP417jExPIrIGXpeD26oidTQkXNg80TZHd7oNWqW33Y+8m3RwKDhj\nQ4Hoz91TN9ZqazqajYvrkxFq0ZljxQjomwh9kUf/ipxC6nbqrnS8ayh+/WjqiIF0\nuVstAgMBAAGjODA2MAwGA1UdEwEB/wQCMAAwDgYDVR0PAQH/BAQDAgeAMBYGA1Ud\nJQEB/wQMMAoGCCsGAQUFBwMCMA0GCSqGSIb3DQEBBQUAA4GBAAIUuZBEpxCU4Y/E\nSlbGsY32zN1N5PGoq1wQ0C8mlChWxiIMMsERxHLIHwpOGHNRY4qHmhSfRvTgeMGS\n743WzFTtioQu2s6AQPUVWlHIAVRr516LHRxrpTobqUc90njSnfLJKw4bVtMyK3Tp\nc9LCPd2zci1c/891YNcKqLwwTfGl\n-----END CERTIFICATE-----\n",
      "43cf2cccef654f2ba574950cf1f45e2ee0d98ec6": "-----BEGIN CERTIFICATE-----\nMIICITCCAYqgAwIBAgIIVsyLGZqrB+YwDQYJKoZIhvcNAQEFBQAwNjE0MDIGA1UE\nAxMrZmVkZXJhdGVkLXNpZ25vbi5zeXN0ZW0uZ3NlcnZpY2VhY2NvdW50LmNvbTAe\nFw0xNTAxMTQyMzQzMzRaFw0xNTAxMTYxMjQzMzRaMDYxNDAyBgNVBAMTK2ZlZGVy\nYXRlZC1zaWdub24uc3lzdGVtLmdzZXJ2aWNlYWNjb3VudC5jb20wgZ8wDQYJKoZI\nhvcNAQEBBQADgY0AMIGJAoGBAPWynyNM0k9+m+WiuBcL9QRPg0saCszBL3Rv5JR6\nIwyXkWKC8ZgcLKytxKmxh4pl9FjTKzOi7xXDpn1CSWS73A1xYPC+Vu+dg/6XGv13\nI2xodKhSHtJEUzIhbHzWQHejFvNKaA8ogZdJOZlzxuGzrpzVF+IiCQxkMBb+7bwI\n6i1DAgMBAAGjODA2MAwGA1UdEwEB/wQCMAAwDgYDVR0PAQH/BAQDAgeAMBYGA1Ud\nJQEB/wQMMAoGCCsGAQUFBwMCMA0GCSqGSIb3DQEBBQUAA4GBANC4dY8upszFHOgr\niB79gyIASH6OBCpjizbHBDSWe+EOIrTSlicDWzlQxKozo7OuvcN+RKVN1zbI9Mv2\n1hTJ6fIIKJtnoN5CaQVgISHXD3LyFt9ydpmi6Njo6H/dh/p/QMXlGjUqfl/q4glt\nFqkid+rQ52SamlXlxexRzK195Nsy\n-----END CERTIFICATE-----\n"
      }'
);

my $x509 = Crypt::OpenSSL::X509->new_from_string($certs->{'43cf2cccef654f2ba574950cf1f45e2ee0d98ec6'});

my $pubkey = $x509->pubkey;

warn $pubkey;

my $token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjQzY2YyY2NjZWY2NTRmMmJhNTc0OTUwY2YxZjQ1ZTJlZTBkOThlYzYifQ.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiYXpwIjoiNTc3NDQyMjI2MDkzLXBpMnVkNzk1ZzQ5aWJpcDc4Ymdmb2FiaGw0a2RyZ3VjLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwic3ViIjoiMTAzMjM5MDY1NjQ1ODM4MDQ1MzY2IiwiYXRfaGFzaCI6IlRzRDR6ek13VFp5bVV3RGk1UEY0V0EiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwib3BlbmlkX2lkIjoiaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9hY2NvdW50cy9vOC9pZD9pZD1BSXRPYXdsRlRscHVIR2NJNjd0cWFodHc3eE9vZDlWTldmZkItUWciLCJjaWQiOiI1Nzc0NDIyMjYwOTMtcGkydWQ3OTVnNDlpYmlwNzhiZ2ZvYWJobDRrZHJndWMuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJpZCI6IjEwMzIzOTA2NTY0NTgzODA0NTM2NiIsImVtYWlsIjoia29zdGFsYWVycmlldHRhQGdtYWlsLmNvbSIsImNvZGVfaGFzaCI6IkRGY0hRcEMyVVdsZWJPYXZMQ296eWciLCJhdWQiOiI1Nzc0NDIyMjYwOTMtcGkydWQ3OTVnNDlpYmlwNzhiZ2ZvYWJobDRrZHJndWMuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJ0b2tlbl9oYXNoIjoiVHNENHp6TXdUWnltVXdEaTVQRjRXQSIsInZlcmlmaWVkX2VtYWlsIjp0cnVlLCJjX2hhc2giOiJERmNIUXBDMlVXbGViT2F2TENvenlnIiwiaWF0IjoxNDIxMzIxNzM5LCJleHAiOjE0MjEzMjU2Mzl9.vv8nFH1U5VSV12hIzihwAVpOC6MSCfMPqq2CMNIQTf48HfSGe8pt40NEL2nkKJjA_KisUP0irU1CxXcvyYTtbrREF6glBS8PZAhV_HBegdBVrcE3jzMe7t4anTTNEdYrfHjREMC08JQDrsRDAY2HtIgTGGp3ITb1ObOpkkTr_7s';


my $tok = JSON::WebToken->decode($token,$pubkey);
is_deeply $tok,
{
  'email_verified' => JSON->true,
  'openid_id' => 'https://www.google.com/accounts/o8/id?id=AItOawlFTlpuHGcI67tqahtw7xOod9VNWffB-Qg',
  'email' => 'kostalaerrietta@gmail.com',
  'token_hash' => 'TsD4zzMwTZymUwDi5PF4WA',
  'code_hash' => 'DFcHQpC2UWlebOavLCozyg',
  'iat' => 1421321739,
  'azp' => '577442226093-pi2ud795g49ibip78bgfoabhl4kdrguc.apps.googleusercontent.com',
  'verified_email' => JSON->true,
  'aud' => '577442226093-pi2ud795g49ibip78bgfoabhl4kdrguc.apps.googleusercontent.com',
  'id' => '103239065645838045366',
  'exp' => 1421325639,
  'iss' => 'accounts.google.com',
  'c_hash' => 'DFcHQpC2UWlebOavLCozyg',
  'sub' => '103239065645838045366',
  'at_hash' => 'TsD4zzMwTZymUwDi5PF4WA',
  'cid' => '577442226093-pi2ud795g49ibip78bgfoabhl4kdrguc.apps.googleusercontent.com'
};


done_testing;
