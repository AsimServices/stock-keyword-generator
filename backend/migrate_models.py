#!/usr/bin/env python3
"""
Database migration script to add model selection fields to existing Settings table.
Run this script if you have an existing database that needs the new model columns.
"""

import sqlite3
import os

def migrate_database():
    """Add model selection columns to Settings table if they don't exist"""
    
    # Database paths to check
    db_paths = [
        'database/app.db',
        'instance/app.db',
        'app.db'
    ]
    
    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            break
    
    if not db_path:
        print("No database file found. The new columns will be created when the app starts.")
        return
    
    print(f"Found database at: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if Settings table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='settings';")
    if not cursor.fetchone():
        print("Settings table doesn't exist yet. It will be created when the app starts.")
        conn.close()
        return
    
    # Get current table structure
    cursor.execute("PRAGMA table_info(settings);")
    columns = [row[1] for row in cursor.fetchall()]
    
    # Adobe Stock System Prompt
    adobe_stock_prompt = """You are an expert Adobe Stock contributor and SEO strategist.
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

    # Model columns and new prompt columns to add
    model_columns = {
        'openai_model': 'gpt-4o',
        'gemini_model': 'gemini-2.5-flash', 
        'groq_model': 'llama-3.2-90b-vision-preview',
        'grok_model': 'grok-4',
        'llama_model': 'llama-3.2-11b-vision-instruct',
        'cohere_model': 'command-a-vision-07-2025',
        'deepseek_model': 'deepseek-vl-7b-chat',
        'global_system_prompt': adobe_stock_prompt,
        'additional_context': ''
    }
    
    # Add missing columns
    added_columns = []
    for column_name, default_value in model_columns.items():
        if column_name not in columns:
            try:
                cursor.execute(f"ALTER TABLE settings ADD COLUMN {column_name} TEXT DEFAULT '{default_value}';")
                added_columns.append(column_name)
                print(f"Added column: {column_name}")
            except sqlite3.Error as e:
                print(f"Error adding column {column_name}: {e}")
    
    if added_columns:
        conn.commit()
        print(f"Successfully added {len(added_columns)} new model selection columns.")
    else:
        print("All model selection columns already exist.")
    
    conn.close()

if __name__ == "__main__":
    migrate_database()
