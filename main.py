from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from models import ChatRequest
from src.utils.full_chain import get_response
from dotenv import load_dotenv
import uvicorn
import os

_ = load_dotenv(override=True)
allow_origins = os.getenv("ALLOW_ORIGINS", [])
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

@app.post("/api/chat/{session_id}/message")
async def chat_endpoint(session_id: str, request: ChatRequest):
    try:
        rag_history = [
            f"{'Human' if 'human' in msg else 'AI'}: {list(msg.values())[0]}"
            for msg in request.chat_history
        ]
        print("[INFO] Prepared chat history")

        rag_response = get_response(
            user_query=request.content,
            chat_history=rag_history
        )
        print(f"[INFO] response: {rag_response['answer']}")

        return JSONResponse({
            "response": rag_response['answer'],
            "session_id": session_id
        })

    except Exception as e:
        print("[ERROR] Error processing chat:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False
    )