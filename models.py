from pydantic import BaseModel
from typing import List, Dict
class ChatMessage(BaseModel):
    content: str
    is_bot: bool
    session_id: str

class ChatRequest(BaseModel):
    content: str
    chat_history: List[Dict[str, str]] = []

class ChatResponse(BaseModel):
    response: str
    session_id: str