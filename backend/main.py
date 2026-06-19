# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List

from rag import get_answer, load_vector_store

app = FastAPI()

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

