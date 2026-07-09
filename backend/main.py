# pyrefly: ignore [missing-import]
from fastapi import FastAPI, UploadFile, File, BackgroundTasks
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import List
import json
import asyncio
import os
import psycopg2
from pathlib import Path

from rag import get_answer, load_vector_store, get_db_url, EmbeddingRateLimitError, COLLECTION_NAME
from fastapi.middleware.cors import CORSMiddleware
from ingest import run_ingestion
from generate_summaries import generate_summary_for_file

app = FastAPI()


def process_document_in_background(ingest_path: str):
    """Ingests the saved document in the background to avoid blocking requests."""
    try:
        print(f"[BACKGROUND] Starting ingestion for: {ingest_path}", flush=True)
        run_ingestion(file_paths=[ingest_path], clear_collection=False)
        print(f"[BACKGROUND] Ingestion completed successfully for: {ingest_path}", flush=True)
    except Exception as e:
        print(f"[BACKGROUND_ERROR] Ingestion failed for {ingest_path}: {e}", flush=True)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(aiesec-bot\.vercel\.app|aiesec-[a-z0-9]+-aliikashifs-projects\.vercel\.app|localhost:(5173|5174))$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOCUMENTS_DIR = Path("documents")


class ChatRequest(BaseModel):
    question: str
    chat_history: List[List[str]] = []

# Lazy-loaded on first request — see /chat and /chat/stream
vector_store = None


@app.get("/")
def read_root():
    return {"message": "AIESEC F&L Bot API is running"}


@app.post("/chat")
def chat(request: ChatRequest):
    global vector_store
    try:
        if vector_store is None:
            vector_store = load_vector_store()
        
        # Convert chat_history from a list of lists into a list of tuples
        chat_history_as_tuples = [tuple(item) for item in request.chat_history]
        
        result = get_answer(request.question, vector_store, chat_history_as_tuples)
        
        return {
            "answer": result.get("answer"),
            "confidence": result.get("confidence"),
            "sources": result.get("sources"),
            "farewell": result.get("farewell"),
        }
    except EmbeddingRateLimitError as e:
        return JSONResponse(
            status_code=429,
            content={"error": str(e)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.post("/chat/stream")
def chat_stream(request: ChatRequest):
    global vector_store
    try:
        if vector_store is None:
            vector_store = load_vector_store()
        
        chat_history_as_tuples = [tuple(item) for item in request.chat_history]
        result = get_answer(request.question, vector_store, chat_history_as_tuples)
    except EmbeddingRateLimitError as e:
        return JSONResponse(
            status_code=429,
            content={"error": str(e)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

    async def event_stream():
        try:
            answer = result.get("answer") or ""
            words = answer.split(" ")
            
            for word in words:
                yield f'data: {json.dumps({"type": "token", "value": word + " "})}\n\n'
                await asyncio.sleep(0.03)
                
            source_docs_serialized = [
                {"page_content": doc.page_content, "metadata": doc.metadata}
                for doc in result.get("source_documents", [])
            ]
            yield f'data: {json.dumps({"type": "done", "confidence": result.get("confidence"), "sources": result.get("sources"), "farewell": result.get("farewell"), "source_documents": source_docs_serialized})}\n\n'
        except Exception as e:
            yield f'data: {json.dumps({"type": "error", "message": str(e)})}\n\n'

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/documents")
def get_documents():
    db_url = get_db_url()
    conn = None
    try:
        # Scan backend/documents folder for all .pdf files
        pdf_files = []
        if DOCUMENTS_DIR.exists():
            pdf_files = [f.name for f in DOCUMENTS_DIR.glob("*.pdf")]
        
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Log all unique sources in the DB first for debugging
        cur.execute("SELECT DISTINCT cmetadata->>'source' FROM langchain_pg_embedding WHERE cmetadata->>'source' IS NOT NULL")
        db_sources = [row[0] for row in cur.fetchall()]
        print(f"[DEBUG GET /documents] Unique source strings in DB: {db_sources}", flush=True)
        
        results = []
        for filename in pdf_files:
            # Always normalize filenames: filename.replace("\\", "/")
            normalized = "documents/" + filename.replace('\\', '/')
            
            # Query langchain_pg_embedding joining with collection, normalizing backslashes
            cur.execute(
                """
                SELECT COUNT(*) 
                FROM langchain_pg_embedding emb
                JOIN langchain_pg_collection col ON emb.collection_id = col.uuid
                WHERE col.name = %s 
                  AND REPLACE(emb.cmetadata->>'source', '\\', '/') = %s
                """,
                (COLLECTION_NAME, normalized)
            )
            chunks = cur.fetchone()[0] or 0
            
            print(f"[DEBUG GET /documents] Matching filename '{filename}' (normalized: '{normalized}') -> {chunks} chunks", flush=True)
            
            # Query document_summaries to check if a summary exists
            cur.execute(
                "SELECT id FROM document_summaries WHERE filename = %s",
                (normalized,)
            )
            has_summary = cur.fetchone() is not None
            
            results.append({
                "filename": filename,
                "chunks": chunks,
                "has_summary": has_summary
            })
            
        cur.close()
        return results
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if conn:
            conn.close()


@app.post("/documents/upload")
def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        return JSONResponse(status_code=400, content={"error": "Only PDF files are supported."})
        
    filename = os.path.basename(file.filename.replace("\\", "/"))
    file_path = DOCUMENTS_DIR / filename
    
    # Save file
    try:
        DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())
            
        # Schedule the chunking, embedding, and loading to run in the background
        ingest_path = f"documents/{filename}"
        background_tasks.add_task(process_document_in_background, ingest_path)
        
        return {"status": "processing", "filename": filename}
    except Exception as e:
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.delete("/documents/{filename}")
def delete_document(filename: str):
    filename = os.path.basename(filename.replace("\\", "/"))
    file_path = DOCUMENTS_DIR / filename
    
    db_url = get_db_url()
    conn = None
    try:
        if file_path.exists():
            file_path.unlink()
            
        normalized = f"documents/{filename}"
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        cur.execute(
            "DELETE FROM langchain_pg_embedding WHERE cmetadata->>'source' = %s",
            (normalized,)
        )
        
        cur.execute(
            "DELETE FROM document_summaries WHERE filename = %s",
            (normalized,)
        )
        
        conn.commit()
        cur.close()
        
        return {"status": "deleted", "filename": filename}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if conn:
            conn.close()


@app.post("/documents/summarize/{filename}")
def summarize_document(filename: str):
    filename = os.path.basename(filename.replace("\\", "/"))
    db_url = get_db_url()
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        file_path = DOCUMENTS_DIR / filename
        if not file_path.exists():
            return JSONResponse(status_code=404, content={"error": "File not found on server disk."})
            
        normalized = f"documents/{filename}"
        generate_summary_for_file(normalized, conn)
        
        return {"status": "ok", "filename": filename}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if conn:
            conn.close()


@app.get("/documents/download/{filename}")
def download_document(filename: str):
    filename = os.path.basename(filename.replace("\\", "/"))
    file_path = DOCUMENTS_DIR / filename
    if not file_path.exists():
        return JSONResponse(status_code=404, content={"error": "File not found"})
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename
    )


class FollowupRequest(BaseModel):
    question: str
    answer: str
    source_documents: List[dict] = []


@app.post("/followups")
def get_followup_suggestions(request: FollowupRequest):
    if not request.source_documents:
        return {"followups": []}

    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        return {"followups": []}

    try:
        import re
        from groq import Groq
        groq_client = Groq(api_key=groq_api_key)

        # Build prompt using source document texts
        docs_text = "\n\n".join([doc.get("page_content", "") for doc in request.source_documents if isinstance(doc, dict)])

        prompt = (
            "You are generating exactly 3 follow-up questions that a user might want to ask next after receiving an answer to their previous question.\n"
            "Here is the context and history:\n"
            f"User Question: {request.question}\n"
            f"Bot Answer: {request.answer}\n\n"
            f"Source Document Chunks:\n{docs_text}\n\n"
            "Instructions:\n"
            "1. Only suggest follow-up questions that can be answered using the document chunks provided above.\n"
            "2. Do not invent questions about topics not covered in these chunks.\n"
            "3. Keep each question short, natural, and conversational.\n"
            "4. Respond with EXACTLY a JSON array of 3 strings and absolutely nothing else. Do not wrap in markdown code blocks, do not write a preamble, do not write any text other than the raw JSON array (e.g. [\"question 1\", \"question 2\", \"question 3\"])."
        )

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="openai/gpt-oss-20b",
            temperature=0.7,
            reasoning_effort="low",
            include_reasoning=False,
        )

        content = chat_completion.choices[0].message.content.strip()

        # Clean markdown code block fences if present
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\n?", "", content, flags=re.IGNORECASE)
            content = re.sub(r"\n?```$", "", content)
        content = content.strip()

        followups = json.loads(content)
        if isinstance(followups, list):
            followups = [str(x) for x in followups[:3]]
            return {"followups": followups}
        return {"followups": []}
    except Exception as e:
        print(f"[ERROR] Failed to generate followups: {e}")
        return {"followups": []}