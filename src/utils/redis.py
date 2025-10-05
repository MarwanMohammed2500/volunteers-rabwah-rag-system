import asyncio
import json
import redis.asyncio as redis
from typing import List, Dict, Any, Optional
# from datetime import timedelta
from dotenv import load_dotenv
import os
import logging
import time

logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://redis_server:6379")
SESSION_TTL = int(os.getenv("SESSION_TTL", 86400))  # 24 hours

class AsyncRedisChatManager:
    def __init__(self):
        self.redis_url = REDIS_URL
        self.session_ttl = SESSION_TTL
        self._redis_pool = None
        self.client: Optional[redis.Redis] = None
    
    async def initialize(self):
        """Initialize Redis connection pool"""
        if self._redis_pool is None:
            self._redis_pool = redis.ConnectionPool.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=10,
                db=0
            )
            logger.info("✅ Redis connection pool created")
        if self.client is None:
            self.client = redis.Redis(connection_pool=self._redis_pool)
            logger.info("✅ Redis client initialized")
    
    async def health_check(self) -> bool:
        """Check if Redis is connected and responsive"""
        try:
            await self.client.ping()
            return True
        except Exception as e:
            logger.error(f"❌ Redis health check failed: {e}")
            return False
    
    def _get_session_key(self, session_id: str, namespace: str) -> str:
        """Generate Redis key for session"""
        return f"chat_history:{namespace}:{session_id}"
    
    async def add_message(self, session_id: str, namespace: str, role: str, content: str):
        """Add message to chat history"""
        if self.client is None:
            await self.initialize()

        key = self._get_session_key(session_id=session_id, namespace=namespace)
        message = {
            "role": role,
            "content": content,
            "timestamp": int(time.time())
        }

        logger.info(f"[DEBUG] Adding message to {key}")
        await self.client.rpush(key, json.dumps(message))
        logger.info(f"Pushed Key!: {key}")
        ok = await self.client.expire(key, int(self.session_ttl))
        if not ok:
            logger.warning(f"[WARN] Failed to set TTL for {key}")
        else:
            ttl = await self.client.ttl(key)
            logger.info(f"[DEBUG] Key {key} TTL set to {ttl} seconds")
    
    async def get_messages(self, session_id: str, namespace: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all messages for a session"""
        key = self._get_session_key(session_id=session_id, namespace=namespace)
        
        logger.info(f"[DEBUG] Getting messages for {key}")
        messages_json = await self.client.lrange(key, 0, -1)
        logger.info(f"[DEBUG] Found {len(messages_json)} messages for {key}")
        logger.info(f"[DEBUG] Messages: {messages_json}")
        
        messages = []
        
        for msg_json in messages_json:
            try:
                messages.append(json.loads(msg_json))
            except json.JSONDecodeError:
                # Handle corrupted messages gracefully
                continue
        
        return messages
    
    async def get_messages_as_text(self, session_id: str, namespace: str) -> List[str]:
        """Retrieve chat history in RAG-friendly text format"""
        messages = await self.get_messages(session_id, namespace)
        
        rag_history = []
        for msg in messages:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            rag_history.append(f"{role}: {content}")
        
        return rag_history
    
    async def add_human_message(self, session_id: str, namespace: str, content: str):
        """Add human message"""
        await self.add_message(session_id, namespace, "human", content)
    
    async def add_ai_message(self, session_id: str, namespace: str, content: str):
        """Add AI message"""
        await self.add_message(session_id, namespace, "ai", content)
    
    async def clear_history(self, session_id: str, namespace: str):
        """Clear chat history for session"""
        key = self._get_session_key(session_id=session_id, namespace=namespace)
        await self.client.delete(key)
    
    async def get_session_ids(self, pattern: str = "chat_history:*:*") -> List[str]:
        """Get all session IDs (for admin/debug)"""
        keys = await self.client.keys(pattern)
        # Extract session IDs from keys
        return [key.split(":")[-1] for key in keys]
    
    async def close(self):
        """Close Redis connection pool"""
        if self._redis_pool:
            await self._redis_pool.disconnect()
            logger.info("✅ Redis connection pool closed")

# Global instance
chat_history_manager = AsyncRedisChatManager()