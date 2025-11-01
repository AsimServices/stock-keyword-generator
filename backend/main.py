import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.models.settings import Settings
from src.models.analysis_result import AnalysisResult
from src.routes.analysis import analysis_bp
from src.routes.settings import settings_bp
from src.routes.user_settings import user_settings_bp
from src.routes.text_analysis import text_analysis_bp
from src.routes.api_validation import api_validation_bp
from src.routes.video_analysis import video_analysis_bp
from src.routes.analysis_results import analysis_results_bp

# Get the absolute path to the 'dist' directory
base_dir = os.path.abspath(os.path.dirname(__file__))
dist_dir = os.path.join(base_dir, '..', 'frontend', 'dist')

app = Flask(__name__, 
           static_folder=dist_dir,
           template_folder=dist_dir)
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Enable CORS for all routes
CORS(app)

app.register_blueprint(analysis_bp, url_prefix='/api')
app.register_blueprint(settings_bp, url_prefix='/api')
app.register_blueprint(user_settings_bp, url_prefix='/api')
app.register_blueprint(text_analysis_bp, url_prefix='/api')
app.register_blueprint(video_analysis_bp, url_prefix='/api')
app.register_blueprint(api_validation_bp, url_prefix='/api')
app.register_blueprint(analysis_results_bp, url_prefix='/api')

# uncomment if you need to use database
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
with app.app_context():
    db.create_all()

# Serve static files for non-API routes only
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Skip API routes - let them be handled by blueprints
    if path.startswith('api/'):
        return "API route not found", 404
        
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    # Check if the requested path is a static file (CSS, JS, images, etc.)
    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        # For all other routes (React Router routes), serve index.html
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
