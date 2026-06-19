# pyrefly: ignore [missing-import]
from fastapi import FastAPI, UploadFile, File
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import List
import json
import asyncio
import os
import psycopg2
from pathlib import Path

from rag import get_answer, load_vector_store, get_db_url
from fastapi.middleware.cors import CORSMiddleware
from ingest import run_ingestion
from generate_summaries import generate_summary_for_file

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOCUMENTS_DIR = Path("documents")


class ChatRequest(BaseModel):
    question: str
    chat_history: List[List[str]] = []

# Initialize vector_store globally
try:
    vector_store = load_vector_store()
except Exception as e:
    vector_store = None
    print(f"Failed to load vector store on startup: {e}")


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
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.post("/chat/stream")
def chat_stream(request: ChatRequest):
    global vector_store
    if vector_store is None:
        vector_store = load_vector_store()

    async def event_stream():
        try:
            chat_history_as_tuples = [tuple(item) for item in request.chat_history]
            result = get_answer(request.question, vector_store, chat_history_as_tuples)
            
            answer = result.get("answer") or ""
            words = answer.split(" ")
            
            for word in words:
                yield f'data: {json.dumps({"type": "token", "value": word + " "})}\n\n'
                await asyncio.sleep(0.03)
                
            yield f'data: {json.dumps({"type": "done", "confidence": result.get("confidence"), "sources": result.get("sources"), "farewell": result.get("farewell")})}\n\n'
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
        
        results = []
        for filename in pdf_files:
            # Always normalize filenames: filename.replace("\\", "/")
            normalized = "documents/" + filename.replace('\\', '/')
            
            # Query langchain_pg_embedding to get chunk count
            cur.execute(
                "SELECT COUNT(*) FROM langchain_pg_embedding WHERE cmetadata->>'source' = %s",
                (normalized,)
            )
            chunks = cur.fetchone()[0] or 0
            
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
def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        return JSONResponse(status_code=400, content={"error": "Only PDF files are supported."})
        
    db_url = get_db_url()
    
    filename = os.path.basename(file.filename.replace("\\", "/"))
    file_path = DOCUMENTS_DIR / filename
    
    # Save file
    try:
        DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())
            
        # Run ingestion for this file
        ingest_path = f"documents/{filename}"
        run_ingestion(file_paths=[ingest_path], clear_collection=False)
        
        # Invalidate vector store cache
        load_vector_store.cache_clear()
        
        return {"status": "ok", "filename": filename}
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
        
        load_vector_store.cache_clear()
        
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