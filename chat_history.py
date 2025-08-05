from typing import Dict, List
from models import ChatMessage
import uuid
from datetime import datetime

# Temporary in-memory storage (replace with DB)
storage = {}

def create_chat_message(message: ChatMessage):
    if message.session_id not in storage:
        storage[message.session_id] = []
    
    # Add id and timestamp if not already present
    msg_dict = message.dict()
    msg_dict["id"] = str(uuid.uuid4())
    msg_dict["timestamp"] = datetime.utcnow().isoformat()

    storage[message.session_id].append(msg_dict)
    return msg_dict  # return dict instead of ChatMessage

def get_chat_messages(session_id: str) -> List[Dict]:
    return storage.get(session_id, [])
