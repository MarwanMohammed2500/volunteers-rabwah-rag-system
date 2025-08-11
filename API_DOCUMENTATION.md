## localhost/api/chat/{session_id}/message (main.py chat_endpoint function)
Checks history, logs actions, and calls on the embeddings model and LLM

## Allowed Origins
Please add the bots production URL to the `allowed_origins` attribute in the `add_middleware` call in `main.py`