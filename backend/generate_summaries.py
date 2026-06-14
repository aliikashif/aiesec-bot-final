import os
import re
import time
from datetime import datetime
from pathlib import Path
import psycopg2
from pypdf import PdfReader
from google import genai
from dotenv import load_dotenv

# ─────────────────────────────────────────────────────────────────────────────
# 1. Environment & Setup
# ─────────────────────────────────────────────────────────────────────────────
_ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=True)

supabase_db_url = os.getenv("SUPABASE_DB_URL")
google_api_key = os.getenv("GOOGLE_API_KEY")

if not supabase_db_url:
    raise EnvironmentError("SUPABASE_DB_URL is missing in environment variables.")
if not google_api_key:
    raise EnvironmentError("GOOGLE_API_KEY is missing in environment variables.")

# Clean Supabase database connection string
if "paste_your_uri_here" in supabase_db_url:
    supabase_db_url = supabase_db_url.replace("paste_your_uri_here", "")
if "[" in supabase_db_url and "]" in supabase_db_url:
    supabase_db_url = re.sub(r'\[(.*?)\]', r'\1', supabase_db_url)

# Initialize Google GenAI client
client = genai.Client(api_key=google_api_key)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Helpers
# ─────────────────────────────────────────────────────────────────────────────
def get_chunks(text, chunk_size=4000, overlap=200):
    """Manually splits text into sliding window chunks."""
    chunks = []
    if not text:
        return chunks
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
        if end >= len(text):
            break
    return chunks


def generate_with_retry(prompt, retries=3):
    """Executes a Gemini API call with rate limit retries."""
    for attempt in range(retries + 1):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            err_msg = str(e).lower()
            is_rate_limit = "429" in err_msg or "rate" in err_msg or "quota" in err_msg or "resourceexhausted" in err_msg
            if is_rate_limit and attempt < retries:
                print(f"  [WARNING] Rate limit hit. Retrying in 15 seconds... (Attempt {attempt + 1}/{retries})")
                time.sleep(15)
            else:
                raise e


# ─────────────────────────────────────────────────────────────────────────────
# 3. Main Script
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print("Connecting to Supabase pgvector...")
    try:
        conn = psycopg2.connect(supabase_db_url)
        cur = conn.cursor()
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        return

    # Fetch distinct source document names
    try:
        cur.execute("""
            SELECT DISTINCT cmetadata->>'source' AS source
            FROM langchain_pg_embedding
            WHERE cmetadata->>'source' IS NOT NULL;
        """)
        source_rows = cur.fetchall()
    except Exception as e:
        print(f"[ERROR] Failed to query langchain_pg_embedding: {e}")
        cur.close()
        conn.close()
        return

    # Fetch already generated summaries
    try:
        cur.execute("SELECT filename FROM document_summaries;")
        summary_rows = cur.fetchall()
    except Exception:
        # Table might be missing in a fresh DB, verify/create it
        print("[INFO] document_summaries table not found. Creating table...")
        try:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS document_summaries (
                    id SERIAL PRIMARY KEY,
                    filename TEXT UNIQUE,
                    summary TEXT,
                    generated_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)
            conn.commit()
            summary_rows = []
        except Exception as e2:
            print(f"[ERROR] Failed to create document_summaries table: {e2}")
            cur.close()
            conn.close()
            return

    # Normalize all paths to forward slashes
    all_docs = sorted({row[0].replace("\\", "/") for row in source_rows if row[0]})
    existing_summaries = {row[0].replace("\\", "/") for row in summary_rows if row[0]}

    # Find docs that need processing
    to_process = [doc for doc in all_docs if doc not in existing_summaries]

    print(f"Total documents found: {len(all_docs)}")
    print(f"Already summarized: {len(existing_summaries)}")
    print(f"Will be processed: {len(to_process)}")

    generated_count = 0
    skipped_count = len(existing_summaries)
    failed_count = 0

    for idx, doc_path in enumerate(to_process, 1):
        print(f"\nProcessing: {doc_path} (doc {idx} of {len(to_process)})")
        local_file = Path(doc_path)
        if not local_file.exists():
            # If path stored in DB contains absolute prefix from another machine,
            # fallback to looking inside 'documents' folder directly.
            doc_name = local_file.name
            alternative_file = Path("documents") / doc_name
            if alternative_file.exists():
                local_file = alternative_file
            else:
                print(f"[ERROR] File not found: {doc_path}")
                failed_count += 1
                continue

        try:
            # Extract PDF text using pypdf
            reader = PdfReader(str(local_file))
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""

            if not text.strip():
                print(f"[WARNING] No text extracted from {doc_path}")
                failed_count += 1
                continue

            # Manually split text into chunks
            chunks = get_chunks(text, chunk_size=4000, overlap=200)
            print(f"Total chunks: {len(chunks)}")

            if not chunks:
                print(f"[WARNING] No chunks created for {doc_path}")
                failed_count += 1
                continue

            # Cap chunks at 40
            if len(chunks) > 40:
                step = len(chunks) // 40
                chunks = chunks[::step][:40]
                print(f"Down-sampled chunks to cap limit: {len(chunks)}")

            # --- Map Step ---
            chunk_summaries = []
            for i, chunk in enumerate(chunks):
                print(f"Chunk {i + 1} of {len(chunks)}...")
                if i > 0:
                    time.sleep(2)  # proactive sleep between calls

                map_prompt = (
                    "You are summarizing a section of an AIESEC Finance & Legal policy document. "
                    "Extract all key information including: policies and rules, specific amounts or limits, "
                    "deadlines, procedures and steps, exceptions or special cases, and any other critical details. "
                    f"Be thorough and specific. Section: {chunk}"
                )

                try:
                    summary_text = generate_with_retry(map_prompt)
                    chunk_summaries.append(summary_text)
                except Exception as e:
                    print(f"  [WARNING] Failed to generate map summary for chunk {i + 1} after retries: {e}")
                    # Skip chunk on failure
                    continue

            if not chunk_summaries:
                print(f"[ERROR] All chunk summaries failed for {doc_path}")
                failed_count += 1
                continue

            # --- Combine Step ---
            print("Combining summaries...")
            combined_text = "\n\n".join(chunk_summaries)
            combine_prompt = (
                "You are combining section summaries of an AIESEC Finance & Legal policy document into one structured final summary. "
                "Organize clearly under these headings: Overview, Key Policies & Rules, Financial Details (amounts, limits, budgets), "
                "Procedures & Processes, Deadlines & Timeframes, Exceptions & Special Cases, Important Contacts or References. "
                f"Be thorough. Section summaries: {combined_text}"
            )

            try:
                final_summary = generate_with_retry(combine_prompt)
            except Exception as e:
                print(f"[ERROR] Failed to combine summaries for {doc_path} after retries: {e}")
                failed_count += 1
                continue

            # --- Save Step ---
            cur.execute("""
                INSERT INTO document_summaries (filename, summary, generated_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (filename)
                DO UPDATE SET summary = EXCLUDED.summary, generated_at = EXCLUDED.generated_at;
            """, (doc_path, final_summary, datetime.utcnow()))
            conn.commit()
            print(f"  [SUCCESS] Summary saved for {doc_path}")
            generated_count += 1

            # Proactively sleep 5 seconds before starting the next document
            if idx < len(to_process):
                time.sleep(5)

        except Exception as e:
            print(f"[ERROR] Failed entirely for {doc_path}: {e}")
            failed_count += 1

    cur.close()
    conn.close()
    print(f"\nDone. {generated_count} summaries generated, {skipped_count} skipped (already existed), {failed_count} failed.")


if __name__ == "__main__":
    main()
