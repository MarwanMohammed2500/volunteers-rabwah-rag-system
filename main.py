from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from models import ChatRequest
from src.utils.full_chain import get_response
from typing import AsyncGenerator, List, Dict, Any
from src.utils.redis import chat_history_manager
from src.utils.Vector_db import get_existing_namespaces
from dotenv import load_dotenv
import uvicorn
import asyncio
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(message)s')
logger = logging.getLogger(__name__)

load_dotenv(override=True)
allow_origins = os.getenv("ALLOW_ORIGINS", ["http://localhost", "http://frontend"])
allow_credentials = os.getenv("ALLOW_CREDENTIALS", True)
allow_methods = os.getenv("ALLOW_METHODS", True)
allow_headers = os.getenv("ALLOW_HEADERS", True)
port = int(os.getenv("PORT", 8080))
host = os.getenv("HOST", "0.0.0.0")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting up FastAPI app...")
    try:
        await chat_history_manager.initialize()
        logger.info("✅ Redis chat history manager initialized")
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        raise e  # Crash startup if Redis fails

    yield  # This means startup is complete

    logger.info("🛑 Shutting down FastAPI app...")
    await chat_history_manager.close()
    logger.info("✅ Redis connection closed")


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=allow_methods,
    allow_headers=allow_headers,
)



@app.get("/api/chat/namespaces")
async def get_chat_namespaces():
    """Return available chat namespace names"""
    namespaces = get_existing_namespaces("non-profit-rag")
    logger.info(f"Returned namespaces: {namespaces}")
    if len(namespaces) == 0:
        return JSONResponse(content={"namespaces": ["default"]})
    return JSONResponse(content={"namespaces": namespaces})

@app.get("/api/chat/{namespace}/{session_id}/message")
async def get_chat_messages(namespace: str, session_id: str):
    try:
        messages = await chat_history_manager.get_messages(session_id, namespace)
        return {"messages": messages}
    except Exception as e:
        logger.error(f"[ERROR] Failed to fetch messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch messages")


@app.post("/api/chat/{namespace}/{session_id}/message")
async def chat_endpoint(namespace: str, session_id: str, request: ChatRequest):
    try:
        # Get existing chat history in text form for RAG
        rag_history = await chat_history_manager.get_messages_as_text(session_id, namespace)

        # Process the chat through your RAG system
        rag_response = await asyncio.get_event_loop().run_in_executor(
            None,
            get_response,
            request.content,
            rag_history,
            namespace
        )

        # Save the human message
        logger.info("[DEBUG] Adding human message...")
        await chat_history_manager.add_human_message(session_id=session_id, content=request.content, namespace=namespace)

        # Save the AI message
        logger.info("[DEBUG] Adding AI message...")
        await chat_history_manager.add_ai_message(session_id=session_id, content=rag_response['answer'], namespace=namespace)

        # Fetch updated chat history
        logger.info("[DEBUG] Fetching updated messages...")
        messages = await chat_history_manager.get_messages(session_id, namespace)

        return JSONResponse({
            "response": rag_response['answer'],
            "session_id": session_id,
            "namespace": namespace,
            "messages": messages
        })

    except Exception as e:
        logger.error(f"[ERROR] Error processing chat for session {session_id}, namespace {namespace}: {str(e)}")
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