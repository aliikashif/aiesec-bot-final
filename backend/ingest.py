"""
ingest.py — Document Ingestion Script
=======================================
Run this script to:
  1. Load all PDFs from the "documents/" folder
  2. Split them into overlapping text chunks
  3. Generate embeddings using HuggingFace (runs 100% locally)
  4. Store everything persistently in Supabase pgvector ("langchain_pg_embedding" table)
"""

import os
import sys
import re
from pathlib import Path

from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from rag import GeminiEmbeddings
from langchain_postgres import PGVector

# Load environment variables from .env
_ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=True)

# ─────────────────────────────────────────────
# Configuration constants
# ─────────────────────────────────────────────
DOCUMENTS_DIR = "documents"          # Folder containing your PDF files
COLLECTION_NAME = "aiesec_documents" # pgvector collection name
CHUNK_SIZE = 1000                   # Characters per chunk
CHUNK_OVERLAP = 200                 # Overlap between consecutive chunks


def get_db_url() -> str:
    """
    Retrieve and clean SUPABASE_DB_URL from environment variables.
    """
    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        raise ValueError("SUPABASE_DB_URL is missing in environment variables.")

    # Clean the connection string
    if "paste_your_uri_here" in db_url:
        db_url = db_url.replace("paste_your_uri_here", "")
    if "[" in db_url and "]" in db_url:
        db_url = re.sub(r'\[(.*?)\]', r'\1', db_url)

    return db_url


def load_pdfs(documents_dir: str) -> list:
    """
    Walk the documents directory and load every PDF file found.
    Returns a flat list of LangChain Document objects.
    """
    docs_path = Path(documents_dir)

    if not docs_path.exists():
        print(f"[ERROR] Documents folder '{documents_dir}' not found.")
        print("        Please create it and place your PDF files inside.")
        return []

    pdf_files = list(docs_path.glob("**/*.pdf"))

    if not pdf_files:
        print(f"[ERROR] No PDF files found in '{documents_dir}'.")
        return []

    print(f"\n[INFO] Found {len(pdf_files)} PDF file(s) in '{documents_dir}':")
    for f in pdf_files:
        print(f"     - {f.name}")

    all_documents = []
    for pdf_path in pdf_files:
        print(f"\n[LOAD] Loading: {pdf_path.name} ...", end="", flush=True)
        try:
            loader = PyPDFLoader(str(pdf_path))
            pages = loader.load()
            file_size_kb = round(pdf_path.stat().st_size / 1024, 1)
            for page in pages:
                page.metadata["file_size_kb"] = file_size_kb
            all_documents.extend(pages)
            print(f"  OK  ({len(pages)} page(s))")
        except Exception as e:
            print(f"\n[WARNING] Could not load {pdf_path.name}: {e}")

    return all_documents


def split_documents(documents: list) -> list:
    """
    Split loaded documents into smaller, overlapping text chunks.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(documents)
    return chunks


def create_vector_store(chunks: list) -> PGVector:
    """
    Generate HuggingFace embeddings for every chunk and store them
    in Supabase pgvector.
    """
    print("\n[EMBED] Loading Gemini embedding model ...")
    embeddings = GeminiEmbeddings()

    db_url = get_db_url()

    # Clear and initialize collection
    try:
        vector_store = PGVector(
            embeddings=embeddings,
            connection=db_url,
            collection_name=COLLECTION_NAME
        )
        vector_store.delete_collection()
        vector_store.create_collection()
    except Exception as e:
        print(f"[ERROR] Could not connect to Supabase: {e}")
        return None

    if not chunks:
        return None

    print(f"\n[DB] Writing {len(chunks)} chunk(s) to Supabase pgvector ...")
    vector_store.add_documents(chunks)
    print(f"[DONE] {len(chunks)} chunks stored in collection '{COLLECTION_NAME}'.")
    return vector_store


def run_ingestion(file_paths: list = None, clear_collection: bool = False, progress_callback=None) -> dict:
    """
    Programmatic entry point to run ingestion.
    Runs loading, splitting, clearing the old database collection (optional), and creating/updating the database.
    progress_callback: a callable function taking (stage: str, percentage: float) to report progress.
    """
    if file_paths is None:
        docs_path = Path(DOCUMENTS_DIR)
        if not docs_path.exists():
            docs_path.mkdir(parents=True, exist_ok=True)
        pdf_files = list(docs_path.glob("**/*.pdf"))
    else:
        pdf_files = [Path(f) for f in file_paths]

    if progress_callback:
        progress_callback("Initializing embeddings and connecting to Supabase...", 0.2)

    try:
        db_url = get_db_url()
    except Exception as e:
        raise ValueError(f"Configuration error: {e}")

    embeddings = GeminiEmbeddings()

    try:
        vector_store = PGVector(
            embeddings=embeddings,
            connection=db_url,
            collection_name=COLLECTION_NAME
        )
        if clear_collection:
            vector_store.delete_collection()
            vector_store.create_collection()
    except Exception as e:
        raise ConnectionError(
            f"Failed to connect to Supabase pgvector. Please verify SUPABASE_DB_URL and network access. Details: {e}"
        ) from e

    if not pdf_files:
        if progress_callback:
            progress_callback("No PDF documents to process.", 1.0)
        return {"chunks": 0, "files": 0}

    if progress_callback:
        progress_callback(f"Loading {len(pdf_files)} PDF file(s)...", 0.4)

    all_documents = []
    for pdf_path in pdf_files:
        try:
            loader = PyPDFLoader(str(pdf_path))
            pages = loader.load()
            file_size_kb = round(pdf_path.stat().st_size / 1024, 1)
            for page in pages:
                page.metadata["file_size_kb"] = file_size_kb
            all_documents.extend(pages)
        except Exception as e:
            print(f"[WARNING] Could not load {pdf_path.name}: {e}")

    if not all_documents:
        if progress_callback:
            progress_callback("No text could be extracted from PDFs.", 1.0)
        return {"chunks": 0, "files": len(pdf_files)}

    if progress_callback:
        progress_callback(f"Splitting {len(all_documents)} pages into chunks...", 0.6)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(all_documents)

    if progress_callback:
        progress_callback(f"Generating embeddings and writing {len(chunks)} chunk(s) to Supabase pgvector...", 0.8)

    if chunks:
        vector_store.add_documents(chunks)

    if progress_callback:
        progress_callback("Ingestion complete!", 1.0)

    return {"chunks": len(chunks), "files": len(pdf_files)}


def main():
    print("=" * 60)
    print("  AIESEC NUST — Finance & Legal RAG Ingestion Pipeline (Supabase)")
    print("=" * 60)

    def cli_progress(stage, percentage):
        print(f"[{int(percentage * 100)}%] {stage}")

    try:
        result = run_ingestion(clear_collection=True, progress_callback=cli_progress)
        print(f"\n[SUCCESS] Ingestion complete! {result['files']} file(s) ingested, {result['chunks']} chunks created.")
    except Exception as e:
        print(f"\n[ERROR] Ingestion failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
