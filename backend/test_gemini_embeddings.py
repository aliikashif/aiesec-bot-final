import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# 1. Load GOOGLE_API_KEY from the existing .env file
env_path = Path(__file__).parent / ".env"
if not env_path.exists():
    print(f"Error: .env file not found at {env_path.resolve()}", file=sys.stderr)
    sys.exit(1)

load_dotenv(dotenv_path=env_path)
google_api_key = os.getenv("GOOGLE_API_KEY")

if not google_api_key:
    print("Error: GOOGLE_API_KEY not found in .env file.", file=sys.stderr)
    sys.exit(1)

# 2. Use the google-generativeai Python package
try:
    import google.generativeai as genai
except ImportError as e:
    print(f"Error: Failed to import google.generativeai. Make sure google-generativeai is installed.\n{e}", file=sys.stderr)
    sys.exit(1)

# Configure the SDK with the loaded API key
genai.configure(api_key=google_api_key)

# Query and print available models that support "embedContent"
embedding_models = []
print("Listing all models that support the 'embedContent' method:", flush=True)
try:
    for model in genai.list_models():
        if "embedContent" in model.supported_generation_methods:
            print(f" - {model.name}", flush=True)
            embedding_models.append(model.name)
except Exception as e:
    print(f"Error listing models: {e}", file=sys.stderr, flush=True)

if not embedding_models:
    print("Error: No models supporting 'embedContent' were found.", file=sys.stderr, flush=True)
    sys.exit(1)

# Choose model and settings as requested
model_to_use = "models/gemini-embedding-001"
output_dim = 768

# 3. Call the embeddings endpoint using the specified model and output_dimensionality
test_string = "What is AIESEC?"
print(f"\nCalling embeddings endpoint for model '{model_to_use}' with output_dimensionality={output_dim} and text: '{test_string}'...", flush=True)

try:
    response = genai.embed_content(
        model=model_to_use,
        content=test_string,
        output_dimensionality=output_dim
    )
    
    # Print the full raw response object
    print(f"\nRaw response object:\n{response}\n", flush=True)
    
    # 4. Print the resulting vector's length (number of dimensions) and the first 5 values
    if isinstance(response, dict) and 'embedding' in response:
        embedding = response['embedding']
    elif hasattr(response, 'embedding'):
        embedding = response.embedding
    else:
        # Fallback in case of unexpected structure
        embedding = response
        
    if isinstance(embedding, list):
        print("Success! Embedding generated successfully.")
        print(f"Vector Length (Dimensions): {len(embedding)}")
        print(f"First 5 Values: {embedding[:5]}")
    else:
        print(f"Error: Unexpected response structure: {response}", file=sys.stderr)
        
except Exception as e:
    # 5. Wrap the call in a try/except that prints a clear error message if it fails, including the full exception text
    print("Error: The call to google-generativeai embeddings endpoint failed.", file=sys.stderr)
    print("Full exception details:", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
