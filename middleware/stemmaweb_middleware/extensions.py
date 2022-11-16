from authlib.integrations.flask_client import OAuth
from flask_cors import CORS
from flask_login import LoginManager

login_manager = LoginManager()
oauth = OAuth()
cors = CORS(app=None, resources={r"*": {"origins": "*"}})
