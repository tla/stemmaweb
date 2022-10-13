from flask import Blueprint, render_template
from ..constants import TEMPLATE_FOLDER, STATIC_FOLDER

blueprint = Blueprint("public", __name__, static_folder=STATIC_FOLDER, template_folder=TEMPLATE_FOLDER)


@blueprint.route('/')
def index():
    return render_template('index.html', title='Stemmaweb')


@blueprint.route('/color_scheme')
def color_scheme():
    return render_template('color_scheme.html', title='Stemmaweb Color Scheme')
