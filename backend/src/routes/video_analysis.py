from flask import Blueprint, jsonify, request
import base64
import os
import tempfile
import requests
import json
from ..models.settings import Settings
from ..models.user import db
from ..utils.video_utils import extract_frames_from_video, analyze_frames_with_service
from .analysis import analyze_with_openai, analyze_with_groq, analyze_with_grok, analyze_with_llama, analyze_with_cohere, analyze_with_deepseek

video_analysis_bp = Blueprint('video_analysis', __name__)

def get_settings():
    """Get the first settings record or create a default one"""
    settings = Settings.query.first()
    if not settings:
        settings = Settings()
        db.session.add(settings)
        db.session.commit()
    return settings

def analyze_video_with_gemini(video_data, api_key, system_prompt, model="gemini-2.0-flash", filename="video.mp4"):
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

def analyze_video_with_groq(video_data, api_key, system_prompt, model="llama-3.2-90b-vision-preview", filename="video.mp4"):
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

def analyze_video_with_grok(video_data, api_key, system_prompt, model="grok-vision-beta", filename="video.mp4"):
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

def analyze_video_with_llama(video_data, api_key, system_prompt, model="llama-3.2-11b-vision-instruct", filename="video.mp4"):
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

def analyze_video_with_cohere(video_data, api_key, system_prompt, model="command-a-vision-07-2025", filename="video.mp4"):
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
        
        settings = get_settings()
        results = []
        
        # Get global system prompt and additional context
        global_prompt = settings.global_system_prompt or ""
        additional_context = settings.additional_context or ""
        
        # Analyze with each selected service
        for service in selected_services:
            if service == 'gemini':
                # Gemini has native video support
                result = analyze_video_with_gemini(video_data, settings.gemini_api_key, global_prompt, settings.gemini_model, filename)
                results.append(result)
            elif service == 'groq':
                # Groq has video understanding capabilities
                result = analyze_video_with_groq(video_data, settings.groq_api_key, global_prompt, settings.groq_model, filename)
                results.append(result)
            elif service == 'grok':
                # Grok has video understanding capabilities
                result = analyze_video_with_grok(video_data, settings.grok_api_key, global_prompt, settings.grok_model, filename)
                results.append(result)
            elif service == 'openai':
                # OpenAI GPT-4o supports video
                result = analyze_video_with_openai(video_data, settings.openai_api_key, global_prompt, settings.openai_model, filename)
                results.append(result)
            elif service == 'llama':
                # Llama complete video analysis
                result = analyze_video_with_llama(video_data, settings.llama_api_key, global_prompt, settings.llama_model, filename)
                results.append(result)
            elif service == 'cohere':
                # Cohere complete video analysis
                result = analyze_video_with_cohere(video_data, settings.cohere_api_key, global_prompt, settings.cohere_model, filename)
                results.append(result)
            elif service == 'deepseek':
                # DeepSeek complete video analysis
                result = analyze_video_with_deepseek(video_data, settings.deepseek_api_key, global_prompt, settings.deepseek_model, filename)
                results.append(result)
        
        return jsonify({"results": results})
        
    except Exception as e:
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