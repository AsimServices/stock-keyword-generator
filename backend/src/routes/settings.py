from flask import Blueprint, jsonify, request
from ..models.settings import Settings, ADOBE_STOCK_SYSTEM_PROMPT
from ..models.user import db

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/settings', methods=['GET'])
def get_settings():
    settings = Settings.query.first()
    if not settings:
        # Create default settings
        settings = Settings()
        db.session.add(settings)
        db.session.commit()
    
    # Convert to dict and include API key status
    settings_dict = settings.to_dict()
    
    # Add API key availability flags (masking actual keys for security)
    def mask_api_key(key):
        if not key:
            return ''
        if len(key) <= 8:
            return '*' * len(key)
        return key[:4] + '*' * (len(key) - 8) + key[-4:]
    
    settings_dict.update({
        'openai_api_key': mask_api_key(settings.openai_api_key),
        'gemini_api_key': mask_api_key(settings.gemini_api_key),
        'groq_api_key': mask_api_key(settings.groq_api_key),
        'grok_api_key': mask_api_key(settings.grok_api_key),
        'llama_api_key': mask_api_key(settings.llama_api_key),
        'cohere_api_key': mask_api_key(settings.cohere_api_key),
        'deepseek_api_key': mask_api_key(settings.deepseek_api_key)
    })
    
    return jsonify(settings_dict)

@settings_bp.route('/settings', methods=['POST'])
def update_settings():
    data = request.json
    settings = Settings.query.first()
    if not settings:
        settings = Settings()
    
    # Update settings with provided data
    for key, value in data.items():
        if hasattr(settings, key):
            # Only update API keys if they are not empty (to preserve existing keys)
            if key.endswith('_api_key') and not value:
                continue  # Skip empty API keys to preserve existing ones
            setattr(settings, key, value)
    
    db.session.add(settings)
    db.session.commit()
    return jsonify(settings.to_dict())

@settings_bp.route('/settings/api-keys', methods=['DELETE'])
def clear_api_keys():
    """Clear all API keys"""
    try:
        settings = Settings.query.first()
        if not settings:
            settings = Settings()
        
        # Clear all API keys
        settings.openai_api_key = None
        settings.gemini_api_key = None
        settings.groq_api_key = None
        settings.grok_api_key = None
        settings.llama_api_key = None
        settings.cohere_api_key = None
        settings.deepseek_api_key = None
        
        db.session.add(settings)
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

@settings_bp.route('/settings/prompts/reset', methods=['POST'])
def reset_prompts():
    """Reset all system prompts to default"""
    try:
        settings = Settings.query.first()
        if not settings:
            settings = Settings()
        
        # Reset global system prompt to Adobe Stock format and clear additional context
        settings.global_system_prompt = ADOBE_STOCK_SYSTEM_PROMPT
        settings.additional_context = ""
        
        
        db.session.add(settings)
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
