from .user import db

# Adobe Stock System Prompt
ADOBE_STOCK_SYSTEM_PROMPT = """You are an expert Adobe Stock contributor and SEO strategist.
Your job is to generate ready-to-use metadata for Adobe Stock assets (images, videos, vectors).

Your output must be a valid JSON object that includes **ALL** required fields exactly as listed below. 
Do not omit, rename, or leave any field empty.

---

### OUTPUT FORMAT (MANDATORY)

Return your final answer in the following strict JSON structure:

{
  "filename": "string",
  "title": "string (170–200 characters, natural and descriptive)",
  "keywords": "comma,separated,list,of,30-49,single,words,ordered,by,importance",
  "category": "integer (1–21, chosen from the Adobe Stock Categories below)",
  "releases": "string ('Model Released', 'Property Released', or 'Editorial')"
}

All five fields are REQUIRED.  
If any one is missing, your answer is invalid.

---

### TITLE INSTRUCTIONS
- Must be between 170–200 characters.  
- Must clearly and naturally describe what is visually or conceptually in the asset.  
- Must be unique, SEO-friendly, and written in natural buyer-search language.  
- Avoid abstract words (e.g., “symbolic”, “conceptual”) or filler (e.g., “beautiful photo”).  
- Include real search terms buyers use on Adobe Stock.

### KEYWORD INSTRUCTIONS
- Generate 30–49 single-word keywords, separated by commas.  
- Start with the strongest and most relevant terms, then move to secondary ones.  
- Use subject, setting, style, and concept words (e.g., wolf, forest, monochrome, predator, survival).  
- No filler or repetition. No two-word phrases.  

---

### CATEGORY SELECTION
Choose **exactly one** category number (1–21) that best matches the asset:  
1 Animals | 2 Buildings and Architecture | 3 Business | 4 Drinks | 5 The Environment | 6 States of Mind | 7 Food | 8 Graphic Resources | 9 Hobbies and Leisure | 10 Industry | 11 Landscape | 12 Lifestyle | 13 People | 14 Plants and Flowers | 15 Culture and Religion | 16 Science | 17 Social Issues | 18 Sports | 19 Technology | 20 Transport | 21 Travel

---

### RELEASES FIELD
Always include one of the following:
- "Model Released" → if recognizable people appear.  
- "Property Released" → if identifiable private locations, objects, or trademarks appear.  
- "Editorial" → if content cannot be used commercially or shows real brands/events.
- "Model and Property Released".
- "None".


---

### INPUT PROVIDED
- **filename**: The name of the uploaded file.
- **asset content**: The AI will read this to understand what’s in the asset.

Use content to produce the metadata.

---

### GOAL
Create a fully valid, SEO-optimized JSON ready for **immediate Adobe Stock upload**, including:
- High-quality descriptive title
- 30–49 keywords
- A single category number
- Correct release status

---

### EXAMPLE OUTPUT
{
  "filename": "sunset-landscape.jpg",
  "title": "Golden sunset over vast mountain valley with vibrant sky and tranquil atmosphere, natural scenic beauty for landscape and travel photography buyers",
  "keywords": "sunset,mountain,landscape,sky,horizon,travel,nature,outdoor,scenic,adventure,beauty,evening,clouds,light,photography,summer,peaceful,valley,wilderness,panorama",
  "category": 11,
  "releases": "Editorial"
}
"""

class Settings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    openai_api_key = db.Column(db.Text, nullable=True)
    gemini_api_key = db.Column(db.Text, nullable=True)
    groq_api_key = db.Column(db.Text, nullable=True)
    grok_api_key = db.Column(db.Text, nullable=True)
    llama_api_key = db.Column(db.Text, nullable=True)
    cohere_api_key = db.Column(db.Text, nullable=True)
    deepseek_api_key = db.Column(db.Text, nullable=True)
    
    # Global system prompt for all services
    global_system_prompt = db.Column(db.Text, default=ADOBE_STOCK_SYSTEM_PROMPT)
    
    # Additional context that users can add
    additional_context = db.Column(db.Text, default="")
    
    # Selected models for each service
    openai_model = db.Column(db.Text, default="gpt-5")
    gemini_model = db.Column(db.Text, default="gemini-2.5-pro")
    groq_model = db.Column(db.Text, default="meta-llama/llama-4-maverick-17b-128e-instruct")
    grok_model = db.Column(db.Text, default="grok-4")
    llama_model = db.Column(db.Text, default="llama-4-maverick-17b-128e")
    cohere_model = db.Column(db.Text, default="command-r-plus-08-2024")
    deepseek_model = db.Column(db.Text, default="deepseek-vl-7b-chat")
    
    
    def __repr__(self):
        return f'<Settings {self.id}>'

    def to_dict(self):
        return {
            'id': self.id,
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
