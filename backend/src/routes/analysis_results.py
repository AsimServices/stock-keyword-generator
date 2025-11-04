from flask import Blueprint, jsonify, request
from ..models.analysis_result import AnalysisResult, db
from datetime import datetime

analysis_results_bp = Blueprint('analysis_results', __name__)

@analysis_results_bp.route('/analysis-results', methods=['GET'])
def get_user_results():
    """Get all analysis results for the authenticated user"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        # Get optional filters
        analysis_type = request.args.get('type')  # 'image', 'video', 'text'
        
        # Get results from database
        results = AnalysisResult.get_user_results(user_id, analysis_type)
        
        # Convert to frontend format
        frontend_results = [result.to_dict() for result in results]
        
        return jsonify({
            'success': True,
            'results': frontend_results,
            'count': len(frontend_results)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis_results_bp.route('/analysis-results', methods=['POST'])
def save_analysis_result():
    """Save a new analysis result for the authenticated user"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Create new analysis result
        analysis_result = AnalysisResult.create_from_frontend_result(user_id, data)
        
        # Save to database
        db.session.add(analysis_result)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Analysis result saved successfully',
            'result': analysis_result.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@analysis_results_bp.route('/analysis-results/batch', methods=['POST'])
def save_analysis_results_batch():
    """Save multiple analysis results for the authenticated user"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        data = request.get_json()
        if not data or 'results' not in data:
            return jsonify({'error': 'No results data provided'}), 400
        
        results = data['results']
        if not isinstance(results, list):
            return jsonify({'error': 'Results must be an array'}), 400
        
        # Create and save all results
        saved_results = []
        for result_data in results:
            analysis_result = AnalysisResult.create_from_frontend_result(user_id, result_data)
            db.session.add(analysis_result)
            saved_results.append(analysis_result)
        
        # Commit all at once
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{len(saved_results)} analysis results saved successfully',
            'results': [result.to_dict() for result in saved_results],
            'count': len(saved_results)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@analysis_results_bp.route('/analysis-results/<result_id>', methods=['GET'])
def get_analysis_result(result_id):
    """Get a specific analysis result for the authenticated user"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        result = AnalysisResult.get_user_result_by_id(user_id, result_id)
        if not result:
            return jsonify({'error': 'Analysis result not found'}), 404
        
        return jsonify({
            'success': True,
            'result': result.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis_results_bp.route('/analysis-results/<result_id>', methods=['DELETE'])
def delete_analysis_result(result_id):
    """Delete a specific analysis result for the authenticated user"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        success = AnalysisResult.delete_user_result(user_id, result_id)
        if not success:
            return jsonify({'error': 'Analysis result not found'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Analysis result deleted successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis_results_bp.route('/analysis-results/stats', methods=['GET'])
def get_analysis_stats():
    """Get analysis statistics for the authenticated user"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        # Get all results for the user
        all_results = AnalysisResult.get_user_results(user_id)
        
        # Calculate statistics
        total_analyses = len(all_results)
        successful_analyses = len([r for r in all_results if r.status == 'completed'])
        error_analyses = len([r for r in all_results if r.status == 'error'])
        
        # Count by type
        image_results = len([r for r in all_results if r.analysis_type == 'image'])
        video_results = len([r for r in all_results if r.analysis_type == 'video'])
        text_results = len([r for r in all_results if r.analysis_type == 'text'])
        
        # Count by service
        service_counts = {}
        for result in all_results:
            service = result.service
            service_counts[service] = service_counts.get(service, 0) + 1
        
        return jsonify({
            'success': True,
            'stats': {
                'total_analyses': total_analyses,
                'successful_analyses': successful_analyses,
                'error_analyses': error_analyses,
                'success_rate': (successful_analyses / total_analyses * 100) if total_analyses > 0 else 0,
                'by_type': {
                    'image': image_results,
                    'video': video_results,
                    'text': text_results
                },
                'by_service': service_counts
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
