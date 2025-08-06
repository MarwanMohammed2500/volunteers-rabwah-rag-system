from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from models import ChatRequest
from src.utils.full_chain import get_response
import httpx
from requests import Request
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
                   "http://localhost:8501"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/chat/{session_id}/message")
async def chat_endpoint(session_id: str, request: ChatRequest):
    try:
        rag_history = [
            f"{'Human' if 'human' in msg else 'AI'}: {list(msg.values())[0]}"
            for msg in request.chat_history
        ]

        rag_response = get_response(
            user_query=request.content,
            chat_history=rag_history
        )

        return JSONResponse({
            "response": rag_response['answer'],
            "session_id": session_id
        })

    except Exception as e:
        print("[ERROR] Error processing chat:", str(e))
        raise HTTPException(status_code=500, detail=str(e))