from flask import Blueprint, jsonify, request
import requests
import json
import re
from ..models.settings import Settings
from ..models.user import db

text_analysis_bp = Blueprint('text_analysis', __name__)

def parse_ai_response(raw_response):
    """Parse AI response to extract title and keywords from JSON format"""
    try:
        # First, try to find JSON in the response with more flexible pattern
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
            
            return {
                'success': True,
                'title': title,
                'keywords': keywords,
                'raw_response': raw_response
            }
    except (json.JSONDecodeError, AttributeError, TypeError):
        pass
    
    # Try to parse the entire response as JSON
    try:
        parsed_json = json.loads(raw_response.strip())
        if isinstance(parsed_json, dict) and 'title' in parsed_json and 'keywords' in parsed_json:
            title = parsed_json.get('title', '')
            keywords_str = parsed_json.get('keywords', '')
            keywords = [kw.strip() for kw in keywords_str.split(',') if kw.strip()] if keywords_str else []
            
            return {
                'success': True,
                'title': title,
                'keywords': keywords,
                'raw_response': raw_response
            }
    except (json.JSONDecodeError, AttributeError, TypeError):
        pass
    
    # Fallback: treat entire response as raw text
    return {
        'success': True,
        'title': '',
        'keywords': [],
        'raw_response': raw_response
    }

def get_settings():
    """Get the first settings record or create a default one"""
    settings = Settings.query.first()
    if not settings:
        settings = Settings()
        db.session.add(settings)
        db.session.commit()
    return settings

@text_analysis_bp.route('/analyze-text', methods=['POST'])
def analyze_text():
    try:
        data = request.get_json()
        text = data.get('text')
        filename = data.get('filename', 'text_prompt.txt')  # filename with fallback
        services = data.get('services', [])
        
        if not text or not services:
            return jsonify({'error': 'Text and services are required'}), 400
        
        settings = get_settings()
        results = []
        
        # Get global system prompt and additional context
        global_prompt = settings.global_system_prompt or ""
        additional_context = settings.additional_context or ""
        
        for service in services:
            try:
                if service == 'openai':
                    result = analyze_with_openai(text, settings.openai_api_key, global_prompt, filename)
                elif service == 'gemini':
                    result = analyze_with_gemini(text, settings.gemini_api_key, global_prompt, filename)
                elif service == 'groq':
                    result = analyze_with_groq(text, settings.groq_api_key, global_prompt, filename)
                elif service == 'grok':
                    result = analyze_with_grok(text, settings.grok_api_key, global_prompt, filename)
                elif service == 'llama':
                    result = analyze_with_llama(text, settings.llama_api_key, global_prompt, filename)
                elif service == 'cohere':
                    result = analyze_with_cohere(text, settings.cohere_api_key, global_prompt, filename)
                elif service == 'deepseek':
                    result = analyze_with_deepseek(text, settings.deepseek_api_key, global_prompt, filename)
                else:
                    result = {'success': False, 'error': f'Unknown service: {service}'}
                
                results.append({
                    'service': get_service_name(service),
                    'success': result.get('success', False),
                    'result': result.get('result', ''),
                    'error': result.get('error', '')
                })
                
            except Exception as e:
                results.append({
                    'service': get_service_name(service),
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({'results': results})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_service_name(service_id):
    service_names = {
        'openai': 'OpenAI GPT-4',
        'gemini': 'Google Gemini',
        'groq': 'Groq Llama',
        'grok': 'xAI Grok',
        'llama': 'Meta Llama',
        'cohere': 'Cohere Command',
        'deepseek': 'DeepSeek'
    }
    return service_names.get(service_id, service_id)

def analyze_with_openai(text, api_key, system_prompt, filename="text_prompt.txt"):
    try:
        if not api_key:
            return {'success': False, 'error': 'OpenAI API key not configured'}
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Add filename to system prompt
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}"
        
        payload = {
            "model": "gpt-4",
            "messages": [
                {"role": "system", "content": enhanced_prompt},
                {"role": "user", "content": text}
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
                'success': True,
                'title': parsed_result.get('title', ''),
                'keywords': parsed_result.get('keywords', []),
                'raw_response': parsed_result.get('raw_response', raw_content)
            }
        else:
            return {'success': False, 'error': f'HTTP {response.status_code}: {response.text}'}
            
    except Exception as e:
        return {'success': False, 'error': str(e)}

def analyze_with_gemini(text, api_key, system_prompt, filename="text_prompt.txt"):
    try:
        if not api_key:
            return {'success': False, 'error': 'Gemini API key not configured'}
        
        headers = {"Content-Type": "application/json"}
        
        # Add filename to system prompt
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}\n\n{text}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": enhanced_prompt}
                    ]
                }
            ]
        }
        
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if "candidates" in result and len(result["candidates"]) > 0:
                content = result["candidates"][0]["content"]["parts"][0]["text"]
                return {'success': True, 'result': content}
            else:
                return {'success': False, 'error': 'No response generated'}
        else:
            return {'success': False, 'error': f'HTTP {response.status_code}: {response.text}'}
            
    except Exception as e:
        return {'success': False, 'error': str(e)}

def analyze_with_groq(text, api_key, system_prompt, filename="text_prompt.txt"):
    try:
        if not api_key:
            return {'success': False, 'error': 'Groq API key not configured. Please add your API key in settings.'}
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Add filename to system prompt
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}"
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": enhanced_prompt},
                {"role": "user", "content": text}
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
            return {
                'success': True,
                'result': result["choices"][0]["message"]["content"]
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
            
            return {'success': False, 'error': error_msg}
            
    except requests.exceptions.Timeout:
        return {'success': False, 'error': 'Groq API request timed out. Please try again.'}
    except requests.exceptions.ConnectionError:
        return {'success': False, 'error': 'Unable to connect to Groq API. Please check your internet connection.'}
    except Exception as e:
        return {'success': False, 'error': f'Groq analysis failed: {str(e)}'}

def analyze_with_grok(text, api_key, system_prompt, filename="text_prompt.txt"):
    try:
        if not api_key:
            return {'success': False, 'error': 'Grok API key not configured'}
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Add filename to system prompt
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}"
        
        payload = {
            "model": "grok-beta",
            "messages": [
                {"role": "system", "content": enhanced_prompt},
                {"role": "user", "content": text}
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
            return {
                'success': True,
                'result': result["choices"][0]["message"]["content"]
            }
        else:
            return {'success': False, 'error': f'HTTP {response.status_code}: {response.text}'}
            
    except Exception as e:
        return {'success': False, 'error': str(e)}

def analyze_with_llama(text, api_key, system_prompt, filename="text_prompt.txt"):
    try:
        if not api_key:
            return {'success': False, 'error': 'Llama API key not configured'}
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Add filename to system prompt
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}"
        
        payload = {
            "model": "llama-3.1-70b-instruct",
            "messages": [
                {"role": "system", "content": enhanced_prompt},
                {"role": "user", "content": text}
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
            return {
                'success': True,
                'result': result["choices"][0]["message"]["content"]
            }
        else:
            return {'success': False, 'error': f'HTTP {response.status_code}: {response.text}'}
            
    except Exception as e:
        return {'success': False, 'error': str(e)}

def analyze_with_cohere(text, api_key, system_prompt, filename="text_prompt.txt"):
    try:
        if not api_key:
            return {'success': False, 'error': 'Cohere API key not configured'}
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Add filename to system prompt
        enhanced_message = f"{system_prompt}\n\nFilename: {filename}\n\n{text}"
        
        payload = {
            "model": "command-r-plus-08-2024",
            "message": enhanced_message
        }
        
        response = requests.post(
            "https://api.cohere.ai/v1/chat",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return {
                'success': True,
                'result': result["text"]
            }
        else:
            return {'success': False, 'error': f'HTTP {response.status_code}: {response.text}'}
            
    except Exception as e:
        return {'success': False, 'error': str(e)}

def analyze_with_deepseek(text, api_key, system_prompt, filename="text_prompt.txt"):
    try:
        if not api_key:
            return {'success': False, 'error': 'DeepSeek API key not configured'}
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Add filename to system prompt
        enhanced_prompt = f"{system_prompt}\n\nFilename: {filename}"
        
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": enhanced_prompt},
                {"role": "user", "content": text}
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
            return {
                'success': True,
                'result': result["choices"][0]["message"]["content"]
            }
        else:
            return {'success': False, 'error': f'HTTP {response.status_code}: {response.text}'}
            
    except Exception as e:
        return {'success': False, 'error': str(e)}