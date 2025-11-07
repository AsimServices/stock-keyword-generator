from flask import Blueprint, jsonify, request
import base64
import os
import tempfile
import requests
import json
import re
from datetime import datetime
from ..models.settings import Settings
from ..models.user_api_keys import UserApiKeys
from ..models.user import db
from ..services.structured_ai import StructuredAIService

analysis_bp = Blueprint('analysis', __name__)

def parse_ai_response(raw_response):
    """Parse AI response to extract title and keywords from JSON format"""
    try:
        # First, try to find JSON in the response with more flexible pattern
        # Look for JSON that contains at least title and keywords
        json_pattern = r'\{[^{}]*?"title"[^{}]*?"keywords"[^{}]*?\}'
        json_match = re.search(json_pattern, raw_response, re.DOTALL)
        
        if json_match:
            json_str = json_match.group()
            # Clean up the JSON string
            json_str = json_str.strip()
            parsed_json = json.loads(json_str)
            
            title = parsed_json.get('title', '')
            keywords_str = parsed_json.get('keywords', '')
            
            # Convert keywords string to list
            keywords = [kw.strip() for kw in keywords_str.split(',') if kw.strip()] if keywords_str else []
            
            category = parsed_json.get('category', '')
            releases = parsed_json.get('releases', '')
            
            result = {
                'success': True,
                'title': title,
                'keywords': keywords,
                'category': category,
                'releases': releases,
                'raw_response': raw_response
            }
            return result
    except (json.JSONDecodeError, AttributeError, TypeError):
        pass
    
    # Try to parse the entire response as JSON
    try:
        parsed_json = json.loads(raw_response.strip())
        if isinstance(parsed_json, dict) and 'title' in parsed_json and 'keywords' in parsed_json:
            title = parsed_json.get('title', '')
            keywords_str = parsed_json.get('keywords', '')
            keywords = [kw.strip() for kw in keywords_str.split(',') if kw.strip()] if keywords_str else []
            
            category = parsed_json.get('category', '')
            releases = parsed_json.get('releases', '')
            
            # Log what we got from AI
            print(f"DEBUG: Full parsed JSON (second parse): {parsed_json}")
            print(f"DEBUG: Category from AI (second parse): '{category}' (type: {type(category)})")
            print(f"DEBUG: Releases from AI (second parse): '{releases}' (type: {type(releases)})")
            
            result = {
                'success': True,
                'title': title,
                'keywords': keywords,
                'category': category,
                'releases': releases,
                'raw_response': raw_response
            }
            print(f"DEBUG: Second parse result: {result}")  # Debug log
            print(f"DEBUG: Category from AI (second parse): '{category}'")  # Debug log
            print(f"DEBUG: Releases from AI (second parse): '{releases}'")  # Debug log
            return result
    except (json.JSONDecodeError, AttributeError, TypeError):
        pass
    
    # Fallback: treat entire response as raw text
    return {
        'success': True,
        'title': '',
        'keywords': [],
        'category': '',
        'releases': '',
        'raw_response': raw_response
    }

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

def analyze_with_openai(image_data, api_key, system_prompt, additional_context="", model="gpt-5", filename="image.jpg"):
    """Analyze image using OpenAI GPT-5 Vision"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "OpenAI API key not configured. Please add your API key in settings.",
                "service": "OpenAI"
            }
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Combine system prompt with additional context and filename
        combined_prompt = system_prompt
        if additional_context and additional_context.strip():
            combined_prompt += f"\n\nAdditional Context:\n{additional_context.strip()}"
        combined_prompt += f"\n\nFilename: {filename}"
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": combined_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500
        }
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            raw_content = result["choices"][0]["message"]["content"]
            parsed_result = parse_ai_response(raw_content)
            
            return {
                "success": True,
                "title": parsed_result.get('title', ''),
                "keywords": parsed_result.get('keywords', []),
                "raw_response": parsed_result.get('raw_response', raw_content),
                "service": "OpenAI"
            }
        else:
            # Parse and format error message nicely
            error_msg = "OpenAI API error occurred"
            try:
                error_data = response.json()
                if "error" in error_data and "message" in error_data["error"]:
                    if error_data["error"].get("code") == "invalid_api_key":
                        error_msg = "Invalid OpenAI API key. Please check your API key in settings."
                    elif error_data["error"].get("code") == "insufficient_quota":
                        error_msg = "OpenAI API quota exceeded. Please check your account billing."
                    else:
                        error_msg = f"OpenAI API error: {error_data['error']['message'].split('.')[0]}"
                else:
                    error_msg = f"OpenAI API returned status {response.status_code}"
            except:
                error_msg = f"OpenAI API returned status {response.status_code}"
                
            return {
                "success": False,
                "error": error_msg,
                "service": "OpenAI"
            }
            
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
            "error": f"OpenAI analysis failed: {str(e)}",
            "service": "OpenAI"
        }

def analyze_with_openai_turbo(image_data, api_key, system_prompt, additional_context="", model="gpt-4-turbo", filename="image.jpg"):
    """Analyze image using OpenAI GPT-4 Turbo Vision"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "OpenAI API key not configured. Please add your API key in settings.",
                "service": "OpenAI"
            }
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Combine system prompt with additional context and filename
        combined_prompt = system_prompt
        if additional_context and additional_context.strip():
            combined_prompt += f"\n\nAdditional Context:\n{additional_context.strip()}"
        combined_prompt += f"\n\nFilename: {filename}"
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": combined_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500
        }
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            return {
                "success": True,
                "result": content,
                "service": "OpenAI"
            }
        else:
            error_msg = f"OpenAI API error: {response.status_code}"
            if response.text:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', {}).get('message', error_msg)
                except:
                    error_msg = f"{error_msg}: {response.text}"
            
            return {
                "success": False,
                "error": error_msg,
                "service": "OpenAI"
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"OpenAI analysis failed: {str(e)}",
            "service": "OpenAI"
        }

def analyze_with_gemini(image_data, api_key, system_prompt, additional_context="", model="gemini-1.5-pro", filename="image.jpg"):
    """Analyze image using Google Gemini"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "Gemini API key not configured. Please add your API key in settings.",
                "service": "Gemini"
            }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        # Combine system prompt with additional context and filename
        combined_prompt = system_prompt
        if additional_context and additional_context.strip():
            combined_prompt += f"\n\nAdditional Context:\n{additional_context.strip()}"
        combined_prompt += f"\n\nFilename: {filename}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": combined_prompt
                        },
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_data
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
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if "candidates" in result and len(result["candidates"]) > 0:
                raw_content = result["candidates"][0]["content"]["parts"][0]["text"]
                parsed_result = parse_ai_response(raw_content)
                
                return {
                    "success": True,
                    "title": parsed_result.get('title', ''),
                    "keywords": parsed_result.get('keywords', []),
                    "raw_response": parsed_result.get('raw_response', raw_content),
                    "service": "Gemini"
                }
            else:
                return {
                    "success": False,
                    "error": "No response generated",
                    "service": "Gemini"
                }
        else:
            # Parse and format error message nicely
            error_msg = "Gemini API error occurred"
            try:
                error_data = response.json()
                if "error" in error_data:
                    if error_data["error"].get("status") == "INVALID_ARGUMENT":
                        error_msg = "Invalid Gemini API key. Please check your API key in settings."
                    elif error_data["error"].get("status") == "PERMISSION_DENIED":
                        error_msg = "Gemini API access denied. Please check your API key permissions."
                    elif error_data["error"].get("status") == "RESOURCE_EXHAUSTED":
                        error_msg = "Gemini API quota exceeded. Please check your account usage."
                    else:
                        msg = error_data["error"].get("message", "Unknown error")
                        error_msg = f"Gemini API error: {msg.split('.')[0]}"
                else:
                    error_msg = f"Gemini API returned status {response.status_code}"
            except:
                error_msg = f"Gemini API returned status {response.status_code}"
                
            return {
                "success": False,
                "error": error_msg,
                "service": "Gemini"
            }
            
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Gemini API request timed out. Please try again.",
            "service": "Gemini"
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "Unable to connect to Gemini API. Please check your internet connection.",
            "service": "Gemini"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Gemini analysis failed: {str(e)}",
            "service": "Gemini"
        }

def analyze_with_groq(image_data, api_key, system_prompt, additional_context="", model="llama-3.2-11b-vision-preview", filename="image.jpg"):
    """Analyze image using Groq API (Llama Vision)"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "Groq API key not configured. Please add your API key in settings.",
                "service": "Groq"
            }
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Combine system prompt with additional context and filename
        combined_prompt = system_prompt
        if additional_context and additional_context.strip():
            combined_prompt += f"\n\nAdditional Context:\n{additional_context.strip()}"
        combined_prompt += f"\n\nFilename: {filename}"
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": combined_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500
        }
        
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            raw_content = result["choices"][0]["message"]["content"]
            parsed_result = parse_ai_response(raw_content)
            
            return {
                "success": True,
                "title": parsed_result.get('title', ''),
                "keywords": parsed_result.get('keywords', []),
                "raw_response": parsed_result.get('raw_response', raw_content),
                "service": "Groq"
            }
        else:
            # Parse and format error message nicely
            error_msg = "Groq API error occurred"
            try:
                error_data = response.json()
                if "error" in error_data and "message" in error_data["error"]:
                    if error_data["error"].get("code") == "invalid_api_key":
                        error_msg = "Invalid Groq API key. Please check your API key in settings."
                    elif error_data["error"].get("code") == "insufficient_quota":
                        error_msg = "Groq API quota exceeded. Please check your account billing."
                    else:
                        error_msg = f"Groq API error: {error_data['error']['message'].split('.')[0]}"
                else:
                    error_msg = f"Groq API returned status {response.status_code}"
            except:
                error_msg = f"Groq API returned status {response.status_code}"
                
            return {
                "success": False,
                "error": error_msg,
                "service": "Groq"
            }
            
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
            "error": f"Groq analysis failed: {str(e)}",
            "service": "Groq"
        }

def analyze_with_groq_90b(image_data, api_key, system_prompt, additional_context="", model="llama-3.2-90b-vision-preview", filename="image.jpg"):
    """Analyze image using Groq API (Llama 3.2 90B Vision)"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "Groq API key not configured. Please add your API key in settings.",
                "service": "Groq"
            }
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Combine system prompt with additional context and filename
        combined_prompt = system_prompt
        if additional_context and additional_context.strip():
            combined_prompt += f"\n\nAdditional Context:\n{additional_context.strip()}"
        combined_prompt += f"\n\nFilename: {filename}"
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": combined_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500
        }
        
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            return {
                "success": True,
                "result": content,
                "service": "Groq"
            }
        else:
            error_msg = f"Groq API error: {response.status_code}"
            if response.text:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', {}).get('message', error_msg)
                except:
                    error_msg = f"{error_msg}: {response.text}"
            
            return {
                "success": False,
                "error": error_msg,
                "service": "Groq"
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Groq analysis failed: {str(e)}",
            "service": "Groq"
        }

def analyze_with_grok(image_data, api_key, system_prompt, additional_context="", model="grok-2-vision", filename="image.jpg"):
    """Analyze image using Grok API"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "Grok API key not configured. Please add your API key in settings.",
                "service": "Grok"
            }
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Combine system prompt with additional context and filename
        combined_prompt = system_prompt
        if additional_context and additional_context.strip():
            combined_prompt += f"\n\nAdditional Context:\n{additional_context.strip()}"
        combined_prompt += f"\n\nFilename: {filename}"
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": combined_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500
        }
        
        response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            raw_content = result["choices"][0]["message"]["content"]
            parsed_result = parse_ai_response(raw_content)
            
            return {
                "success": True,
                "title": parsed_result.get('title', ''),
                "keywords": parsed_result.get('keywords', []),
                "raw_response": parsed_result.get('raw_response', raw_content),
                "service": "Grok"
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}",
                "service": "Grok"
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "service": "Grok"
        }

def analyze_with_llama(image_data, api_key, system_prompt, additional_context="", model="llama-3.1-70b", filename="image.jpg"):
    """Analyze image using Llama API"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "Llama API key not configured. Please add your API key in settings.",
                "service": "Llama"
            }
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Combine system prompt with additional context and filename
        combined_prompt = system_prompt
        if additional_context and additional_context.strip():
            combined_prompt += f"\n\nAdditional Context:\n{additional_context.strip()}"
        combined_prompt += f"\n\nFilename: {filename}"
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": combined_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500
        }
        
        response = requests.post(
            "https://api.llama-api.com/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            raw_content = result["choices"][0]["message"]["content"]
            parsed_result = parse_ai_response(raw_content)
            
            return {
                "success": True,
                "title": parsed_result.get('title', ''),
                "keywords": parsed_result.get('keywords', []),
                "raw_response": parsed_result.get('raw_response', raw_content),
                "service": "Llama"
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}",
                "service": "Llama"
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "service": "Llama"
        }

def analyze_with_cohere(image_data, api_key, system_prompt, additional_context="", model="command-r-plus", filename="image.jpg"):
    """Analyze image using Cohere Command A Vision"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "Cohere API key not configured. Please add your API key in settings.",
                "service": "Cohere"
            }
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Combine system prompt with additional context and filename
        combined_prompt = system_prompt
        if additional_context and additional_context.strip():
            combined_prompt += f"\n\nAdditional Context:\n{additional_context.strip()}"
        combined_prompt += f"\n\nFilename: {filename}"
        
        payload = {
            "model": model,
            "message": combined_prompt,
            "attachments": [
                {
                    "type": "image",
                    "data": f"data:image/jpeg;base64,{image_data}"
                }
            ],
            "max_tokens": 500
        }
        
        response = requests.post(
            "https://api.cohere.ai/v1/chat",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            raw_content = result["text"]
            print(f"DEBUG COHERE: Raw response: {raw_content[:200]}...")
            parsed_result = parse_ai_response(raw_content)
            print(f"DEBUG COHERE: Parsed result: {parsed_result}")
            
            return {
                "success": True,
                "title": parsed_result.get('title', ''),
                "keywords": parsed_result.get('keywords', []),
                "raw_response": parsed_result.get('raw_response', raw_content),
                "service": "Cohere"
            }
        else:
            # Parse and format error message nicely
            error_msg = "Cohere API error occurred"
            try:
                error_data = response.json()
                if "message" in error_data:
                    if "invalid api key" in error_data["message"].lower():
                        error_msg = "Invalid Cohere API key. Please check your API key in settings."
                    elif "quota" in error_data["message"].lower() or "limit" in error_data["message"].lower():
                        error_msg = "Cohere API quota exceeded. Please check your account usage."
                    else:
                        error_msg = f"Cohere API error: {error_data['message'].split('.')[0]}"
                else:
                    error_msg = f"Cohere API returned status {response.status_code}"
            except:
                error_msg = f"Cohere API returned status {response.status_code}"
                
            return {
                "success": False,
                "error": error_msg,
                "service": "Cohere"
            }
            
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
            "error": f"Cohere analysis failed: {str(e)}",
            "service": "Cohere"
        }

def analyze_with_deepseek(image_data, api_key, system_prompt, additional_context="", model="deepseek-vl-7b-chat", filename="image.jpg"):
    """Analyze image using DeepSeek API"""
    try:
        if not api_key:
            return {
                "success": False,
                "error": "DeepSeek API key not configured",
                "service": "DeepSeek"
            }
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Combine system prompt with additional context and filename
        combined_prompt = system_prompt
        if additional_context and additional_context.strip():
            combined_prompt += f"\n\nAdditional Context:\n{additional_context.strip()}"
        combined_prompt += f"\n\nFilename: {filename}"
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": combined_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500
        }
        
        response = requests.post(
            "https://api.deepseek.com/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            raw_content = result["choices"][0]["message"]["content"]
            parsed_result = parse_ai_response(raw_content)
            
            return {
                "success": True,
                "title": parsed_result.get('title', ''),
                "keywords": parsed_result.get('keywords', []),
                "raw_response": parsed_result.get('raw_response', raw_content),
                "service": "DeepSeek"
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}",
                "service": "DeepSeek"
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "service": "DeepSeek"
        }

@analysis_bp.route('/analyze-image', methods=['POST'])
def analyze_image():
    """Analyze image with selected AI services"""
    try:
        data = request.json
        image_data = data.get('image')  # base64 encoded image
        filename = data.get('filename', 'image.jpg')  # filename with fallback
        selected_services = data.get('services', [])
        
        if not image_data:
            return jsonify({"error": "No image data provided"}), 400
        
        if not selected_services:
            return jsonify({"error": "No services selected"}), 400
        
        # Remove data URL prefix if present
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        # Get user ID from request headers
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({"error": "User ID required"}), 400
        
        # Get user-specific settings
        user_settings = get_user_settings(user_id)
        results = []
        
        # Analyze with each selected service using user's system prompt
        global_prompt = user_settings.global_system_prompt or ""
        additional_context = user_settings.additional_context or ""
        
        for service in selected_services:
            if service == 'openai':
                result = analyze_with_openai(image_data, user_settings.openai_api_key, global_prompt, additional_context, user_settings.openai_model, filename)
                results.append(result)
            elif service == 'gemini':
                result = analyze_with_gemini(image_data, user_settings.gemini_api_key, global_prompt, additional_context, user_settings.gemini_model, filename)
                results.append(result)
            elif service == 'groq':
                result = analyze_with_groq(image_data, user_settings.groq_api_key, global_prompt, additional_context, user_settings.groq_model, filename)
                results.append(result)
            elif service == 'grok':
                result = analyze_with_grok(image_data, user_settings.grok_api_key, global_prompt, additional_context, user_settings.grok_model, filename)
                results.append(result)
            elif service == 'llama':
                result = analyze_with_llama(image_data, user_settings.llama_api_key, global_prompt, additional_context, user_settings.llama_model, filename)
                results.append(result)
            elif service == 'cohere':
                result = analyze_with_cohere(image_data, user_settings.cohere_api_key, global_prompt, additional_context, user_settings.cohere_model, filename)
                results.append(result)
            elif service == 'deepseek':
                result = analyze_with_deepseek(image_data, user_settings.deepseek_api_key, global_prompt, additional_context, user_settings.deepseek_model, filename)
                results.append(result)
        
        return jsonify({"results": results})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analysis_bp.route('/analyze-image-structured', methods=['POST'])
def analyze_image_structured():
    """Analyze image with structured AI service (new implementation)"""
    try:
        data = request.json
        image_data = data.get('image')  # base64 encoded image
        filename = data.get('filename', 'image.jpg')  # filename with fallback
        selected_services = data.get('services', [])
        custom_prompt = data.get('custom_prompt', '')
        
        if not image_data:
            return jsonify({"error": "No image data provided"}), 400
        
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
        ai_service = StructuredAIService()
        
        # Analyze with each selected service using structured approach
        for service in selected_services:
            print(f"DEBUG: Processing service with structured AI: {service}")
            
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
            
            # Generate metadata using structured AI service
            result = ai_service.generate_image_metadata(
                service=service,
                api_key=api_key,
                model=model,
                image_data=image_data,
                filename=filename,
                custom_prompt=custom_prompt
            )
            
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
            else:
                results.append({
                    "service": service.title(),
                    "success": False,
                    "error": result.error
                })
            
            print(f"DEBUG: Structured result from {service}: success={result.success}, title={result.title[:50]}...")
        
        return jsonify({"results": results})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analysis_bp.route('/analyze-images-batch', methods=['POST'])
def analyze_images_batch():
    """Analyze multiple images with structured AI service in parallel"""
    try:
        data = request.json
        images = data.get('images', [])  # Array of {image_data, filename}
        selected_services = data.get('services', [])
        custom_prompt = data.get('custom_prompt', '')
        
        if not images:
            return jsonify({"error": "No images provided"}), 400
        
        if not selected_services:
            return jsonify({"error": "No services selected"}), 400
        
        # Get user ID from request headers
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({"error": "User ID required"}), 400
        
        # Get user-specific settings
        user_settings = get_user_settings(user_id)
        
        # Initialize structured AI service
        ai_service = StructuredAIService()
        
        # Process all images in parallel
        import asyncio
        import concurrent.futures
        
        def analyze_single_image(image_data, filename, service):
            """Analyze a single image with a specific service"""
            try:
                print(f"DEBUG: Starting analysis for {filename} with {service}")
                
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
                    print(f"DEBUG: No API key for {service}")
                    return {
                        "filename": filename,
                        "service": service,
                        "success": False,
                        "error": f"No API key configured for {service}"
                    }
                
                print(f"DEBUG: API key found for {service}, proceeding with analysis")
                
                # Generate metadata using structured AI service
                result = ai_service.generate_image_metadata(
                    service=service,
                    api_key=api_key,
                    model=model,
                    image_data=image_data,
                    filename=filename,
                    custom_prompt=custom_prompt
                )
                
                print(f"DEBUG: Analysis result for {filename} with {service}: success={result.success}")
                if not result.success:
                    print(f"DEBUG: Analysis failed for {filename} with {service}: {result.error}")
                    print(f"DEBUG: Raw response: {result.raw_response[:500]}...")
                
                # Convert to expected format
                if result.success:
                    print(f"DEBUG: SUCCESS - {filename} with {service}: title='{result.title}', keywords={result.keywords}, category='{result.category}', releases='{result.releases}'")
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
                    print(f"DEBUG: FAILED - {filename} with {service}: {result.error}")
                    return {
                        "filename": filename,
                        "service": service,
                        "success": False,
                        "error": result.error
                    }
                    
            except Exception as e:
                print(f"DEBUG: Exception in analysis for {filename} with {service}: {str(e)}")
                return {
                    "filename": filename,
                    "service": service,
                    "success": False,
                    "error": str(e)
                }
        
        # Create all analysis tasks
        tasks = []
        for image in images:
            for service in selected_services:
                tasks.append((image['image_data'], image['filename'], service))
        
        # Execute all tasks in parallel using ThreadPoolExecutor with rate limiting
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:  # Reduced workers to avoid rate limits
            # Submit all tasks
            future_to_task = {
                executor.submit(analyze_single_image, image_data, filename, service): (filename, service)
                for image_data, filename, service in tasks
            }
            
            # Collect results as they complete with rate limiting
            completed_count = 0
            for future in concurrent.futures.as_completed(future_to_task):
                result = future.result()
                results.append(result)
                completed_count += 1
                
                # Add small delay every 5 requests to avoid rate limiting
                if completed_count % 5 == 0:
                    import time
                    time.sleep(1)  # 1 second delay every 5 requests
        
        # Group results by filename and return (no database persistence)
        grouped_results = {}
        for result in results:
            filename = result['filename']
            if filename not in grouped_results:
                grouped_results[filename] = []
            grouped_results[filename].append(result)

        return jsonify({
            "success": True,
            "results": grouped_results,
            "total_images": len(images),
            "total_analyses": len(results)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

