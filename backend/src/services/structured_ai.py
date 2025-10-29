"""
Structured AI Service for Adobe Stock Metadata Generation
Implements JSON schema-based responses for all AI models with security validation
"""

import json
import re
import requests
import base64
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class MetadataResult:
    """Structured result for AI metadata generation"""
    success: bool
    title: str = ""
    keywords: List[str] = None
    category: str = ""
    releases: str = ""
    error: str = ""
    raw_response: str = ""

    def __post_init__(self):
        if self.keywords is None:
            self.keywords = []

class SecurityValidator:
    """Security validation for AI service inputs"""
    
    @staticmethod
    def validate_api_key(api_key: str, service: str) -> bool:
        """Validate API key format and security"""
        if not api_key or not isinstance(api_key, str):
            logger.warning(f"Invalid API key for {service}: empty or not string")
            return False
        
        # More lenient validation - just check if it's not empty and has reasonable length
        if len(api_key.strip()) < 5:
            logger.warning(f"API key too short for {service}: {len(api_key)} chars")
            return False
        
        # Basic format validation for different services (more lenient)
        if service == "openai":
            # OpenAI keys typically start with sk- but not always
            return len(api_key) > 20
        elif service == "gemini":
            return len(api_key) > 10
        elif service == "groq":
            # Groq keys typically start with gsk_ but not always
            return len(api_key) > 20
        elif service == "grok":
            return len(api_key) > 10
        elif service == "llama":
            return len(api_key) > 10
        elif service == "cohere":
            return len(api_key) > 10
        elif service == "deepseek":
            return len(api_key) > 10
        
        return len(api_key) > 10
    
    @staticmethod
    def sanitize_input(text: str) -> str:
        """Sanitize user input to prevent injection attacks"""
        if not isinstance(text, str):
            return ""
        
        # Remove potentially dangerous characters
        dangerous_chars = ['<', '>', '"', "'", '&', '\x00', '\r', '\n']
        for char in dangerous_chars:
            text = text.replace(char, '')
        
        # Limit length to prevent abuse
        return text[:1000] if len(text) > 1000 else text
    
    @staticmethod
    def validate_image_data(image_data: str) -> bool:
        """Validate base64 image data"""
        if not image_data or not isinstance(image_data, str):
            logger.warning("Image data is empty or not a string")
            return False
        
        # Check if it's valid base64
        try:
            if image_data.startswith('data:image/'):
                base64_data = image_data.split(',')[1]
            else:
                base64_data = image_data
            
            # More lenient validation - just check if it can be decoded
            decoded = base64.b64decode(base64_data)
            if len(decoded) == 0:
                logger.warning("Decoded image data is empty")
                return False
            
            # Increase size limit to 20MB for high-resolution images
            if len(decoded) > 20 * 1024 * 1024:  # Max 20MB
                logger.warning(f"Image too large: {len(decoded)} bytes")
                return False
            
            logger.info(f"Image validation passed: {len(decoded)} bytes")
            return True
        except Exception as e:
            logger.warning(f"Image data validation failed: {str(e)}")
            return False
    
    @staticmethod
    def validate_video_data(video_data: str) -> bool:
        """Validate base64 video data (handles both data URLs and raw base64)"""
        if not video_data or not isinstance(video_data, str):
            return False
        
        # Check if it's valid base64
        try:
            if video_data.startswith('data:video/'):
                base64_data = video_data.split(',')[1]
            elif video_data.startswith('data:'):
                # Handle other data URLs (like data:video/mp4;base64,...)
                base64_data = video_data.split(',')[1]
            else:
                base64_data = video_data
            
            # Validate base64 format
            if not base64_data or len(base64_data) < 10:  # Minimum size check
                return False
                
            decoded = base64.b64decode(base64_data)
            return len(decoded) > 0 and len(decoded) < 100 * 1024 * 1024  # Max 100MB for videos
        except Exception as e:
            return False

class StructuredAIService:
    """Main service for structured AI metadata generation"""
    
    def __init__(self):
        self.validator = SecurityValidator()
    
    def generate_image_metadata(self, service: str, api_key: str, model: str, 
                              image_data: str, filename: str, custom_prompt: str = "") -> MetadataResult:
        """Generate structured metadata for images using specified AI service with retry mechanism"""
        
        logger.info(f"Starting image metadata generation for {service} with filename: {filename}")
        
        # Security validation
        if not self.validator.validate_api_key(api_key, service):
            logger.error(f"API key validation failed for {service}")
            return MetadataResult(success=False, error="Invalid API key format")
        
        if not self.validator.validate_image_data(image_data):
            logger.error(f"Image data validation failed for {filename}")
            return MetadataResult(success=False, error="Invalid image data")
        
        custom_prompt = self.validator.sanitize_input(custom_prompt)
        filename = self.validator.sanitize_input(filename)
        
        logger.info(f"Validation passed for {service}, proceeding with analysis")
        
        # Retry mechanism - try up to 3 times
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Attempt {attempt + 1}/{max_retries} for {service} with {filename}")
                
                if service == "openai":
                    result = self._generate_with_openai(api_key, model, image_data, filename, custom_prompt)
                elif service == "gemini":
                    result = self._generate_with_gemini(api_key, model, image_data, filename, custom_prompt)
                elif service == "groq":
                    result = self._generate_with_groq(api_key, model, image_data, filename, custom_prompt)
                elif service == "grok":
                    result = self._generate_with_grok(api_key, model, image_data, filename, custom_prompt)
                elif service == "llama":
                    result = self._generate_with_llama(api_key, model, image_data, filename, custom_prompt)
                elif service == "cohere":
                    result = self._generate_with_cohere(api_key, model, image_data, filename, custom_prompt)
                elif service == "deepseek":
                    result = self._generate_with_deepseek(api_key, model, image_data, filename, custom_prompt)
                else:
                    logger.error(f"Unsupported service: {service}")
                    return MetadataResult(success=False, error=f"Unsupported service: {service}")
                
                # If successful, return immediately
                if result.success:
                    logger.info(f"SUCCESS on attempt {attempt + 1} for {filename} with {service}")
                    return result
                
                # If not successful and not the last attempt, log and continue
                if attempt < max_retries - 1:
                    logger.warning(f"Attempt {attempt + 1} failed for {filename} with {service}: {result.error}")
                    logger.info(f"Retrying in 2 seconds...")
                    import time
                    time.sleep(2)  # Wait 2 seconds before retry
                else:
                    logger.error(f"All {max_retries} attempts failed for {filename} with {service}")
                    return result
                    
            except Exception as e:
                logger.error(f"Exception in attempt {attempt + 1} for {service} with {filename}: {str(e)}")
                if attempt == max_retries - 1:
                    return MetadataResult(success=False, error=f"AI service error after {max_retries} attempts: {str(e)}")
                else:
                    logger.info(f"Retrying after exception in 2 seconds...")
                    import time
                    time.sleep(2)
    
    def generate_text_metadata(self, service: str, api_key: str, model: str, 
                             text: str, filename: str, custom_prompt: str = "") -> MetadataResult:
        """Generate structured metadata for text using specified AI service"""
        
        # Security validation
        if not self.validator.validate_api_key(api_key, service):
            return MetadataResult(success=False, error="Invalid API key format")
        
        text = self.validator.sanitize_input(text)
        custom_prompt = self.validator.sanitize_input(custom_prompt)
        filename = self.validator.sanitize_input(filename)
        
        try:
            if service == "openai":
                return self._generate_text_with_openai(api_key, model, text, filename, custom_prompt)
            elif service == "gemini":
                return self._generate_text_with_gemini(api_key, model, text, filename, custom_prompt)
            elif service == "groq":
                return self._generate_text_with_groq(api_key, model, text, filename, custom_prompt)
            elif service == "grok":
                return self._generate_text_with_grok(api_key, model, text, filename, custom_prompt)
            elif service == "llama":
                return self._generate_text_with_llama(api_key, model, text, filename, custom_prompt)
            elif service == "cohere":
                return self._generate_text_with_cohere(api_key, model, text, filename, custom_prompt)
            elif service == "deepseek":
                return self._generate_text_with_deepseek(api_key, model, text, filename, custom_prompt)
            else:
                return MetadataResult(success=False, error=f"Unsupported service: {service}")
                
        except Exception as e:
            logger.error(f"Error in {service} text metadata generation: {str(e)}")
            return MetadataResult(success=False, error=f"AI service error: {str(e)}")
    
    
    def _get_structured_system_prompt(self) -> str:
        """Get the structured system prompt for all AI models"""
        return """You are an expert at generating Adobe Stock metadata. 

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY a valid JSON object
2. Do NOT include any explanatory text, markdown, or formatting
3. Do NOT use code blocks or backticks
4. Start your response with { and end with }
5. Use double quotes for all strings
6. Keywords must be an array of strings, not a comma-separated string

Required JSON format:
{
  "title": "A descriptive title (170-200 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "category": 11,
  "releases": "None"
}

KEYWORD REQUIREMENTS:
- Generate relevant keywords based on the image content SEO optimized
- Include descriptive terms, colors, emotions, concepts
- Use single words or short phrases
- Cover different aspects: visual elements, mood, use cases, technical terms
- Think about how buyers would search for this image
- Keywords should be diverse and comprehensive

CATEGORY SELECTION:
Choose exactly one category number (1–21) that best matches the asset:
1 Animals | 2 Buildings and Architecture | 3 Business | 4 Drinks | 5 The Environment | 6 States of Mind | 7 Food | 8 Graphic Resources | 9 Hobbies and Leisure | 10 Industry | 11 Landscape | 12 Lifestyle | 13 People | 14 Plants and Flowers | 15 Culture and Religion | 16 Science | 17 Social Issues | 18 Sports | 19 Technology | 20 Transport | 21 Travel

Valid releases: None, Model, Property, Model and Property

Example response (copy this exact format):
{"title": "Golden sunset over mountain valley with dramatic clouds", "keywords": ["sunset", "mountain", "landscape", "golden hour", "dramatic sky", "nature", "outdoor", "scenic", "beautiful", "peaceful", "serene", "majestic", "breathtaking", "stunning", "colorful", "warm", "glowing", "radiant", "brilliant", "spectacular", "panoramic", "vast", "expansive", "horizon", "clouds", "sky", "valley", "peaks", "silhouette", "atmosphere", "lighting", "golden", "orange", "pink", "purple", "dramatic", "moody", "romantic", "inspiring", "calming", "meditation", "travel", "adventure", "hiking", "camping", "photography", "wallpaper", "background", "print", "poster"], "category": 11, "releases": "None"}"""
    
    def _parse_structured_response(self, response_text: str) -> MetadataResult:
        """Parse structured JSON response from AI models (standard parser for all services)"""
        try:
            # Clean the response text
            response_text = response_text.strip()
            logger.info(f"Raw AI response: {response_text[:500]}...")
            
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                json_str = response_text.split('```')[1] if '```' in response_text else response_text
            elif response_text.startswith('```json'):
                json_str = response_text.replace('```json', '').replace('```', '').strip()
            else:
                json_str = response_text
            
            # Try to extract JSON if it's embedded in text
            start_idx = json_str.find('{')
            if start_idx != -1:
                # Count braces to find complete JSON object
                brace_count = 0
                end_idx = start_idx
                for i, char in enumerate(json_str[start_idx:], start_idx):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i
                            break
                json_str = json_str[start_idx:end_idx + 1] if brace_count == 0 else json_str
            
            # Check if JSON is truncated (common issue with Cohere)
            if json_str.count('"') % 2 != 0:
                logger.warning("JSON appears to be truncated (unmatched quotes), attempting to fix")
                # Try to find the last complete keyword and close the JSON
                last_complete_quote = json_str.rfind('"')
                if last_complete_quote != -1:
                    # Find the last complete keyword
                    before_last_quote = json_str[:last_complete_quote]
                    if '",' in before_last_quote:
                        # Find the last complete keyword entry
                        last_complete_entry = before_last_quote.rfind('",')
                        if last_complete_entry != -1:
                            json_str = json_str[:last_complete_entry + 1] + ']'
                            # Close the JSON object
                            if json_str.count('{') > json_str.count('}'):
                                json_str += '}'
                            logger.info(f"Attempted to fix truncated JSON: {json_str[:200]}...")
            
            # Parse JSON
            result_data = json.loads(json_str)
            logger.info(f"Parsed JSON: {result_data}")
            
            # Validate required fields
            title = result_data.get('title', '')
            keywords = result_data.get('keywords', [])
            category = result_data.get('category', 'Landscape')
            releases = result_data.get('releases', 'None')
            
            # Process keywords
            if isinstance(keywords, str):
                keywords = [kw.strip() for kw in keywords.split(',') if kw.strip()]
            elif not isinstance(keywords, list):
                keywords = []
            
            # Limit to 50 keywords
            if len(keywords) > 50:
                keywords = keywords[:50]
            
            # Validate category - handle both integer and string formats
            valid_categories_dict = {
                1: 'Animals', 2: 'Buildings and Architecture', 3: 'Business', 4: 'Drinks', 
                5: 'The Environment', 6: 'States of Mind', 7: 'Food', 8: 'Graphic Resources', 
                9: 'Hobbies and Leisure', 10: 'Industry', 11: 'Landscape', 12: 'Lifestyle', 
                13: 'People', 14: 'Plants and Flowers', 15: 'Culture and Religion', 16: 'Science', 
                17: 'Social Issues', 18: 'Sports', 19: 'Technology', 20: 'Transport', 21: 'Travel'
            }
            
            # Convert category to the correct format
            if isinstance(category, int) and category in valid_categories_dict:
                category = valid_categories_dict[category]
            elif isinstance(category, str):
                # Handle old string format by mapping to new format
                category_mapping = {
                    'Animals': 'Animals', 'Buildings': 'Buildings and Architecture', 
                    'Business': 'Business', 'Drinks': 'Drinks', 'Environment': 'The Environment', 
                    'States of Mind': 'States of Mind', 'Food': 'Food', 'Graphics': 'Graphic Resources', 
                    'Hobbies': 'Hobbies and Leisure', 'Industry': 'Industry', 'Landscape': 'Landscape', 
                    'Lifestyle': 'Lifestyle', 'People': 'People', 'Plants': 'Plants and Flowers', 
                    'Culture': 'Culture and Religion', 'Science': 'Science', 'Social Issues': 'Social Issues', 
                    'Sports': 'Sports', 'Technology': 'Technology', 'Transport': 'Transport', 'Travel': 'Travel'
                }
                category = category_mapping.get(category, 'Landscape')
            else:
                category = 'Landscape'
            
            # Validate releases
            valid_releases = ['None', 'Model', 'Property', 'Model and Property']
            if releases not in valid_releases:
                releases = 'None'
            
            logger.info(f"Final result: title='{title}', keywords={len(keywords)}, category='{category}', releases='{releases}'")
            
            return MetadataResult(
                success=True,
                title=title,
                keywords=keywords,
                category=category,
                releases=releases,
                raw_response=response_text
            )
            
        except (json.JSONDecodeError, Exception) as e:
            logger.error(f"JSON parsing failed: {str(e)}")
            logger.error(f"Response: {response_text[:1000]}")
            return MetadataResult(
                success=False,
                error=f"Failed to parse AI response: {str(e)}",
                raw_response=response_text
            )
    
    def _parse_cohere_response(self, response_text: str) -> MetadataResult:
        """Parse Cohere JSON response using standard structured parser"""
        return self._parse_structured_response(response_text)
    
    # OpenAI Implementation
    def _generate_with_openai(self, api_key: str, model: str, image_data: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate metadata using OpenAI with structured response"""
        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            # Prepare image data
            if image_data.startswith('data:image/'):
                image_data = image_data.split(',')[1]
            
            system_prompt = self._get_structured_system_prompt()
            user_prompt = f"Analyze this image for Adobe Stock submission. Filename: {filename}"
            if custom_prompt:
                user_prompt += f"\n\nAdditional context: {custom_prompt}"
            
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": [
                        {"type": "text", "text": user_prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
                    ]}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.7,
                 "max_tokens": 2000
            }
            
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code != 200:
                return MetadataResult(success=False, error=f"OpenAI API error: {response.status_code}")
            
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            return self._parse_structured_response(content)
            
        except Exception as e:
            return MetadataResult(success=False, error=f"OpenAI request failed: {str(e)}")
    
    def _generate_text_with_openai(self, api_key: str, model: str, text: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate text metadata using OpenAI"""
        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            system_prompt = self._get_structured_system_prompt()
            user_prompt = f"Analyze this text for Adobe Stock submission concept. Filename: {filename}\n\nText: {text}"
            if custom_prompt:
                user_prompt += f"\n\nAdditional context: {custom_prompt}"
            
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.7,
                 "max_tokens": 2000
            }
            
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code != 200:
                return MetadataResult(success=False, error=f"OpenAI API error: {response.status_code}")
            
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            return self._parse_structured_response(content)
            
        except Exception as e:
            return MetadataResult(success=False, error=f"OpenAI request failed: {str(e)}")
    
    # Gemini Implementation
    def _generate_with_gemini(self, api_key: str, model: str, image_data: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate metadata using Google Gemini with structured response"""
        try:
            headers = {
                'Content-Type': 'application/json'
            }
            
            # Prepare image data
            if image_data.startswith('data:image/'):
                image_data = image_data.split(',')[1]
            
            system_prompt = self._get_structured_system_prompt()
            user_prompt = f"Analyze this image for Adobe Stock submission. Filename: {filename}"
            if custom_prompt:
                user_prompt += f"\n\nAdditional context: {custom_prompt}"
            
            payload = {
                "contents": [{
                    "parts": [
                        {"text": f"{system_prompt}\n\n{user_prompt}"},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_data
                            }
                        }
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 2000,
                    "responseMimeType": "application/json"
                }
            }
            
            logger.info(f"Gemini request payload: {json.dumps(payload, indent=2)[:500]}...")
            
            response = requests.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}',
                headers=headers,
                json=payload,
                timeout=30
            )
            
            logger.info(f"Gemini API response status: {response.status_code}")
            logger.info(f"Gemini API response: {response.text[:500]}...")
            
            if response.status_code != 200:
                return MetadataResult(success=False, error=f"Gemini API error: {response.status_code} - {response.text}")
            
            result = response.json()
            logger.info(f"Gemini parsed response: {result}")
            
            if 'candidates' not in result or not result['candidates']:
                return MetadataResult(success=False, error="No candidates in Gemini response")
            
            candidate = result['candidates'][0]
            
            # Check if the response was truncated due to token limit
            if candidate.get('finishReason') == 'MAX_TOKENS':
                logger.warning("Gemini response truncated due to MAX_TOKENS limit")
                return MetadataResult(
                    success=False, 
                    error="Response truncated due to token limit. Try with a shorter prompt or increase maxOutputTokens."
                )
            
            if 'content' not in candidate or 'parts' not in candidate['content']:
                return MetadataResult(success=False, error="Invalid Gemini response structure")
            
            content = candidate['content']['parts'][0]['text']
            logger.info(f"Gemini content: {content[:200]}...")
            
            return self._parse_structured_response(content)
            
        except Exception as e:
            return MetadataResult(success=False, error=f"Gemini request failed: {str(e)}")
    
    def _generate_text_with_gemini(self, api_key: str, model: str, text: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate text metadata using Gemini"""
        try:
            headers = {
                'Content-Type': 'application/json'
            }
            
            system_prompt = self._get_structured_system_prompt()
            user_prompt = f"Analyze this text for Adobe Stock submission concept. Filename: {filename}\n\nText: {text}"
            if custom_prompt:
                user_prompt += f"\n\nAdditional context: {custom_prompt}"
            
            payload = {
                "contents": [{
                    "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 2000,
                    "responseMimeType": "application/json"
                }
            }
            
            response = requests.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}',
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code != 200:
                return MetadataResult(success=False, error=f"Gemini API error: {response.status_code}")
            
            result = response.json()
            content = result['candidates'][0]['content']['parts'][0]['text']
            
            return self._parse_structured_response(content)
            
        except Exception as e:
            return MetadataResult(success=False, error=f"Gemini request failed: {str(e)}")
    
    # Groq Implementation
    def _generate_with_groq(self, api_key: str, model: str, image_data: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate metadata using Groq with structured response"""
        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            system_prompt = self._get_structured_system_prompt()
            user_prompt = f"Analyze this image for Adobe Stock submission. Filename: {filename}"
            if custom_prompt:
                user_prompt += f"\n\nAdditional context: {custom_prompt}"
            
            # Note: Groq doesn't support vision for all models, so we'll use text-only approach
            payload = {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"{user_prompt}\n\nNote: This is an image analysis request. Please provide metadata based on the filename and context."}
                ],
                "model": model,
                "temperature": 0.7,
                 "max_tokens": 2000,
                "response_format": {"type": "json_object"}
            }
            
            response = requests.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code != 200:
                return MetadataResult(success=False, error=f"Groq API error: {response.status_code}")
            
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            return self._parse_structured_response(content)
            
        except Exception as e:
            return MetadataResult(success=False, error=f"Groq request failed: {str(e)}")
    
    def _generate_text_with_groq(self, api_key: str, model: str, text: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate text metadata using Groq"""
        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            system_prompt = self._get_structured_system_prompt()
            user_prompt = f"Analyze this text for Adobe Stock submission concept. Filename: {filename}\n\nText: {text}"
            if custom_prompt:
                user_prompt += f"\n\nAdditional context: {custom_prompt}"
            
            payload = {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "model": model,
                "temperature": 0.7,
                 "max_tokens": 2000,
                "response_format": {"type": "json_object"}
            }
            
            response = requests.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code != 200:
                return MetadataResult(success=False, error=f"Groq API error: {response.status_code}")
            
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            return self._parse_structured_response(content)
            
        except Exception as e:
            return MetadataResult(success=False, error=f"Groq request failed: {str(e)}")
    
    # Placeholder implementations for other services
    def _generate_with_grok(self, api_key: str, model: str, image_data: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate metadata using xAI Grok (placeholder)"""
        return MetadataResult(success=False, error="Grok service not yet implemented")
    
    def _generate_text_with_grok(self, api_key: str, model: str, text: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate text metadata using xAI Grok (placeholder)"""
        return MetadataResult(success=False, error="Grok service not yet implemented")
    
    def _generate_with_llama(self, api_key: str, model: str, image_data: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate metadata using Meta Llama (placeholder)"""
        return MetadataResult(success=False, error="Llama service not yet implemented")
    
    def _generate_text_with_llama(self, api_key: str, model: str, text: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate text metadata using Meta Llama (placeholder)"""
        return MetadataResult(success=False, error="Llama service not yet implemented")
    
    def _generate_with_cohere(self, api_key: str, model: str, image_data: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate metadata using Cohere with structured response (follows same pattern as other APIs)"""
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            # Prepare image data
            if image_data.startswith('data:image/'):
                image_data = image_data.split(',')[1]
            
            # Use the standard structured system prompt (same as other APIs)
            system_prompt = self._get_structured_system_prompt()
            
            # Create user prompt
            user_prompt = f"Analyze this image for Adobe Stock submission. Filename: {filename}"
            if custom_prompt:
                user_prompt += f"\n\nAdditional context: {custom_prompt}"
            
            # Combine system prompt with user prompt
            combined_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            # Use Cohere API format with full token limit for complete responses
            payload = {
                "model": model,
                "message": combined_prompt,
                "attachments": [
                    {
                        "type": "image",
                        "data": f"data:image/jpeg;base64,{image_data}"
                    }
                ],
                "max_tokens": 2000,  # Match other AI services for complete responses
                "temperature": 0.7
            }
            
            # Make API request
            response = requests.post(
                "https://api.cohere.ai/v1/chat",
                headers=headers,
                json=payload,
                timeout=60
            )
            
            # Handle response
            if response.status_code != 200:
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
                return MetadataResult(success=False, error=error_msg)
            
            # Parse response using standard parser (same as other APIs)
            result = response.json()
            raw_content = result["text"]
            
            logger.info(f"Cohere raw response: {raw_content[:500]}...")
            
            # Use the standard structured response parser (same as other APIs)
            return self._parse_cohere_response(raw_content)
            
        except requests.exceptions.Timeout:
            return MetadataResult(success=False, error="Cohere API request timed out. Please try again.")
        except requests.exceptions.ConnectionError:
            return MetadataResult(success=False, error="Unable to connect to Cohere API. Please check your internet connection.")
        except Exception as e:
            return MetadataResult(success=False, error=f"Cohere analysis failed: {str(e)}")
    
    def _generate_text_with_cohere(self, api_key: str, model: str, text: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate text metadata using Cohere with structured response (follows same pattern as other APIs)"""
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            # Use the standard structured system prompt (same as other APIs)
            system_prompt = self._get_structured_system_prompt()
            
            # Create user prompt
            user_prompt = f"Analyze this text for Adobe Stock submission concept. Filename: {filename}\n\nText: {text}"
            if custom_prompt:
                user_prompt += f"\n\nAdditional context: {custom_prompt}"
            
            # Combine system prompt with user prompt
            combined_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            # Use Cohere API format with full token limit for complete responses
            payload = {
                "model": model,
                "message": combined_prompt,
                "max_tokens": 2000,  # Match other AI services for complete responses
                "temperature": 0.7
            }
            
            # Make API request
            response = requests.post(
                "https://api.cohere.ai/v1/chat",
                headers=headers,
                json=payload,
                timeout=60
            )
            
            # Handle response
            if response.status_code != 200:
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
                return MetadataResult(success=False, error=error_msg)
            
            # Parse response using standard parser (same as other APIs)
            result = response.json()
            raw_content = result["text"]
            
            logger.info(f"Cohere text analysis raw response: {raw_content[:500]}...")
            
            # Use the standard structured response parser (same as other APIs)
            return self._parse_cohere_response(raw_content)
            
        except requests.exceptions.Timeout:
            return MetadataResult(success=False, error="Cohere API request timed out. Please try again.")
        except requests.exceptions.ConnectionError:
            return MetadataResult(success=False, error="Unable to connect to Cohere API. Please check your internet connection.")
        except Exception as e:
            return MetadataResult(success=False, error=f"Cohere text analysis failed: {str(e)}")
    
    def _generate_with_deepseek(self, api_key: str, model: str, image_data: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate metadata using DeepSeek (placeholder)"""
        return MetadataResult(success=False, error="DeepSeek service not yet implemented")
    
    def _generate_text_with_deepseek(self, api_key: str, model: str, text: str, filename: str, custom_prompt: str) -> MetadataResult:
        """Generate text metadata using DeepSeek (placeholder)"""
        return MetadataResult(success=False, error="DeepSeek service not yet implemented")
    
    def generate_video_metadata(self, service: str, api_key: str, model: str, 
                               video_data: str, filename: str, custom_prompt: str = "") -> MetadataResult:
        """Generate structured metadata for videos using specified AI service"""
        
        # Security validation
        if not self.validator.validate_api_key(api_key, service):
            return MetadataResult(success=False, error="Invalid API key format")
        
        if not self.validator.validate_video_data(video_data):  # Use video-specific validation
            return MetadataResult(success=False, error="Invalid video data")
        
        custom_prompt = self.validator.sanitize_input(custom_prompt)
        filename = self.validator.sanitize_input(filename)
        
        # For video analysis, we'll use the same methods as image analysis
        # but with a video-specific prompt
        video_prompt = custom_prompt or "This is a video file. Analyze the content for Adobe Stock video submission. Generate appropriate metadata including title, keywords, category, and releases."
        
        try:
            if service == "openai":
                return self._generate_with_openai(api_key, model, video_data, filename, video_prompt)
            elif service == "gemini":
                return self._generate_with_gemini(api_key, model, video_data, filename, video_prompt)
            elif service == "groq":
                return self._generate_with_groq(api_key, model, video_data, filename, video_prompt)
            elif service == "grok":
                return self._generate_with_grok(api_key, model, video_data, filename, video_prompt)
            elif service == "llama":
                return self._generate_with_llama(api_key, model, video_data, filename, video_prompt)
            elif service == "cohere":
                return self._generate_with_cohere(api_key, model, video_data, filename, video_prompt)
            elif service == "deepseek":
                return self._generate_with_deepseek(api_key, model, video_data, filename, video_prompt)
            else:
                return MetadataResult(success=False, error=f"Unsupported service: {service}")
                
        except Exception as e:
            logger.error(f"Error generating video metadata with {service}: {str(e)}")
            return MetadataResult(success=False, error=f"Service error: {str(e)}")
