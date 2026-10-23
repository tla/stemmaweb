import secrets
from urllib.parse import urlencode

from flask import Flask, redirect, request

app = Flask(__name__)

# The GitHub account that "signs in" next. The e2e tests change it through
# /__test/identity; every authorization is bound to the identity current at that time.
DEFAULT_IDENTITY = {'login': 'e2e-octocat', 'email': 'octocat@example.org'}
identity = dict(DEFAULT_IDENTITY)
# code -> identity, access token -> identity
codes = {}
tokens = {}


# Check that we are up
@app.get('/')
def index():
    return 'OAuth mock is healthy'


# Test control: choose which GitHub account signs in (POST) or restore the default (DELETE)
@app.route('/__test/identity', methods=['POST', 'DELETE'])
def set_identity():
    global identity
    identity = dict(DEFAULT_IDENTITY)
    if request.method == 'POST':
        identity.update(request.get_json())
    return identity


# Mimic https://github.com/login/oauth/authorize: with no login page, "approve"
# immediately and send the browser back with a code and the caller's state
@app.get('/login/oauth/authorize')
def authorize():
    redirect_uri = request.args.get('redirect_uri')
    if not request.args.get('client_id') or not redirect_uri:
        return 'client_id and redirect_uri are required', 400
    code = secrets.token_hex(10)
    codes[code] = dict(identity)
    params = {'code': code, 'state': request.args.get('state', '')}
    return redirect(f'{redirect_uri}?{urlencode(params)}')


# Mimic https://github.com/login/oauth/access_token (code -> access token)
@app.post('/login/oauth/access_token')
def access_token():
    account = codes.pop(request.form.get('code'), None)
    if not request.form.get('client_id') or not request.form.get('client_secret'):
        return {'error': 'incorrect_client_credentials'}
    if account is None:
        return {'error': 'bad_verification_code'}
    token = 'gho_' + secrets.token_hex(10)
    tokens[token] = account
    return {'access_token': token, 'token_type': 'bearer', 'scope': 'user:email'}


def current_account():
    header = request.headers.get('Authorization', '')
    return tokens.get(header.removeprefix('Bearer '))


# Mimic https://api.github.com/user
@app.get('/user')
def user():
    account = current_account()
    if account is None:
        return {'message': 'Bad credentials'}, 401
    # GitHub leaves "email" null when the user keeps it private
    return {'login': account['login'], 'id': 1, 'email': None}


# Mimic https://api.github.com/user/emails
@app.get('/user/emails')
def emails():
    account = current_account()
    if account is None:
        return {'message': 'Bad credentials'}, 401
    return [
        {
            'email': f"1+{account['login']}@users.noreply.github.com",
            'primary': False,
            'verified': True,
            'visibility': None
        },
        {
            'email': account['email'],
            'primary': True,
            'verified': True,
            'visibility': 'private'
        }
    ]
