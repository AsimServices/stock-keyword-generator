from flask import Blueprint, jsonify, request
import requests
import json
import re
from ..models.settings import Settings
from ..models.user_api_keys import UserApiKeys
from ..models.user import db
from ..services.structured_ai import StructuredAIService

text_analysis_bp = Blueprint('text_analysis', __name__)

def parse_ai_response(raw_response):
    """Parse AI response to extract title and keywords from JSON format"""
    print(f"DEBUG: Raw AI response: {raw_response[:200]}...")  # Debug log
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
            
            # Log what we got from AI
            print(f"DEBUG: Full parsed JSON (text first parse): {parsed_json}")
            print(f"DEBUG: Category from AI (text first parse): '{category}' (type: {type(category)})")
            print(f"DEBUG: Releases from AI (text first parse): '{releases}' (type: {type(releases)})")
            
            result = {
                'success': True,
                'title': title,
                'keywords': keywords,
                'category': category,
                'releases': releases,
                'raw_response': raw_response
            }
            print(f"DEBUG: Text analysis result: {result}")  # Debug log
            print(f"DEBUG: Category from AI (text): '{category}'")  # Debug log
            print(f"DEBUG: Releases from AI (text): '{releases}'")  # Debug log
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

@text_analysis_bp.route('/analyze-text', methods=['POST'])
def analyze_text():
    try:
        data = request.get_json()
        text = data.get('text')
        filename = data.get('filename', 'text_prompt.txt')  # filename with fallback
        services = data.get('services', [])
        
        if not text or not services:
            return jsonify({'error': 'Text and services are required'}), 400
        
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
        
        for service in services:
            try:
                if service == 'openai':
                    result = analyze_with_openai(text, user_settings.openai_api_key, global_prompt, filename, user_settings.openai_model)
                elif service == 'gemini':
                    result = analyze_with_gemini(text, user_settings.gemini_api_key, global_prompt, filename)
                elif service == 'groq':
                    result = analyze_with_groq(text, user_settings.groq_api_key, global_prompt, filename)
                elif service == 'grok':
                    result = analyze_with_grok(text, user_settings.grok_api_key, global_prompt, filename)
                elif service == 'llama':
                    result = analyze_with_llama(text, user_settings.llama_api_key, global_prompt, filename)
                elif service == 'cohere':
                    result = analyze_with_cohere(text, user_settings.cohere_api_key, global_prompt, filename)
                elif service == 'deepseek':
                    result = analyze_with_deepseek(text, user_settings.deepseek_api_key, global_prompt, filename)
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

@text_analysis_bp.route('/analyze-text-structured', methods=['POST'])
def analyze_text_structured():
    """Analyze text with structured AI service (new implementation)"""
    try:
        data = request.get_json()
        text = data.get('text')
        filename = data.get('filename', 'text_prompt.txt')
        services = data.get('services', [])
        custom_prompt = data.get('custom_prompt', '')
        
        if not text or not services:
            return jsonify({'error': 'Text and services are required'}), 400
        
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
        for service in services:
            print(f"DEBUG: Processing text service with structured AI: {service}")
            
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
                    "service": get_service_name(service),
                    "success": False,
                    "error": f"No API key configured for {service}"
                })
                continue
            
            # Generate metadata using structured AI service
            result = ai_service.generate_text_metadata(
                service=service,
                api_key=api_key,
                model=model,
                text=text,
                filename=filename,
                custom_prompt=custom_prompt
            )
            
            # Convert to expected format
            if result.success:
                results.append({
                    "service": get_service_name(service),
                    "success": True,
                    "title": result.title,
                    "keywords": result.keywords,
                    "category": result.category,
                    "releases": result.releases,
                    "raw_response": result.raw_response
                })
            else:
                results.append({
                    "service": get_service_name(service),
                    "success": False,
                    "error": result.error
                })
            
            print(f"DEBUG: Structured text result from {service}: success={result.success}, title={result.title[:50]}...")
        
        # Save successful results to database
        from ..models.analysis_result import AnalysisResult, db
        from datetime import datetime
        saved_results = []
        
        for result in results:
            # Create frontend-style result object for database storage
            if result.get('success', False):
                # Successful result
                frontend_result = {
                    'id': f"{user_id}-text-{result['service']}-{int(datetime.now().timestamp() * 1000)}",
                    'filename': filename,
                    'type': 'text',
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
                    'id': f"{user_id}-text-{result['service']}-{int(datetime.now().timestamp() * 1000)}",
                    'filename': filename,
                    'type': 'text',
                    'service': result['service'].lower(),
                    'status': 'error',
                    'error': result.get('error', 'Unknown error')
                }
            
            # Save to database
            try:
                analysis_result = AnalysisResult.create_from_frontend_result(user_id, frontend_result)
                db.session.add(analysis_result)
                saved_results.append(frontend_result)
                print(f"DEBUG: Saved text result to database: {filename} with {result['service']} - Status: {frontend_result.get('status', 'completed')}")
            except Exception as e:
                print(f"DEBUG: Failed to save text result to database: {str(e)}")
        
        # Commit all database changes
        try:
            db.session.commit()
            print(f"DEBUG: Saved {len(saved_results)} text results to database")
        except Exception as e:
            db.session.rollback()
            print(f"DEBUG: Database commit failed: {str(e)}")

        return jsonify({
            'results': results,
            'saved_to_database': len(saved_results)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_service_name(service_id):
    service_names = {
        'openai': 'OpenAI GPT-5',
        'gemini': 'Google Gemini',
        'groq': 'Groq Llama',
        'grok': 'xAI Grok',
        'llama': 'Meta Llama',
        'cohere': 'Cohere Command',
        'deepseek': 'DeepSeek'
    }
    return service_names.get(service_id, service_id)

def analyze_with_openai(text, api_key, system_prompt, filename="text_prompt.txt", model="gpt-5"):
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
            "model": model,
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
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
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
            "model": "llama-3.1-70b-versatile",
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

def analyze_with_groq_mixtral(text, api_key, system_prompt, filename="text_prompt.txt"):
    """Analyze text using Groq API (Mixtral 8x7B)"""
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
            "model": "mixtral-8x7b-32768",
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