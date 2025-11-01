from flask import Blueprint, jsonify, request
from ..models.user_api_keys import UserApiKeys
from ..models.settings import ADOBE_STOCK_SYSTEM_PROMPT
from ..models.user import db

user_settings_bp = Blueprint('user_settings', __name__)

def get_user_api_keys(user_id):
    """Get user's API keys or create default if not exists"""
    user_keys = UserApiKeys.query.filter_by(user_id=user_id).first()
    if not user_keys:
        # Create default user API keys with Adobe Stock system prompt
        user_keys = UserApiKeys(
            user_id=user_id,
            global_system_prompt=ADOBE_STOCK_SYSTEM_PROMPT
        )
        db.session.add(user_keys)
        db.session.commit()
    return user_keys

@user_settings_bp.route('/user-settings', methods=['GET'])
def get_user_settings():
    """Get user-specific settings with masked API keys"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        user_keys = get_user_api_keys(user_id)
        return jsonify(user_keys.to_dict_masked())
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_settings_bp.route('/user-settings/form', methods=['GET'])
def get_user_settings_form():
    """Get user-specific settings for form editing (unmasked API keys)"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        user_keys = get_user_api_keys(user_id)
        return jsonify(user_keys.to_dict())
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_settings_bp.route('/user-settings', methods=['POST'])
def update_user_settings():
    """Update user-specific settings"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        data = request.json
        user_keys = get_user_api_keys(user_id)
        
        # Update settings with provided data
        for key, value in data.items():
            if hasattr(user_keys, key):
                # Only update API keys if they are not empty (to preserve existing keys)
                if key.endswith('_api_key') and not value:
                    continue  # Skip empty API keys to preserve existing ones
                setattr(user_keys, key, value)
        
        db.session.add(user_keys)
        db.session.commit()
        return jsonify(user_keys.to_dict_masked())
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_settings_bp.route('/user-settings/api-keys', methods=['DELETE'])
def clear_user_api_keys():
    """Clear all API keys for the current user"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        user_keys = get_user_api_keys(user_id)
        
        # Clear all API keys
        user_keys.openai_api_key = None
        user_keys.gemini_api_key = None
        user_keys.groq_api_key = None
        user_keys.grok_api_key = None
        user_keys.llama_api_key = None
        user_keys.cohere_api_key = None
        user_keys.deepseek_api_key = None
        
        db.session.add(user_keys)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "All API keys cleared successfully"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@user_settings_bp.route('/user-settings/prompts/reset', methods=['POST'])
def reset_user_prompts():
    """Reset user's system prompts to default"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        user_keys = get_user_api_keys(user_id)
        
        # Reset global system prompt to Adobe Stock format and clear additional context
        user_keys.global_system_prompt = ADOBE_STOCK_SYSTEM_PROMPT
        user_keys.additional_context = ""
        
        db.session.add(user_keys)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "System prompts reset to default successfully"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
