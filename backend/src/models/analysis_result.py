from datetime import datetime
import json
from .user import db

class AnalysisResult(db.Model):
    __tablename__ = 'analysis_results'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False, index=True)  # Clerk user ID
    result_id = db.Column(db.String(255), nullable=False, unique=True)  # Frontend-generated ID
    filename = db.Column(db.String(500), nullable=False)
    analysis_type = db.Column(db.String(50), nullable=False)  # 'image', 'video', 'text'
    service = db.Column(db.String(50), nullable=False)  # 'openai', 'gemini', 'groq', etc.
    
    # Analysis results
    title = db.Column(db.Text)
    keywords = db.Column(db.Text)  # JSON string of keywords array
    category = db.Column(db.String(100))
    releases = db.Column(db.String(100))
    raw_response = db.Column(db.Text)
    
    # Metadata
    status = db.Column(db.String(20), default='completed')  # 'completed', 'error', 'processing'
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<AnalysisResult {self.result_id} - {self.analysis_type} by {self.user_id}>'
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.result_id,
            'filename': self.filename,
            'type': self.analysis_type,
            'result': {
                'title': self.title,
                'keywords': json.loads(self.keywords) if self.keywords else [],
                'category': self.category,
                'releases': self.releases,
                'raw_response': self.raw_response
            },
            'service': self.service,
            'timestamp': self.created_at.isoformat(),
            'status': self.status,
            'error': self.error_message
        }
    
    @classmethod
    def create_from_frontend_result(cls, user_id, frontend_result):
        """Create AnalysisResult from frontend result object"""
        # Handle both successful and error results
        if frontend_result.get('status') == 'error':
            return cls(
                user_id=user_id,
                result_id=frontend_result['id'],
                filename=frontend_result['filename'],
                analysis_type=frontend_result['type'],
                service=frontend_result['service'],
                title=None,
                keywords=None,
                category=None,
                releases=None,
                raw_response=None,
                status='error',
                error_message=frontend_result.get('error', 'Unknown error')
            )
        else:
            return cls(
                user_id=user_id,
                result_id=frontend_result['id'],
                filename=frontend_result['filename'],
                analysis_type=frontend_result['type'],
                service=frontend_result['service'],
                title=frontend_result['result']['title'],
                keywords=json.dumps(frontend_result['result']['keywords']),
                category=frontend_result['result']['category'],
                releases=frontend_result['result']['releases'],
                raw_response=frontend_result['result']['raw_response'],
                status='completed'
            )
    
    @classmethod
    def get_user_results(cls, user_id, analysis_type=None):
        """Get all results for a user, optionally filtered by type"""
        query = cls.query.filter_by(user_id=user_id)
        if analysis_type:
            query = query.filter_by(analysis_type=analysis_type)
        return query.order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_user_result_by_id(cls, user_id, result_id):
        """Get a specific result for a user"""
        return cls.query.filter_by(user_id=user_id, result_id=result_id).first()
    
    @classmethod
    def delete_user_result(cls, user_id, result_id):
        """Delete a specific result for a user"""
        result = cls.get_user_result_by_id(user_id, result_id)
        if result:
            db.session.delete(result)
            db.session.commit()
            return True
        return False
