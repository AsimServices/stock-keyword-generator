from flask import Blueprint, jsonify, request
import base64
import os
import tempfile
import requests
import json
from ..models.settings import Settings
from ..models.user_api_keys import UserApiKeys
from ..models.user import db
from ..utils.video_utils import extract_frames_from_video, analyze_frames_with_service
from .analysis import analyze_with_openai, analyze_with_groq, analyze_with_grok, analyze_with_llama, analyze_with_cohere, analyze_with_deepseek

video_analysis_bp = Blueprint('video_analysis', __name__)

def get_settings():
    """Get the first settings record or create a default one (fallback for global settings)"""
    settings = Settings.query.first()
    if not settings:
        settings = Settings()
        db.session.add(settings)
        db.session.commit()
    return settings

def get_user_settings(user_id):
    """Get user-specific settings or create default if not exists"""
    user_keys = UserApiKeys.query.filter_by(user_id=user_id).first()
    if not user_keys:
        # Create default user API keys
        user_keys = UserApiKeys(user_id=user_id)
        db.session.add(user_keys)
        db.session.commit()
    return user_keys

def analyze_video_with_gemini(video_data, api_key, system_prompt, model="gemini-2.5-flash", filename="video.mp4"):
    """Analyze video using Google Gemini (supports video)"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "Gemini API key not configured",
                "service": "Gemini"
            }
        
        # For video analysis with Gemini, we need to upload the video first
        # This is a simplified implementation - in production you'd handle file upload properly
        headers = {"Content-Type": "application/json"}
        
        # Add filename to system prompt
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": enhanced_prompt},
                        {
                            "inline_data": {
                                "mime_type": "video/mp4",
                                "data": video_data
                            }
                        }
                    ]
                }
            ]
        }
        
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
            headers=headers,
            json=payload,
            timeout=120,  # Increased timeout for video processing
            stream=False
        )
        
        if response.status_code == 200:
            result = response.json()
            if "candidates" in result and len(result["candidates"]) > 0:
                content = result["candidates"][0]["content"]["parts"][0]["text"]
                
                # Import the parse function from analysis.py
                from .analysis import parse_ai_response
                parsed_result = parse_ai_response(content)
                
                return {
                    "success": True,
                    "title": parsed_result.get('title', ''),
                    "keywords": parsed_result.get('keywords', []),
                    "raw_response": parsed_result.get('raw_response', content),
                    "service": "Gemini"
                }
            else:
                return {
                    "success": False,
                    "error": "No response generated",
                    "service": "Gemini"
                }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}",
                "service": "Gemini"
            }
            
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Gemini API request timed out. Video processing may take longer - please try with a shorter video or try again later.",
            "service": "Gemini"
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "Unable to connect to Gemini API. Please check your internet connection and try again.",
            "service": "Gemini"
        }
    except Exception as e:
        error_msg = str(e)
        if "Connection aborted" in error_msg or "TimeoutError" in error_msg:
            error_msg = "Connection timeout occurred. Please try with a shorter video or check your internet connection."
        return {
            "success": False,
            "error": error_msg,
            "service": "Gemini"
        }

def analyze_video_with_groq(video_data, api_key, system_prompt, model="llama-3.1-70b-versatile", filename="video.mp4"):
    """Analyze video using Groq by extracting frames (Groq doesn't support direct video)"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "Groq API key not configured. Please add your API key in settings.",
                "service": "Groq"
            }
        
        # Extract frames from video
        frame_extraction = extract_frames_from_video(video_data, num_frames=5)
        
        if not frame_extraction["success"]:
            return {
                "success": False,
                "error": f"Frame extraction failed: {frame_extraction['error']}",
                "service": "Groq"
            }
        
        frames = frame_extraction["frames"]
        video_info = frame_extraction["video_info"]
        
        # Enhance system prompt for frame-based analysis
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}\n\nNote: You are analyzing key frames extracted from a video. The video is {video_info['duration_seconds']:.1f} seconds long with {video_info['total_frames']} total frames. Please provide insights based on these {len(frames)} representative frames."
        
        # Analyze frames using Groq image analysis
        result = analyze_frames_with_service(
            frames, 
            analyze_with_groq, 
            api_key, 
            enhanced_prompt, 
            model,
            filename
        )
        
        # Add service info to result
        if result["success"]:
            result["service"] = "Groq (Frame-based)"
            result["analysis_method"] = "Extracted frames from video"
            result["video_info"] = video_info
        else:
            result["service"] = "Groq"
            
        return result
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Groq API request timed out. Please try again.",
            "service": "Groq"
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "Unable to connect to Groq API. Please check your internet connection.",
            "service": "Groq"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Groq video analysis failed: {str(e)}",
            "service": "Groq"
        }

def analyze_video_with_grok(video_data, api_key, system_prompt, model="grok-2-vision", filename="video.mp4"):
    """Analyze video using Grok by extracting frames (Grok doesn't support direct video)"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "Grok API key not configured. Please add your API key in settings.",
                "service": "Grok"
            }
        
        # Extract frames from video
        frame_extraction = extract_frames_from_video(video_data, num_frames=5)
        
        if not frame_extraction["success"]:
            return {
                "success": False,
                "error": f"Frame extraction failed: {frame_extraction['error']}",
                "service": "Grok"
            }
        
        frames = frame_extraction["frames"]
        video_info = frame_extraction["video_info"]
        
        # Enhance system prompt for frame-based analysis
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}\n\nNote: You are analyzing key frames extracted from a video. The video is {video_info['duration_seconds']:.1f} seconds long with {video_info['total_frames']} total frames. Please provide insights based on these {len(frames)} representative frames."
        
        # Analyze frames using Grok image analysis
        result = analyze_frames_with_service(
            frames, 
            analyze_with_grok, 
            api_key, 
            enhanced_prompt, 
            model,
            filename
        )
        
        # Add service info to result
        if result["success"]:
            result["service"] = "Grok (Frame-based)"
            result["analysis_method"] = "Extracted frames from video"
            result["video_info"] = video_info
        else:
            result["service"] = "Grok"
            
        return result
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Grok API request timed out. Please try again.",
            "service": "Grok"
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "Unable to connect to Grok API. Please check your internet connection.",
            "service": "Grok"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Grok video analysis failed: {str(e)}",
            "service": "Grok"
        }

def analyze_video_with_openai(video_data, api_key, system_prompt, model="gpt-4o", filename="video.mp4"):
    """Analyze video using OpenAI by extracting frames (OpenAI doesn't support direct video)"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "OpenAI API key not configured. Please add your API key in settings.",
                "service": "OpenAI"
            }
        
        # Extract frames from video
        frame_extraction = extract_frames_from_video(video_data, num_frames=5)
        
        if not frame_extraction["success"]:
            return {
                "success": False,
                "error": f"Frame extraction failed: {frame_extraction['error']}",
                "service": "OpenAI"
            }
        
        frames = frame_extraction["frames"]
        video_info = frame_extraction["video_info"]
        
        # Enhance system prompt for frame-based analysis
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}\n\nNote: You are analyzing key frames extracted from a video. The video is {video_info['duration_seconds']:.1f} seconds long with {video_info['total_frames']} total frames. Please provide insights based on these {len(frames)} representative frames."
        
        # Analyze frames using OpenAI image analysis
        result = analyze_frames_with_service(
            frames, 
            analyze_with_openai, 
            api_key, 
            enhanced_prompt, 
            model,
            filename
        )
        
        # Add service info to result
        if result["success"]:
            result["service"] = "OpenAI (Frame-based)"
            result["analysis_method"] = "Extracted frames from video"
            result["video_info"] = video_info
        else:
            result["service"] = "OpenAI"
            
        return result
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "OpenAI API request timed out. Please try again.",
            "service": "OpenAI"
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "Unable to connect to OpenAI API. Please check your internet connection.",
            "service": "OpenAI"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"OpenAI video analysis failed: {str(e)}",
            "service": "OpenAI"
        }

def analyze_video_with_llama(video_data, api_key, system_prompt, model="llama-3.1-70b", filename="video.mp4"):
    """Analyze video using Llama by extracting frames (Llama doesn't support direct video)"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "Llama API key not configured. Please add your API key in settings.",
                "service": "Llama"
            }
        
        # Extract frames from video
        frame_extraction = extract_frames_from_video(video_data, num_frames=5)
        
        if not frame_extraction["success"]:
            return {
                "success": False,
                "error": f"Frame extraction failed: {frame_extraction['error']}",
                "service": "Llama"
            }
        
        frames = frame_extraction["frames"]
        video_info = frame_extraction["video_info"]
        
        # Enhance system prompt for frame-based analysis
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}\n\nNote: You are analyzing key frames extracted from a video. The video is {video_info['duration_seconds']:.1f} seconds long with {video_info['total_frames']} total frames. Please provide insights based on these {len(frames)} representative frames."
        
        # Analyze frames using Llama image analysis
        result = analyze_frames_with_service(
            frames, 
            analyze_with_llama, 
            api_key, 
            enhanced_prompt, 
            model,
            filename
        )
        
        # Add service info to result
        if result["success"]:
            result["service"] = "Llama (Frame-based)"
            result["analysis_method"] = "Extracted frames from video"
            result["video_info"] = video_info
        else:
            result["service"] = "Llama"
            
        return result
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Llama API request timed out. Please try again.",
            "service": "Llama"
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "Unable to connect to Llama API. Please check your internet connection.",
            "service": "Llama"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Llama video analysis failed: {str(e)}",
            "service": "Llama"
        }

def analyze_video_with_cohere(video_data, api_key, system_prompt, model="command-r-plus", filename="video.mp4"):
    """Analyze video using Cohere by extracting frames (safer approach)"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "Cohere API key not configured. Please add your API key in settings.",
                "service": "Cohere"
            }
        
        # Extract frames from video
        frame_extraction = extract_frames_from_video(video_data, num_frames=5)
        
        if not frame_extraction["success"]:
            return {
                "success": False,
                "error": f"Frame extraction failed: {frame_extraction['error']}",
                "service": "Cohere"
            }
        
        frames = frame_extraction["frames"]
        video_info = frame_extraction["video_info"]
        
        # Enhance system prompt for frame-based analysis
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}\n\nNote: You are analyzing key frames extracted from a video. The video is {video_info['duration_seconds']:.1f} seconds long with {video_info['total_frames']} total frames. Please provide insights based on these {len(frames)} representative frames."
        
        # Analyze frames using Cohere image analysis
        result = analyze_frames_with_service(
            frames, 
            analyze_with_cohere, 
            api_key, 
            enhanced_prompt, 
            model,
            filename
        )
        
        # Add service info to result
        if result["success"]:
            result["service"] = "Cohere (Frame-based)"
            result["analysis_method"] = "Extracted frames from video"
            result["video_info"] = video_info
        else:
            result["service"] = "Cohere"
            
        return result
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Cohere API request timed out. Please try again.",
            "service": "Cohere"
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "Unable to connect to Cohere API. Please check your internet connection.",
            "service": "Cohere"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Cohere video analysis failed: {str(e)}",
            "service": "Cohere"
        }

def analyze_video_with_deepseek(video_data, api_key, system_prompt, model="deepseek-vl-7b-chat", filename="video.mp4"):
    """Analyze video using DeepSeek by extracting frames (DeepSeek doesn't support direct video)"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "DeepSeek API key not configured. Please add your API key in settings.",
                "service": "DeepSeek"
            }
        
        # Extract frames from video
        frame_extraction = extract_frames_from_video(video_data, num_frames=5)
        
        if not frame_extraction["success"]:
            return {
                "success": False,
                "error": f"Frame extraction failed: {frame_extraction['error']}",
                "service": "DeepSeek"
            }
        
        frames = frame_extraction["frames"]
        video_info = frame_extraction["video_info"]
        
        # Enhance system prompt for frame-based analysis
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}\n\nNote: You are analyzing key frames extracted from a video. The video is {video_info['duration_seconds']:.1f} seconds long with {video_info['total_frames']} total frames. Please provide insights based on these {len(frames)} representative frames."
        
        # Analyze frames using DeepSeek image analysis
        result = analyze_frames_with_service(
            frames, 
            analyze_with_deepseek, 
            api_key, 
            enhanced_prompt, 
            model,
            filename
        )
        
        # Add service info to result
        if result["success"]:
            result["service"] = "DeepSeek (Frame-based)"
            result["analysis_method"] = "Extracted frames from video"
            result["video_info"] = video_info
        else:
            result["service"] = "DeepSeek"
            
        return result
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "DeepSeek API request timed out. Please try again.",
            "service": "DeepSeek"
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "Unable to connect to DeepSeek API. Please check your internet connection.",
            "service": "DeepSeek"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"DeepSeek video analysis failed: {str(e)}",
            "service": "DeepSeek"
        }

@video_analysis_bp.route('/analyze-video', methods=['POST'])
def analyze_video():
    """Analyze video with selected AI services"""
    try:
        data = request.json
        video_data = data.get('video')  # base64 encoded video or video file
        filename = data.get('filename', 'video.mp4')  # filename with fallback
        selected_services = data.get('services', [])
        
        if not video_data:
            return jsonify({"error": "No video data provided"}), 400
        
        if not selected_services:
            return jsonify({"error": "No services selected"}), 400
        
        # Remove data URL prefix if present
        if video_data.startswith('data:video'):
            video_data = video_data.split(',')[1]
        
        # Get user ID from request headers
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({"error": "User ID required"}), 400
        
        # Get user-specific settings
        user_settings = get_user_settings(user_id)
        results = []
        
        # Get user's system prompt and additional context
        global_prompt = user_settings.global_system_prompt or ""
        additional_context = user_settings.additional_context or ""
        
        # Analyze with each selected service
        for service in selected_services:
            if service == 'gemini':
                # Gemini has native video support
                result = analyze_video_with_gemini(video_data, user_settings.gemini_api_key, global_prompt, user_settings.gemini_model, filename)
                results.append(result)
            elif service == 'groq':
                # Groq has video understanding capabilities
                result = analyze_video_with_groq(video_data, user_settings.groq_api_key, global_prompt, user_settings.groq_model, filename)
                results.append(result)
            elif service == 'grok':
                # Grok has video understanding capabilities
                result = analyze_video_with_grok(video_data, user_settings.grok_api_key, global_prompt, user_settings.grok_model, filename)
                results.append(result)
            elif service == 'openai':
                # OpenAI GPT-5 supports video
                result = analyze_video_with_openai(video_data, user_settings.openai_api_key, global_prompt, user_settings.openai_model, filename)
                results.append(result)
            elif service == 'llama':
                # Llama complete video analysis
                result = analyze_video_with_llama(video_data, user_settings.llama_api_key, global_prompt, user_settings.llama_model, filename)
                results.append(result)
            elif service == 'cohere':
                # Cohere complete video analysis
                result = analyze_video_with_cohere(video_data, user_settings.cohere_api_key, global_prompt, user_settings.cohere_model, filename)
                results.append(result)
            elif service == 'deepseek':
                # DeepSeek complete video analysis
                result = analyze_video_with_deepseek(video_data, user_settings.deepseek_api_key, global_prompt, user_settings.deepseek_model, filename)
                results.append(result)
        
        return jsonify({"results": results})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@video_analysis_bp.route('/analyze-video-structured', methods=['POST'])
def analyze_video_structured():
    """Analyze video with structured AI service (new implementation)"""
    try:
        data = request.json
        frames = data.get('frames', [])  # Array of frame data URLs
        filename = data.get('filename', 'video.mp4')  # filename with fallback
        selected_services = data.get('services', [])
        custom_prompt = data.get('custom_prompt', '')
        
        if not frames or len(frames) == 0:
            print("DEBUG: No video frames provided")
            return jsonify({"error": "No video frames provided"}), 400
        
        print(f"DEBUG: Video frames received: count={len(frames)}")
        
        if not selected_services:
            return jsonify({"error": "No services selected"}), 400
        
        # Get user ID from request headers
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({"error": "User ID required"}), 400
        
        # Get user-specific settings
        user_settings = get_user_settings(user_id)
        results = []
        
        # Initialize structured AI service
        from ..services.structured_ai import StructuredAIService
        ai_service = StructuredAIService()
        
        # Analyze with each selected service using structured approach
        for service in selected_services:
            # Get API key and model for the service
            api_key = None
            model = None
            
            if service == 'openai':
                api_key = user_settings.openai_api_key
                model = user_settings.openai_model
            elif service == 'gemini':
                api_key = user_settings.gemini_api_key
                model = user_settings.gemini_model
            elif service == 'groq':
                api_key = user_settings.groq_api_key
                model = user_settings.groq_model
            elif service == 'grok':
                api_key = user_settings.grok_api_key
                model = user_settings.grok_model
            elif service == 'llama':
                api_key = user_settings.llama_api_key
                model = user_settings.llama_model
            elif service == 'cohere':
                api_key = user_settings.cohere_api_key
                model = user_settings.cohere_model
            elif service == 'deepseek':
                api_key = user_settings.deepseek_api_key
                model = user_settings.deepseek_model
            
            if not api_key:
                results.append({
                    "service": service.title(),
                    "success": False,
                    "error": f"No API key configured for {service}"
                })
                continue
            
            # Analyze the first frame (representative frame) for video analysis
            # In the future, we could analyze multiple frames and combine results
            first_frame = frames[0] if frames else None
            if not first_frame:
                results.append({
                    "service": service.title(),
                    "success": False,
                    "error": "No frames available for analysis"
                })
                continue
            
            # Generate metadata using structured AI service for video analysis
            result = ai_service.generate_video_metadata(
                service=service,
                api_key=api_key,
                model=model,
                video_data=first_frame,  # Use first frame for analysis
                filename=filename,
                custom_prompt=custom_prompt or 'This is a video file. Analyze the content for Adobe Stock video submission.'
            )
            
            print(f"DEBUG: AI service result for {service}: success={result.success}")
            if not result.success:
                print(f"DEBUG: AI service error for {service}: {result.error}")
            
            # Convert to expected format
            if result.success:
                results.append({
                    "service": service.title(),
                    "success": True,
                    "title": result.title,
                    "keywords": result.keywords,
                    "category": result.category,
                    "releases": result.releases,
                    "raw_response": result.raw_response
                })
                print(f"DEBUG: Success for {service}: title={result.title[:50]}...")
            else:
                results.append({
                    "service": service.title(),
                    "success": False,
                    "error": result.error
                })
                print(f"DEBUG: Failed for {service}: {result.error}")
            
            print(f"DEBUG: Structured video result from {service}: success={result.success}")
        
        return jsonify({"results": results})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@video_analysis_bp.route('/analyze-videos-batch', methods=['POST'])
def analyze_videos_batch():
    """Analyze multiple videos with structured AI service in parallel"""
    try:
        data = request.json
        videos = data.get('videos', [])  # Array of {frames, filename}
        selected_services = data.get('services', [])
        custom_prompt = data.get('custom_prompt', '')
        
        print(f"DEBUG: Batch video analysis request - videos: {len(videos)}, services: {selected_services}")
        
        if not videos:
            return jsonify({"error": "No videos provided"}), 400
        
        if not selected_services:
            return jsonify({"error": "No services selected"}), 400
        
        # Get user ID from request headers
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({"error": "User ID required"}), 400
        
        # Get user-specific settings
        user_settings = get_user_settings(user_id)
        
        # Initialize structured AI service
        from ..services.structured_ai import StructuredAIService
        ai_service = StructuredAIService()
        
        # Process all videos in parallel
        import concurrent.futures
        
        def analyze_single_video(frames, filename, service):
            """Analyze a single video with a specific service"""
            print(f"DEBUG: analyze_single_video called with {len(frames)} frames for {filename} using {service}")
            try:
                # Get API key and model for the service
                api_key = None
                model = None
                
                if service == 'openai':
                    api_key = user_settings.openai_api_key
                    model = user_settings.openai_model
                elif service == 'gemini':
                    api_key = user_settings.gemini_api_key
                    model = user_settings.gemini_model
                elif service == 'groq':
                    api_key = user_settings.groq_api_key
                    model = user_settings.groq_model
                elif service == 'grok':
                    api_key = user_settings.grok_api_key
                    model = user_settings.grok_model
                elif service == 'llama':
                    api_key = user_settings.llama_api_key
                    model = user_settings.llama_model
                elif service == 'cohere':
                    api_key = user_settings.cohere_api_key
                    model = user_settings.cohere_model
                elif service == 'deepseek':
                    api_key = user_settings.deepseek_api_key
                    model = user_settings.deepseek_model
                
                if not api_key:
                    return {
                        "filename": filename,
                        "service": service,
                        "success": False,
                        "error": f"No API key configured for {service}"
                    }
                
                # Use first frame for analysis
                first_frame = frames[0] if frames else None
                if not first_frame:
                    return {
                        "filename": filename,
                        "service": service,
                        "success": False,
                        "error": "No frames available for analysis"
                    }
                
                # Generate metadata using structured AI service for video analysis
                print(f"DEBUG: Calling AI service {service} with frame data length: {len(first_frame) if first_frame else 0}")
                result = ai_service.generate_video_metadata(
                    service=service,
                    api_key=api_key,
                    model=model,
                    video_data=first_frame,  # Use first frame for analysis
                    filename=filename,
                    custom_prompt=custom_prompt or 'This is a video file. Analyze the content for Adobe Stock video submission.'
                )
                print(f"DEBUG: AI service {service} returned success: {result.success}")
                
                # Convert to expected format
                if result.success:
                    return {
                        "filename": filename,
                        "service": service,
                        "success": True,
                        "title": result.title,
                        "keywords": result.keywords,
                        "category": result.category,
                        "releases": result.releases,
                        "raw_response": result.raw_response
                    }
                else:
                    return {
                        "filename": filename,
                        "service": service,
                        "success": False,
                        "error": result.error
                    }
                    
            except Exception as e:
                return {
                    "filename": filename,
                    "service": service,
                    "success": False,
                    "error": str(e)
                }
        
        # Create all analysis tasks
        tasks = []
        for video in videos:
            for service in selected_services:
                tasks.append((video['frames'], video['filename'], service))
        
        # Execute all tasks in parallel using ThreadPoolExecutor
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            # Submit all tasks
            future_to_task = {
                executor.submit(analyze_single_video, frames, filename, service): (filename, service)
                for frames, filename, service in tasks
            }
            
            # Collect results as they complete
            for future in concurrent.futures.as_completed(future_to_task):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    results.append({
                        "filename": "unknown",
                        "service": "unknown", 
                        "success": False,
                        "error": str(e)
                    })
        
        # Group results by filename
        grouped_results = {}
        for result in results:
            filename = result['filename']
            if filename not in grouped_results:
                grouped_results[filename] = []
            grouped_results[filename].append(result)
        
        # Save successful results to database
        from ..models.analysis_result import AnalysisResult, db
        from datetime import datetime
        saved_results = []
        
        for filename, file_results in grouped_results.items():
            for result in file_results:
                # Create frontend-style result object for database storage
                if result.get('success', False):
                    # Successful result
                    frontend_result = {
                        'id': f"{user_id}-{filename}-{result['service']}-{int(datetime.now().timestamp() * 1000)}",
                        'filename': filename,
                        'type': 'video',
                        'service': result['service'].lower(),
                        'result': {
                            'title': result['title'],
                            'keywords': result['keywords'],
                            'category': result['category'],
                            'releases': result['releases'],
                            'raw_response': result['raw_response']
                        }
                    }
                else:
                    # Error result
                    frontend_result = {
                        'id': f"{user_id}-{filename}-{result['service']}-{int(datetime.now().timestamp() * 1000)}",
                        'filename': filename,
                        'type': 'video',
                        'service': result['service'].lower(),
                        'status': 'error',
                        'error': result.get('error', 'Unknown error')
                    }
                
                # Save to database
                try:
                    analysis_result = AnalysisResult.create_from_frontend_result(user_id, frontend_result)
                    db.session.add(analysis_result)
                    saved_results.append(frontend_result)
                    print(f"DEBUG: Saved video result to database: {filename} with {result['service']} - Status: {frontend_result.get('status', 'completed')}")
                except Exception as e:
                    print(f"DEBUG: Failed to save video result to database: {str(e)}")
        
        # Commit all database changes
        try:
            db.session.commit()
            print(f"DEBUG: Saved {len(saved_results)} video results to database")
        except Exception as e:
            db.session.rollback()
            print(f"DEBUG: Database commit failed: {str(e)}")

        return jsonify({
            "success": True,
            "results": grouped_results,
            "total_videos": len(videos),
            "total_analyses": len(results),
            "saved_to_database": len(saved_results)
        })
        
    except Exception as e:
        print(f"DEBUG: Batch video analysis error: {str(e)}")
        import traceback
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@video_analysis_bp.route('/video-capabilities', methods=['GET'])
def get_video_capabilities():
    """Get information about video analysis capabilities for each service"""
    capabilities = {
        "gemini": {
            "native_video_support": True,
            "supported_formats": ["MP4", "MPEG", "MOV", "AVI", "FLV", "MPG", "WebM", "WMV", "3GPP"],
            "max_duration": "2 hours (standard) / 6 hours (low resolution)",
            "features": ["Complete video analysis", "Audio transcription", "Timestamp references", "Scene understanding", "Motion detection", "Object tracking"],
            "status": "🎥 BEST VIDEO SUPPORT - Full native video processing",
            "analysis_method": "Complete video file",
            "quality": "Excellent - Analyzes entire video timeline"
        },
        "openai": {
            "native_video_support": False,
            "supported_formats": ["MP4", "MOV", "WebM", "AVI"],
            "max_duration": "Depends on file size",
            "features": ["Frame-based analysis", "Scene understanding", "Object detection", "Content description"],
            "status": "📷 Frame Extraction - Good quality analysis",
            "analysis_method": "Extracts 5 key frames for analysis",
            "quality": "Good - Analyzes representative frames"
        },
        "groq": {
            "native_video_support": False,
            "supported_formats": ["MP4", "MOV", "WebM", "AVI"],
            "max_duration": "Depends on file size",
            "features": ["Fast frame analysis", "Object detection", "Scene understanding"],
            "status": "📷 Frame Extraction - Fast processing",
            "analysis_method": "Extracts 5 key frames for analysis",
            "quality": "Good - Analyzes representative frames"
        },
        "grok": {
            "native_video_support": False,
            "supported_formats": ["MP4", "MOV", "WebM", "AVI"],
            "max_duration": "Depends on file size",
            "features": ["Frame-based analysis", "Advanced reasoning", "Scene understanding"],
            "status": "📷 Frame Extraction - Advanced reasoning",
            "analysis_method": "Extracts 5 key frames for analysis",
            "quality": "Good - Analyzes representative frames"
        },
        "llama": {
            "native_video_support": False,
            "supported_formats": ["MP4", "MOV", "WebM", "AVI"],
            "max_duration": "Depends on file size",
            "features": ["Frame-based analysis", "Open-source processing", "Content understanding"],
            "status": "📷 Frame Extraction - Open source",
            "analysis_method": "Extracts 5 key frames for analysis",
            "quality": "Good - Analyzes representative frames"
        },
        "cohere": {
            "native_video_support": False,
            "supported_formats": ["MP4", "MOV", "WebM", "AVI"],
            "max_duration": "Depends on file size",
            "features": ["Frame-based analysis", "Multilingual understanding", "Content analysis"],
            "status": "📷 Frame Extraction - Enterprise grade",
            "analysis_method": "Extracts 5 key frames for analysis",
            "quality": "Good - Analyzes representative frames"
        },
        "deepseek": {
            "native_video_support": False,
            "supported_formats": ["MP4", "MOV", "WebM", "AVI"],
            "max_duration": "Depends on file size",
            "features": ["Frame-based analysis", "Deep reasoning", "Visual understanding"],
            "status": "📷 Frame Extraction - Deep reasoning",
            "analysis_method": "Extracts 5 key frames for analysis",
            "quality": "Good - Analyzes representative frames"
        }
    }
    
    return jsonify({
        "video_capabilities": capabilities,
        "recommendation": "🌟 For BEST video analysis results, use Gemini which processes the complete video file. Other services extract key frames which still provides good insights but may miss temporal information.",
        "note": "All services now support video analysis! Gemini analyzes the complete video, while others use intelligent frame extraction for efficient processing."
    })