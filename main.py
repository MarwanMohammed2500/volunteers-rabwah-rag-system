from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from models import ChatRequest
from src.utils.full_chain import get_response
from typing import AsyncGenerator
from src.utils.redis import chat_history_manager
from src.utils.Vector_db import get_existing_namespaces
from dotenv import load_dotenv
import uvicorn
import asyncio
import os

load_dotenv(override=True)
allow_origins = os.getenv("ALLOW_ORIGINS", ["http://localhost:5173", "http://frontend"])
allow_credentials = os.getenv("ALLOW_CREDENTIALS", True)
allow_methods = os.getenv("ALLOW_METHODS", True)
allow_headers = os.getenv("ALLOW_HEADERS", True)
port = int(os.getenv("PORT", 8080))
host = os.getenv("HOST", "0.0.0.0")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=allow_methods,
    allow_headers=allow_headers,
)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: Initialize resources
    print("🚀 Starting up FastAPI application...")
    
    # Test Redis connection on startup
    try:
        await chat_history_manager.redis  # This will initialize the connection
        print("✅ Redis connection established")
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
    
    yield  # This is where the application runs
    
    # Shutdown: Clean up resources
    print("🛑 Shutting down FastAPI application...")
    await chat_history_manager.close()
    print("✅ Redis connection closed")

from typing import List, Dict, Any

@app.get("/api/chat/namespaces")
async def get_chat_namespaces():
    """Return available chat namespace names"""
    namespaces = get_existing_namespaces("non-profit-rag")
    print(f"Returned namespaces: {namespaces}")
    if len(namespaces) == 0:
        return ["default"]
    return namespaces

@app.post("/api/chat/{namespace}/{session_id}/message")
async def chat_endpoint(namespace: str, session_id: str, request: ChatRequest):
    try:
        # Pass namespace to history manager methods
        rag_history = await chat_history_manager.get_messages_as_text(session_id, namespace)
        print(f"[INFO] Retrieved {len(rag_history)} messages from history for session {session_id}, namespace: {namespace}")

        # Process the chat
        rag_response = await asyncio.get_event_loop().run_in_executor(
            None,
            get_response,
            request.content,
            rag_history,
            namespace
        )
        
        print(f"[INFO] response: {rag_response['answer']}")

        # Save messages with namespace
        await chat_history_manager.add_human_message(session_id, request.content, namespace)
        await chat_history_manager.add_ai_message(session_id, rag_response['answer'], namespace)

        return JSONResponse({
            "response": rag_response['answer'],
            "session_id": session_id,
            "namespace": namespace
        })

    except Exception as e:
        print(f"[ERROR] Error processing chat for session {session_id}, namespace {namespace}:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return JSONResponse({"response": True})

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False
    )