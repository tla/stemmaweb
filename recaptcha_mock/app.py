from flask import Flask, request

app = Flask(__name__)

# Tokens the e2e tests can send; anything else is rejected like an unknown token.
HUMAN_TOKEN = 'e2e-human-token'
BOT_TOKEN = 'e2e-bot-token'


# Check that we are up
@app.get('/')
def index():
    return 'reCAPTCHA mock is healthy'


# Mimic https://www.google.com/recaptcha/api/siteverify for reCAPTCHA v3
@app.post('/recaptcha/api/siteverify')
def siteverify():
    token = request.form.get('response')
    if not request.form.get('secret'):
        return {'success': False, 'error-codes': ['missing-input-secret']}
    if not token:
        return {'success': False, 'error-codes': ['missing-input-response']}
    if token == HUMAN_TOKEN:
        score = 0.9
    elif token == BOT_TOKEN:
        score = 0.1
    else:
        return {'success': False, 'error-codes': ['invalid-input-response']}
    return {
        'success': True,
        'score': score,
        'action': request.form.get('action', 'login'),
        'challenge_ts': '2024-01-01T00:00:00Z',
        'hostname': 'stemmaweb'
    }
