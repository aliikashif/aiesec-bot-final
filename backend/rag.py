"""
rag.py — RAG Pipeline
======================
This module handles all Retrieval-Augmented Generation (RAG) logic:
  1. Connect to Supabase pgvector database
  2. Retrieve the top-k most relevant document chunks for a question
  3. Build a conversational prompt combining history + chunks + question
  4. Call the Groq LLM (llama-3.1-8b-instant) for a grounded answer
  5. Return the answer alongside source document names

Conversation memory is handled by ConversationalRetrievalChain:
  - A condense-question step rewrites follow-up questions using chat history
    so the retriever always receives a self-contained query.
  - chat_history is a list of (human_msg, ai_msg) tuples, capped at 6
    exchanges by the caller to stay within token limits.
"""

import os
import re
import time
import asyncio
from functools import lru_cache
from google import genai as google_genai
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted
from pathlib import Path

from dotenv import load_dotenv
from langchain_postgres import PGVector
from langchain_groq import ChatGroq
from langchain.chains import ConversationalRetrievalChain
from langchain.prompts import (
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
    ChatPromptTemplate,
    PromptTemplate,
)

# ─────────────────────────────────────────────
# Load environment variables from .env
# Uses the directory of this file as the base so the .env is always
# found regardless of where the script is launched from.
# override=True ensures the file values always win over any existing
# shell environment variables.
# ─────────────────────────────────────────────
_ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=True)

groq_api_key = os.getenv("GROQ_API_KEY")
google_api_key = os.getenv("GOOGLE_API_KEY")
google_api_key_backup = os.getenv("GOOGLE_API_KEY_BACKUP")

if not groq_api_key:
    raise EnvironmentError("GROQ_API_KEY not found. Please add it to your .env file.")
if not google_api_key:
    raise EnvironmentError("GOOGLE_API_KEY not found. Please add it to your .env file.")

# Configure the legacy and new Gemini SDKs
genai.configure(api_key=google_api_key)
client = google_genai.Client(api_key=google_api_key)

_active_key = "primary"

# ─────────────────────────────────────────────
COLLECTION_NAME = "aiesec_documents"
GROQ_MODEL = "openai/gpt-oss-20b"
TOP_K_RESULTS = 6   # Number of relevant chunks to retrieve per query
MAX_SUMMARY_CHUNKS = 40

BATCH_SIZE = 20
MIN_DELAY = 2.0

# Confidence Thresholds
CONFIDENCE_HIGH = 0.65
CONFIDENCE_MEDIUM = 0.55

# System prompt that shapes the assistant's persona and behaviour
SYSTEM_PROMPT = """You are an AIESEC Finance and Legal assistant for AIESEC in NUST. Answer questions based only on the provided document chunks below. If the answer is clearly present in the chunks, always provide it in a helpful and concise way. Only say you don't know if the chunks genuinely contain no relevant information. Do not make up information.

Formatting guidance: Use bullet points or numbered steps only when the answer genuinely involves multiple distinct items, a sequence of steps, or a list of options. If your answer would naturally be one or two sentences, write it as plain prose with no markdown formatting at all, do not force a single fact or number into a bullet list.
Examples:

Question: "What's the deadline for the LC report?" → Plain prose: "The LC report is due by the 5th of each month."
Question: "How do I submit an MoU?" → Numbered steps, since this is a multi-step process.
Question: "What's the reimbursement limit?" → Plain prose, a single fact doesn't need structure.
Question: "What documents do I need for a TN application?" → Bullet list, since this is multiple distinct items."""


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


class EmbeddingRateLimitError(Exception):
    """Custom exception raised when the Gemini embedding API rate limit/quota is hit."""
    pass


_request_timestamps = []
_rate_limit_lock = asyncio.Lock()


async def _wait_for_rate_limit():
    global _request_timestamps
    while True:
        async with _rate_limit_lock:
            now = time.time()
            # Keep only timestamps within the last 60 seconds
            _request_timestamps = [t for t in _request_timestamps if now - t < 60.0]
            
            if len(_request_timestamps) < 90:
                _request_timestamps.append(now)
                return
            
            # Calculate wait time based on oldest timestamp
            oldest_t = _request_timestamps[0]
            wait_time = 60.0 - (now - oldest_t) + 0.1
            
        if wait_time > 0:
            await asyncio.sleep(wait_time)


async def embed_chunks_in_batches(texts: list[str], model: str = "models/gemini-embedding-001") -> list[list[float]]:
    """
    Embeds a list of text chunks one-by-one using the specified Gemini embedding model.
    Includes rolling-window rate limiting to stay under 90 requests/minute.
    Supports switching to backup API key if primary is exhausted.
    """
    all_embeddings = []
    max_attempts = 7
    global _active_key
    
    for text in texts:
        embedding = None
        attempt = 0
        while attempt < max_attempts:
            try:
                # Wait for rate limit before making request
                await _wait_for_rate_limit()
                
                response = genai.embed_content(
                    model=model,
                    content=text,
                    output_dimensionality=768
                )
                embedding = response.get('embedding', [])
                if not embedding and hasattr(response, 'embedding'):
                    embedding = response.embedding
                
                # Log success showing which key was used
                print(f"[INFO] Successfully embedded chunk using {_active_key} key.", flush=True)
                break  # Successful API call, exit the retry loop
            except Exception as e:
                err_msg = str(e).lower()
                is_rate_limit = (
                    "429" in err_msg or 
                    "high traffic" in err_msg or 
                    "quota" in err_msg or 
                    "resourceexhausted" in err_msg or
                    isinstance(e, ResourceExhausted)
                )
                if is_rate_limit:
                    # Check if we can switch to backup key
                    if _active_key == "primary" and google_api_key_backup:
                        print("[INFO] Primary Gemini API key quota exhausted. Switching to backup key for remainder of this run.", flush=True)
                        _active_key = "backup"
                        genai.configure(api_key=google_api_key_backup)
                        
                        # Reset rate limit queue for the new backup key
                        async with _rate_limit_lock:
                            global _request_timestamps
                            _request_timestamps = []
                        
                        # Reset attempts count to retry the same chunk with the backup key
                        attempt = 0
                        continue
                    
                    # If we cannot switch key, wait/back off if we still have attempts left
                    if attempt < max_attempts - 1:
                        # Artificially fill the rolling window to force waiting on retry
                        async with _rate_limit_lock:
                            now = time.time()
                            _request_timestamps = [t for t in _request_timestamps if now - t < 60.0]
                            if len(_request_timestamps) < 90:
                                needed = 90 - len(_request_timestamps)
                                _request_timestamps.extend([now] * needed)
                        print(f"[WARNING] Embedding rate limit hit on {_active_key} key. Rolling window filled. Waiting to retry... (Attempt {attempt + 1}/{max_attempts})", flush=True)
                        attempt += 1
                    else:
                        # Raise final failure
                        raise e
                else:
                    # Raise non-rate-limit errors immediately
                    raise e
                    
        if embedding is None:
            raise EmbeddingRateLimitError("We're experiencing high traffic right now, please try again in a moment.")
            
        all_embeddings.append(embedding)
        
    return all_embeddings


class GeminiEmbeddings:
    """Gemini-based embeddings implementation for langchain-postgres with batching and backoff."""

    def _run_async(self, coro):
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
            
        if loop and loop.is_running():
            import threading
            from concurrent.futures import ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        else:
            return asyncio.run(coro)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._run_async(embed_chunks_in_batches(texts))

    def embed_query(self, text: str) -> list[float]:
        embeddings = self._run_async(embed_chunks_in_batches([text]))
        return embeddings[0]


@lru_cache(maxsize=None)
def load_vector_store() -> PGVector | None:
    """
    Open the existing Supabase pgvector collection.
    Returns None (with a descriptive exception) if the DB is missing or empty.
    Decorated with @lru_cache(maxsize=None) so the client is initialised
    once per process and reused on every subsequent call.
    """
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
    except Exception as e:
        raise ConnectionError(
            f"Failed to connect to Supabase pgvector. Please verify your internet connection and SUPABASE_DB_URL in .env. Details: {e}"
        ) from e

    # Verify the collection actually has documents — use psycopg2 directly
    # to avoid DDL calls that fail over Supabase's transaction pooler (port 6543).
    import psycopg2
    import re as _re
    _clean_url = db_url
    if "[" in _clean_url and "]" in _clean_url:
        _clean_url = _re.sub(r'\[(.*?)\]', r'\1', _clean_url)
    try:
        _conn = psycopg2.connect(_clean_url)
        _cur = _conn.cursor()
        _cur.execute("SELECT COUNT(*) FROM langchain_pg_embedding;")
        count = _cur.fetchone()[0] or 0
        _cur.close()
        _conn.close()
    except Exception:
        count = 0

    if count == 0:
        raise ValueError(
            "Supabase pgvector collection is empty. "
            "Please go to the Admin Panel and upload documents to index them."
        )

    return vector_store


def detect_summarize_intent(query: str) -> bool:
    """Returns True if the query is asking for a document summary."""
    keywords = ["summarize", "summary", "summarise", "overview", "brief me",
                "what is this doc about", "what does this document cover",
                "give me an overview", "outline"]
    query_lower = query.lower()
    return any(keyword in query_lower for keyword in keywords)


def find_matching_document(query: str, available_filenames: list) -> str | None:
    """Try to match a document name from the query."""
    import re
    query_lower = query.lower()
    
    for filename in available_filenames:
        # Clean name for matching (strip prefix and extension)
        name = filename.replace("documents\\", "").replace("documents/", "").strip()
        if name.lower().endswith(".pdf"):
            name = name[:-4]
            
        # Split cleaned filename into words
        words = [w.lower() for w in re.split(r'[-_\s]+', name) if w.strip()]
        
        # Check if any word (longer than 2 chars) appears in the query
        for word in words:
            if len(word) > 2 and word in query_lower:
                return filename
    return None

def _check_shortcircuit(question: str) -> dict | None:
    """
    Checks the question against the four non-RAG short-circuit cases:
    summarization intent, greeting, farewell, and name/identity.
    Returns the matching answer dict if one matches, otherwise None
    (meaning the question should go through the full RAG pipeline).
    """
    # ── Summarization intent ─────────────────────────────────────────────
    if detect_summarize_intent(question):
        db_url = get_db_url()
        import psycopg2
        available_filenames = []
        try:
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute("""
                SELECT DISTINCT cmetadata->>'source' AS source
                FROM langchain_pg_embedding
                WHERE cmetadata->>'source' IS NOT NULL;
            """)
            available_filenames = [row[0] for row in cur.fetchall() if row[0]]
            cur.close()
            conn.close()
        except Exception as e:
            print(f"[ERROR] Failed to fetch available filenames: {e}")

        matched_doc = find_matching_document(question, available_filenames)
        if matched_doc:
            summary = get_summary(matched_doc)
            if summary:
                return {
                    "answer": summary,
                    "confidence": None,
                    "sources": [],
                    "source_documents": [],
                    "farewell": False
                }
            else:
                return {
                    "answer": "Summary for this document hasn't been generated yet. Ask your LCVP F&L to generate it from the admin panel.",
                    "confidence": None,
                    "sources": [],
                    "source_documents": [],
                    "farewell": False
                }
        else:
            return {
                "answer": "I couldn't identify which document you'd like summarized. Try asking something like 'summarize the reimbursement policy' using part of the document name.",
                "confidence": None,
                "sources": [],
                "source_documents": [],
                "farewell": False
            }

    # ── Greeting ──────────────────────────────────────────────────────────
    _GREETING_PATTERN = re.compile(
        r"^\s*(hi+|hello+|hey+|greetings?|howdy|salaam|good\s*(morning|afternoon|evening)|"
        r"what'?s\s*up|sup|yo)\s*[!\.,]?\s*$",
        re.IGNORECASE,
    )
    if _GREETING_PATTERN.match(question):
        return {
            "answer": (
                "Hello! Welcome to the AIESEC NUST Finance & Legal Assistant.\n\n"
                "I can help you with questions about:\n"
                "- Financial policies and reimbursement procedures\n"
                "- MoU and contract signing processes\n"
                "- GDPR and legal compliance\n"
                "- Governance and legislative procedures\n\n"
                "Feel free to ask me anything, or try one of the suggested questions above!"
            ),
            "sources": [],
            "source_documents": [],
            "farewell": False,
            "confidence": None,
        }

    # ── Farewell ──────────────────────────────────────────────────────────
    _FAREWELL_PATTERN = re.compile(
        r"^\s*(bye+|goodbye+|good\s*bye|see\s*you(\s*later)?|take\s*care|"
        r"thank\s*you\s*(so\s*much\s*)?(bye|goodbye)?|thanks?\s*(a\s*lot\s*)?(bye|goodbye)?|"
        r"farewell|cya|see\s*ya|later\s*gator|peace\s*out|that'?s?\s*all)\s*[!\.,]?\s*$",
        re.IGNORECASE,
    )
    if _FAREWELL_PATTERN.match(question):
        return {
            "answer": "Goodbye! Feel free to come back anytime you have questions. Good luck! \U0001f499",
            "sources": [],
            "source_documents": [],
            "farewell": True,
            "confidence": None,
        }

    # ── Name / identity ───────────────────────────────────────────────────
    _NAME_PATTERN = re.compile(
        r"^\s*(what'?s?\s*(is\s*)?your\s*name|who\s+are\s+you|what\s+are\s+you(\s+called)?|"
        r"what\s+do\s+(i|we|people)\s+call\s+you|introduce\s+yourself|"
        r"what\s+should\s+i\s+call\s+you|tell\s+me\s+about\s+yourself|"
        r"are\s+you\s+a\s+bot|are\s+you\s+an\s+ai)\s*[?\.,]?\s*$",
        re.IGNORECASE,
    )
    if _NAME_PATTERN.match(question):
        return {
            "answer": (
                "I am a nameless member of shareef khandan, here to help with "
                "AIESEC Finance & Legal queries! \U0001f499"
            ),
            "sources": [],
            "source_documents": [],
            "farewell": False,
            "confidence": None,
        }

    return None


def get_answer(question: str, vector_store: PGVector, chat_history: list | None = None) -> dict:
    """
    Full RAG query with conversation memory.

      1. Short-circuit for greetings / farewells / identity (no LLM call)
      2. Build a ConversationalRetrievalChain that:
         a. Condenses the question + chat history into a standalone query
         b. Retrieves TOP_K_RESULTS relevant chunks from Supabase pgvector
         c. Answers using the system prompt + retrieved context
      3. Return {"answer": str, "sources": list[str], "farewell": bool}

    Args:
        question:     The user's natural-language question.
        vector_store: A loaded PGVector instance (from load_vector_store()).
        chat_history: List of (human_msg, ai_msg) tuples from previous turns.
                      Pass the last 6 exchanges to stay within token limits.
                      Defaults to [] if not provided.

    Returns:
        A dict with keys "answer" (str), "sources" (list[str]), "farewell" (bool).
    """
    import re

    if chat_history is None:
        chat_history = []

    shortcircuit_result = _check_shortcircuit(question)
    if shortcircuit_result is not None:
        return shortcircuit_result

    # ── Step 1: Set up LLM ───────────────────────────────────────────────────
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise EnvironmentError(
            "GROQ_API_KEY not found. Please add it to your .env file."
        )

    llm = ChatGroq(
        model=GROQ_MODEL,
        api_key=groq_api_key,
        temperature=0.1,
        max_tokens=1024,
        reasoning_effort="low",
    )

    # ── Step 2: Build QA prompt (system persona + context) ───────────────────
    _system_template = (
        SYSTEM_PROMPT + "\n\nContext: {context}"
    )
    qa_prompt = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(_system_template),
        HumanMessagePromptTemplate.from_template("{question}"),
    ])

    # ── Step 3: Condense question if history exists ──────────────────────────
    if chat_history:
        condense_prompt = PromptTemplate.from_template(
            "Given the conversation history and a follow-up question, "
            "rephrase the follow-up as a standalone question. "
            "If the follow-up is already a clear standalone question, "
            "return it exactly as is without changing any words.\n\n"
            "Chat History: {chat_history}\n"
            "Follow-up: {question}\n"
            "Standalone question:"
        )
        chat_history_str = ""
        for human, ai in chat_history:
            chat_history_str += f"Human: {human}\nAI: {ai}\n"
            
        condense_chain = condense_prompt | llm
        standalone_query = condense_chain.invoke({
            "chat_history": chat_history_str,
            "question": question
        }).content.strip()
    else:
        standalone_query = question

    # ── Step 4: Retrieve chunks and similarity scores ──────────────────────
    # MMR-equivalent parameter trade-off: use similarity_search_with_relevance_scores
    # to retrieve top 6 chunks. Note: MMR diversity is traded off to gain similarity score access.
    docs_with_scores = vector_store.similarity_search_with_relevance_scores(
        query=standalone_query,
        k=6
    )

    source_docs = [doc for doc, score in docs_with_scores]
    scores = [score for doc, score in docs_with_scores]

    # Calculate average similarity score and map to confidence label
    if scores:
        avg_score = sum(scores) / len(scores)
        if avg_score >= CONFIDENCE_HIGH:
            confidence = "High"
        elif avg_score >= CONFIDENCE_MEDIUM:
            confidence = "Medium"
        else:
            confidence = "Low"
    else:
        avg_score = 0.0
        confidence = "Low"

    # ── Step 5: Generate answer using QA prompt ──────────────────────────────
    context = "\n\n".join(doc.page_content for doc in source_docs)
    
    qa_chain = qa_prompt | llm
    result = qa_chain.invoke({
        "context": context,
        "question": standalone_query
    })
    answer = result.content.strip()

    # ── Step 6: Extract unique source filenames ───────────────────────────────
    sources = sorted({
        Path(doc.metadata.get("source", "Unknown source")).name
        for doc in source_docs
    })

    return {
        "answer": answer,
        "sources": sources,
        "source_documents": source_docs,
        "farewell": False,
        "confidence": confidence,
    }


def get_answer_stream(question: str, vector_store: PGVector, chat_history: list | None = None):
    """
    Streaming version of get_answer(), for the /chat/stream endpoint.

    Yields dicts, in order:
      - {"type": "token", "content": str}   — one piece of the answer at a time
      - {"type": "done", "confidence": ..., "sources": [...], "farewell": bool}
        — sent exactly once, after the full answer has streamed

    For short-circuit cases (greeting/farewell/name/summary) there's nothing to
    stream token-by-token, so the whole answer is sent as one "token" event,
    immediately followed by "done".
    """
    if chat_history is None:
        chat_history = []

    # ── Short-circuit cases: no real streaming needed ────────────────────────
    shortcircuit_result = _check_shortcircuit(question)
    if shortcircuit_result is not None:
        yield {"type": "token", "content": shortcircuit_result["answer"]}
        yield {
            "type": "done",
            "confidence": shortcircuit_result["confidence"],
            "sources": shortcircuit_result["sources"],
            "farewell": shortcircuit_result["farewell"],
        }
        return

    # ── Step 1: Set up LLM ───────────────────────────────────────────────────
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise EnvironmentError(
            "GROQ_API_KEY not found. Please add it to your .env file."
        )

    llm = ChatGroq(
        model=GROQ_MODEL,
        api_key=groq_api_key,
        temperature=0.1,
        max_tokens=1024,
        reasoning_effort="low",
    )

    # ── Step 2: Build QA prompt (system persona + context) ───────────────────
    _system_template = (
        SYSTEM_PROMPT + "\n\nContext: {context}"
    )
    qa_prompt = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(_system_template),
        HumanMessagePromptTemplate.from_template("{question}"),
    ])

    # ── Step 3: Condense question if history exists ──────────────────────────
    if chat_history:
        condense_prompt = PromptTemplate.from_template(
            "Given the conversation history and a follow-up question, "
            "rephrase the follow-up as a standalone question. "
            "If the follow-up is already a clear standalone question, "
            "return it exactly as is without changing any words.\n\n"
            "Chat History: {chat_history}\n"
            "Follow-up: {question}\n"
            "Standalone question:"
        )
        chat_history_str = ""
        for human, ai in chat_history:
            chat_history_str += f"Human: {human}\nAI: {ai}\n"

        condense_chain = condense_prompt | llm
        standalone_query = condense_chain.invoke({
            "chat_history": chat_history_str,
            "question": question
        }).content.strip()
    else:
        standalone_query = question

    # ── Step 4: Retrieve chunks and similarity scores ────────────────────────
    docs_with_scores = vector_store.similarity_search_with_relevance_scores(
        query=standalone_query,
        k=6
    )

    source_docs = [doc for doc, score in docs_with_scores]
    scores = [score for doc, score in docs_with_scores]

    if scores:
        avg_score = sum(scores) / len(scores)
        if avg_score >= CONFIDENCE_HIGH:
            confidence = "High"
        elif avg_score >= CONFIDENCE_MEDIUM:
            confidence = "Medium"
        else:
            confidence = "Low"
    else:
        confidence = "Low"

    # ── Step 5: Generate answer — STREAMED instead of invoked all at once ────
    context = "\n\n".join(doc.page_content for doc in source_docs)
    qa_chain = qa_prompt | llm

    for chunk in qa_chain.stream({"context": context, "question": standalone_query}):
        if chunk.content:
            yield {"type": "token", "content": chunk.content}

    # ── Step 6: Extract sources, then signal completion ───────────────────────
    sources = sorted({
        Path(doc.metadata.get("source", "Unknown source")).name
        for doc in source_docs
    })

    yield {
        "type": "done",
        "confidence": confidence,
        "sources": sources,
        "farewell": False,
    }

def create_summaries_table_if_not_exists() -> None:
    """Create the document_summaries table in Supabase if it does not already exist."""
    db_url = get_db_url()
    if not db_url:
        return
    import psycopg2
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS document_summaries (
                id SERIAL PRIMARY KEY,
                filename TEXT UNIQUE,
                summary TEXT,
                generated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        conn.commit()
        cur.close()
        conn.close()
        print("[DEBUG] Verified document_summaries table in Supabase.")
    except Exception as e:
        print(f"[DEBUG] Error creating document_summaries table: {e}")


def generate_summary(filename: str) -> str | None:
    """
    Generates a structured summary for a single PDF document using map-reduce via Google Gemini.
    
    Args:
        filename: Path to the PDF file (e.g., "documents/filename.pdf").
    """
    filename = filename.replace("\\", "/")
    import os
    from langchain_community.document_loaders import PyPDFLoader
    from langchain.text_splitter import RecursiveCharacterTextSplitter

    try:
        if not os.path.exists(filename):
            print(f"[ERROR] File not found: {filename}")
            return None

        # 1. Load the PDF using PyPDFLoader
        loader = PyPDFLoader(filename)
        docs = loader.load()

        if not docs:
            print(f"[WARNING] No pages loaded from {filename}")
            return None

        # 2. Split into chunks using RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = splitter.split_documents(docs)

        if not chunks:
            print(f"[WARNING] No text chunks extracted from {filename}")
            return None

        # Sample down chunks if they exceed MAX_SUMMARY_CHUNKS
        if len(chunks) > MAX_SUMMARY_CHUNKS:
            chunks = chunks[::len(chunks)//MAX_SUMMARY_CHUNKS][:MAX_SUMMARY_CHUNKS]

        # 3. Map step: loop over chunks and call Gemini directly
        chunk_summaries = []
        for i, chunk in enumerate(chunks):
            # Proactively sleep 2 seconds between every chunk call to avoid hitting rate limits
            if i > 0:
                time.sleep(2)

            map_prompt = (
                "You are summarizing a section of an AIESEC Finance & Legal policy document.\n"
                "Extract all important information from this section including:\n"
                "- Key policies and rules\n"
                "- Specific amounts, limits, or deadlines\n"
                "- Procedures members need to follow\n"
                "- Any exceptions or special cases\n"
                "Be thorough and specific. Do not skip details.\n\n"
                f"Document section:\n{chunk.page_content}\n\n"
                "SECTION SUMMARY:"
            )

            success = False
            for attempt in range(3):  # up to 3 attempts total (initial + 2 retries)
                try:
                    response = client.models.generate_content(
                        model="gemini-2.5-flash-lite",
                        contents=map_prompt
                    )
                    chunk_summaries.append(response.text.strip())
                    success = True
                    break
                except Exception as e:
                    is_rate_limit = "429" in str(e) or "rate" in str(e).lower() or "quota" in str(e).lower() or "resourceexhausted" in str(e).lower()
                    if is_rate_limit and attempt < 2:
                        print(f"[WARNING] Rate limit hit on chunk {i}, attempt {attempt + 1}. Retrying in 15 seconds... Error: {e}")
                        time.sleep(15)
                    else:
                        print(f"[ERROR] Failed on chunk {i}, attempt {attempt + 1}. Error: {e}")
                        break

            # If all 3 attempts fail, we continue to the next chunk without adding to chunk_summaries

        # 4. Combine step: call Gemini once more to combine summaries
        combined_text = "\n\n".join(chunk_summaries)
        combine_prompt = (
            "You are creating a final detailed summary of an AIESEC Finance & Legal\n"
            "policy document from section summaries below.\n"
            "Produce a well-structured summary with clear headings covering:\n"
            "- What this document is about\n"
            "- Key policies and rules\n"
            "- Specific amounts, limits, or deadlines mentioned\n"
            "- Step-by-step procedures members need to follow\n"
            "- Exceptions or edge cases\n"
            "- Any other important details\n\n"
            "Write clearly. Members will use this as a reference document.\n\n"
            f"Section summaries:\n{combined_text}\n\n"
            "FINAL SUMMARY:"
        )

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=combine_prompt
            )
            return response.text.strip()
        except Exception as e:
            if "resourceexhausted" in str(e).lower() or "rate limit" in str(e).lower() or "429" in str(e):
                raise Exception("rate limit hit — wait 60 seconds") from e
            else:
                raise Exception(f"unknown error in combine step: {e}") from e

    except Exception as e:
        print(f"[ERROR] Failed to generate summary for {filename}: {e}")
        raise e


def save_summary(filename: str, summary: str) -> bool:
    """Saves a generated summary to the document_summaries table in Supabase."""
    filename = filename.replace("\\", "/")
    db_url = get_db_url()
    if not db_url:
        return False
    import psycopg2
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO document_summaries (filename, summary, generated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (filename)
            DO UPDATE SET summary = EXCLUDED.summary, generated_at = NOW();
        """, (filename, summary))
        conn.commit()
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"[ERROR] Failed to save summary for {filename}: {e}")
        return False


def get_summary(filename: str) -> str | None:
    """Fetches a stored summary from document_summaries by filename."""
    filename = filename.replace("\\", "/")
    db_url = get_db_url()
    if not db_url:
        return None
    import psycopg2
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("""
            SELECT summary FROM document_summaries
            WHERE filename = %s;
        """, (filename,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return row[0]
        return None
    except Exception as e:
        print(f"[ERROR] Failed to fetch summary for {filename}: {e}")
        return None


def get_all_summary_statuses() -> dict:
    """
    Returns a dict mapping filename -> bool (True if summary exists,
    False if not) for all documents currently in langchain_pg_embedding.
    """
    db_url = get_db_url()
    if not db_url:
        return {}
    import psycopg2
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # 1. Fetch all distinct source names from langchain_pg_embedding
        cur.execute("""
            SELECT DISTINCT cmetadata->>'source' AS source
            FROM langchain_pg_embedding
            WHERE cmetadata->>'source' IS NOT NULL;
        """)
        source_rows = cur.fetchall()
        
        # 2. Fetch all filenames that currently have summaries
        cur.execute("""
            SELECT filename FROM document_summaries;
        """)
        summary_rows = cur.fetchall()
        cur.close()
        conn.close()
        
        existing_summaries = {row[0].replace("\\", "/") for row in summary_rows if row[0]}
        
        statuses = {}
        for row in source_rows:
            source_path = row[0]
            if not source_path:
                continue
            normalized_path = source_path.replace("\\", "/")
            statuses[source_path] = (normalized_path in existing_summaries)
            
        return statuses
    except Exception as e:
        print(f"[ERROR] Failed to retrieve summary statuses: {e}")
        return {}


def generate_summaries_sequential(filenames: list, delay_seconds: int = 4) -> dict:
    """
    Generates and saves summaries for a list of documents sequentially
    with a delay between each to avoid Groq rate limits.
    """
    import time
    succeeded = []
    failed = []
    
    total = len(filenames)
    for idx, filename in enumerate(filenames, 1):
        print(f"[INFO] Generating summary for {idx} of {total}: {filename}")
        try:
            summary = generate_summary(filename)
            if summary:
                if save_summary(filename, summary):
                    succeeded.append(filename)
                else:
                    failed.append(filename)
            else:
                failed.append(filename)
        except Exception as e:
            print(f"[ERROR] Failed to generate summary for {filename}: {e}")
            failed.append(filename)
            
        if idx < total:
            time.sleep(delay_seconds)
            
    return {"succeeded": succeeded, "failed": failed}
