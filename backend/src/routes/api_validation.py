from flask import Blueprint, jsonify
import requests
from ..models.settings import Settings
from ..models.user import db

api_validation_bp = Blueprint('api_validation', __name__)


def get_settings():
    settings = Settings.query.first()
    if not settings:
        settings = Settings()
        db.session.add(settings)
        db.session.commit()
    return settings


def format_result(service_id, ok, status_code=None, message=None):
    return {
        "service": service_id,
        "valid": bool(ok),
        "status_code": status_code,
        "message": message or ("OK" if ok else "Invalid or unreachable")
    }


@api_validation_bp.route('/validate-apis', methods=['GET'])
def validate_apis():
    settings = get_settings()
    results = []

    # OpenAI — check models endpoint
    try:
        if not settings.openai_api_key:
            results.append(format_result('openai', False, None, 'Missing API key'))
        else:
            r = requests.get(
                'https://api.openai.com/v1/models',
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                timeout=15
            )
            ok = (r.status_code == 200)
            msg = None
            if not ok:
                try:
                    err = r.json()
                    msg = err.get('error', {}).get('message') or r.text
                except Exception:
                    msg = r.text
            results.append(format_result('openai', ok, r.status_code, msg))
    except requests.exceptions.RequestException as e:
        results.append(format_result('openai', False, None, f'Network error: {str(e)}'))

    # Google Gemini — simple generateContent ping (models listing may not reflect key validity)
    try:
        if not settings.gemini_api_key:
            results.append(format_result('gemini', False, None, 'Missing API key'))
        else:
            payload = {
                "contents": [{"parts": [{"text": "ping"}]}]
            }
            r = requests.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model or "gemini-2.5-flash"}:generateContent?key={settings.gemini_api_key}',
                headers={"Content-Type": "application/json"},
                json=payload,
                timeout=15
            )
            ok = (r.status_code == 200)
            msg = None
            if not ok:
                try:
                    msg = r.json().get('error', {}).get('message') or r.text
                except Exception:
                    msg = r.text
            results.append(format_result('gemini', ok, r.status_code, msg))
    except requests.exceptions.RequestException as e:
        results.append(format_result('gemini', False, None, f'Network error: {str(e)}'))

    # Groq — OpenAI-compatible models endpoint
    try:
        if not settings.groq_api_key:
            results.append(format_result('groq', False, None, 'Missing API key'))
        else:
            r = requests.get(
                'https://api.groq.com/openai/v1/models',
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                timeout=15
            )
            ok = (r.status_code == 200)
            msg = None
            if not ok:
                try:
                    msg = r.json().get('error', {}).get('message') or r.text
                except Exception:
                    msg = r.text
            results.append(format_result('groq', ok, r.status_code, msg))
    except requests.exceptions.RequestException as e:
        results.append(format_result('groq', False, None, f'Network error: {str(e)}'))

    # xAI Grok — OpenAI-compatible models endpoint
    try:
        if not settings.grok_api_key:
            results.append(format_result('grok', False, None, 'Missing API key'))
        else:
            r = requests.get(
                'https://api.x.ai/v1/models',
                headers={"Authorization": f"Bearer {settings.grok_api_key}"},
                timeout=15
            )
            ok = (r.status_code == 200)
            msg = None
            if not ok:
                try:
                    msg = r.json().get('error', {}).get('message') or r.text
                except Exception:
                    msg = r.text
            results.append(format_result('grok', ok, r.status_code, msg))
    except requests.exceptions.RequestException as e:
        results.append(format_result('grok', False, None, f'Network error: {str(e)}'))

    # Llama API — OpenAI-like; perform minimal chat call to avoid ambiguity
    try:
        if not settings.llama_api_key:
            results.append(format_result('llama', False, None, 'Missing API key'))
        else:
            payload = {
                "model": settings.llama_model or "llama-3.1-70b-instruct",
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": 1
            }
            r = requests.post(
                'https://api.llama-api.com/chat/completions',
                headers={
                    "Authorization": f"Bearer {settings.llama_api_key}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=15
            )
            ok = (r.status_code == 200)
            msg = None
            if not ok:
                try:
                    msg = r.json().get('error', {}).get('message') or r.text
                except Exception:
                    msg = r.text
            results.append(format_result('llama', ok, r.status_code, msg))
    except requests.exceptions.RequestException as e:
        results.append(format_result('llama', False, None, f'Network error: {str(e)}'))

    # Cohere — models listing
    try:
        if not settings.cohere_api_key:
            results.append(format_result('cohere', False, None, 'Missing API key'))
        else:
            r = requests.get(
                'https://api.cohere.ai/v1/models',
                headers={"Authorization": f"Bearer {settings.cohere_api_key}"},
                timeout=15
            )
            ok = (r.status_code == 200)
            msg = None
            if not ok:
                try:
                    # Cohere error shape often includes message
                    msg = r.json().get('message') or r.text
                except Exception:
                    msg = r.text
            results.append(format_result('cohere', ok, r.status_code, msg))
    except requests.exceptions.RequestException as e:
        results.append(format_result('cohere', False, None, f'Network error: {str(e)}'))

    # DeepSeek — OpenAI-compatible models endpoint
    try:
        if not settings.deepseek_api_key:
            results.append(format_result('deepseek', False, None, 'Missing API key'))
        else:
            r = requests.get(
                'https://api.deepseek.com/v1/models',
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
                timeout=15
            )
            ok = (r.status_code == 200)
            msg = None
            if not ok:
                try:
                    msg = r.json().get('error', {}).get('message') or r.text
                except Exception:
                    msg = r.text
            results.append(format_result('deepseek', ok, r.status_code, msg))
    except requests.exceptions.RequestException as e:
        results.append(format_result('deepseek', False, None, f'Network error: {str(e)}'))

    return jsonify({"results": results})

