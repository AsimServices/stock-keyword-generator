from flask_sqlalchemy import SQLAlchemy
from .user import db

class UserApiKeys(db.Model):
    """User-specific API keys for AI services"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False, unique=True)  # Clerk user ID
    openai_api_key = db.Column(db.Text, nullable=True)
    gemini_api_key = db.Column(db.Text, nullable=True)
    groq_api_key = db.Column(db.Text, nullable=True)
    grok_api_key = db.Column(db.Text, nullable=True)
    llama_api_key = db.Column(db.Text, nullable=True)
    cohere_api_key = db.Column(db.Text, nullable=True)
    deepseek_api_key = db.Column(db.Text, nullable=True)
    
    # Selected models for each service
    openai_model = db.Column(db.Text, default="gpt-5")
    gemini_model = db.Column(db.Text, default="gemini-2.5-pro")
    groq_model = db.Column(db.Text, default="meta-llama/llama-4-maverick-17b-128e-instruct")
    grok_model = db.Column(db.Text, default="grok-4")
    llama_model = db.Column(db.Text, default="llama-4-maverick-17b-128e")
    cohere_model = db.Column(db.Text, default="command-r-plus")
    deepseek_model = db.Column(db.Text, default="deepseek-vl-7b-chat")
    
    # User-specific system prompt and context
    global_system_prompt = db.Column(db.Text, nullable=True)
    additional_context = db.Column(db.Text, default="")
    
    def __repr__(self):
        return f'<UserApiKeys {self.user_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'openai_api_key': self.openai_api_key,
            'gemini_api_key': self.gemini_api_key,
            'groq_api_key': self.groq_api_key,
            'grok_api_key': self.grok_api_key,
            'llama_api_key': self.llama_api_key,
            'cohere_api_key': self.cohere_api_key,
            'deepseek_api_key': self.deepseek_api_key,
            'openai_model': self.openai_model,
            'gemini_model': self.gemini_model,
            'groq_model': self.groq_model,
            'grok_model': self.grok_model,
            'llama_model': self.llama_model,
            'cohere_model': self.cohere_model,
            'deepseek_model': self.deepseek_model,
            'global_system_prompt': self.global_system_prompt,
            'additional_context': self.additional_context
        }
    
    def to_dict_masked(self):
        """Return API keys with masking for security"""
        def mask_api_key(key):
            if not key:
                return ''
            if len(key) <= 8:
                return '*' * len(key)
            return key[:4] + '*' * (len(key) - 8) + key[-4:]
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'openai_api_key': mask_api_key(self.openai_api_key),
            'gemini_api_key': mask_api_key(self.gemini_api_key),
            'groq_api_key': mask_api_key(self.groq_api_key),
            'grok_api_key': mask_api_key(self.grok_api_key),
            'llama_api_key': mask_api_key(self.llama_api_key),
            'cohere_api_key': mask_api_key(self.cohere_api_key),
            'deepseek_api_key': mask_api_key(self.deepseek_api_key),
            'openai_model': self.openai_model,
            'gemini_model': self.gemini_model,
            'groq_model': self.groq_model,
            'grok_model': self.grok_model,
            'llama_model': self.llama_model,
            'cohere_model': self.cohere_model,
            'deepseek_model': self.deepseek_model,
            'global_system_prompt': self.global_system_prompt,
            'additional_context': self.additional_context
        }
