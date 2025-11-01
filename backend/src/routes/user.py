from flask import Blueprint, jsonify, request
from ..models.user import User, db

user_bp = Blueprint('user', __name__)

# SECURITY NOTICE: All user endpoints have been removed for security reasons
# The application uses Clerk for authentication and user management
# All user-specific data is handled through user_settings endpoints with proper X-User-ID validation
# 
# REMOVED ENDPOINTS:
# - GET /users (exposed all users)
# - POST /users (no authentication)
# - GET /users/<id> (no authentication) 
# - PUT /users/<id> (no authentication)
# - DELETE /users/<id> (no authentication)
#
# These endpoints were not used by the application and presented security risks
# User management is handled by Clerk authentication service
