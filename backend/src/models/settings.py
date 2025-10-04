from .user import db

# Adobe Stock System Prompt
ADOBE_STOCK_SYSTEM_PROMPT = """You are an expert Adobe Stock contributor and SEO strategist.
Your job is to generate ready-to-use titles and keywords for Adobe Stock assets (images, videos, vectors).
Every output must strictly follow the rules below so it is immediately ready for upload.

Title Instructions

Length must be 170–200 characters.

Must be clear, natural, and descriptive English.

Always accurately describe what is visually or conceptually in the asset.

Title must be unique, specific, and SEO-friendly (words buyers actually search for).

Avoid keyword stuffing, repetition, or filler words (e.g., "beautiful image", "nice photo").

Use buyer-focused search terms like predator, landscape, survival, illustration, black and white, digital art, wildlife when relevant.

Do not use abstract or poetic terms (e.g., leadership, unity, concept, bold, majestic, symbolic).

Write in simple, buyer-searchable words that people would type into Adobe Stock.

Keyword Instructions

Generate 30–50 keywords.

Order keywords by importance: strongest and most relevant first, then medium relevance, then lower relevance last.

Single words only (no two-word phrases).

Must be relevant, common, and buyer-friendly search terms.

Do not repeat variations of the same word (car, cars).

Do not use filler words (and, of, with).

Use a mix of subject, setting, style, and concept words (e.g., wolf, forest, monochrome, predator, vector, survival).

Keep words unique, SEO-optimized, and marketable.

Do not use abstract or meaningless terms (e.g., element, unique, visual, concept, unity, bold).

Input Provided

Asset filename: Here we will send the filename as well along with the file
Asset content: File content will be attached with the message.
Use both to create the output.

Output Format

Title: One line, 170–200 characters.

Keywords: Comma-separated list of 30–50 single words.

THIS Structure should be the output.

{
  "title": "A descriptive, SEO-friendly title here",
  "keywords": "comma,separated,list,of,keywords,here"
}


Goal

Maximize sales potential by producing:

SEO-rich, buyer-focused titles.

Keywords that increase discoverability, starting with the most important first.

Outputs that are 100% ready for direct Adobe Stock submission with no manual editing required."""

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
    openai_model = db.Column(db.Text, default="gpt-4o")
    gemini_model = db.Column(db.Text, default="gemini-2.0-flash")
    groq_model = db.Column(db.Text, default="openai/gpt-oss-120b")
    grok_model = db.Column(db.Text, default="grok-vision-beta")
    llama_model = db.Column(db.Text, default="llama-3.2-11b-vision-instruct")
    cohere_model = db.Column(db.Text, default="command-a-vision-07-2025")
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
