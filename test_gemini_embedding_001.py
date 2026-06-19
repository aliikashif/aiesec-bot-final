import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# 1. Load GOOGLE_API_KEY from .env (check backend/.env first, then root .env)
env_path_backend = Path(__file__).parent / "backend" / ".env"
env_path_root = Path(__file__).parent / ".env"

if env_path_backend.exists():
    load_dotenv(dotenv_path=env_path_backend)
elif env_path_root.exists():
    load_dotenv(dotenv_path=env_path_root)
else:
    print("Error: .env file not found in root or backend directory.", file=sys.stderr)
    sys.exit(1)

google_api_key = os.getenv("GOOGLE_API_KEY")
if not google_api_key:
    print("Error: GOOGLE_API_KEY not found in environment variables.", file=sys.stderr)
    sys.exit(1)

# 2. Import and configure google-generativeai package
try:
    import google.generativeai as genai
except ImportError as e:
    print(f"Error: Failed to import google.generativeai. Make sure it is installed.\n{e}", file=sys.stderr)
    sys.exit(1)

genai.configure(api_key=google_api_key)

# 3. Call the gemini-embedding-001 model with output_dimensionality=768 explicitly set
model_name = "models/gemini-embedding-001"
test_text = "What is AIESEC?"

print(f"Calling embedding endpoint for model '{model_name}'...")
print(f"Text to embed: '{test_text}'")
print("Explicit output_dimensionality: 768")

try:
    response = genai.embed_content(
        model=model_name,
        content=test_text,
        output_dimensionality=768
    )
    
    embedding = response.get('embedding', [])
    if not embedding and hasattr(response, 'embedding'):
        embedding = response.embedding
        
    if not isinstance(embedding, list):
        raise TypeError(f"Expected embedding to be a list, got {type(embedding)}")
        
    # 4. Print the length and assert that the length is exactly 768
    vector_length = len(embedding)
    print(f"\nSuccess! Embedding generated successfully.")
    print(f"Returned Vector Length (Dimensions): {vector_length}")
    print(f"First 5 values: {embedding[:5]}")
    
    assert vector_length == 768, f"Assertion Failed: Expected dimension to be 768, but got {vector_length}"
    print("\nAssertion Passed: Dimension is exactly 768!")
    
except Exception as e:
    print(f"\nError: Test failed.\n{e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
