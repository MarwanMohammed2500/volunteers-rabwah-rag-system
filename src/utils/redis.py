import asyncio
import json
import redis.asyncio as redis
from typing import List, Dict, Any, Optional
from datetime import timedelta
from dotenv import load_dotenv
import os

load_dotenv()

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://redis_server:6379")
SESSION_TTL = int(os.getenv("SESSION_TTL", 86400))  # 24 hours

class AsyncRedisChatManager:
    def __init__(self):
        self.redis_url = REDIS_URL
        self.session_ttl = SESSION_TTL
        self._redis_pool = None
    
    async def initialize(self):
        """Initialize Redis connection pool"""
        if self._redis_pool is None:
            self._redis_pool = redis.ConnectionPool.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=10
            )
            print("✅ Redis connection pool created")
    
    @property
    async def redis(self) -> redis.Redis:
        """Get Redis client from pool"""
        if self._redis_pool is None:
            await self.initialize()
        
        return redis.Redis(connection_pool=self._redis_pool)
    
    async def health_check(self) -> bool:
        """Check if Redis is connected and responsive"""
        try:
            client = await self.redis
            await client.ping()
            return True
        except Exception as e:
            print(f"❌ Redis health check failed: {e}")
            return False
    
    def _get_session_key(self, session_id: str, namespace: str) -> str:
        """Generate Redis key for session"""
        return f"chat_history:{namespace}:{session_id}"
    
    async def add_message(self, session_id: str, namespace: str, role: str, content: str):
        """Add a message to chat history"""
        client = await self.redis
        key = self._get_session_key(session_id, namespace)
        
        message = {
            "role": role,
            "content": content,
            "timestamp": asyncio.get_event_loop().time()
        }
        
        # Use Redis list to store messages
        await client.rpush(key, json.dumps(message))
        await client.expire(key, self.session_ttl)
    
    async def get_messages(self, session_id: str, namespace: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all messages for a session"""
        client = await self.redis
        key = self._get_session_key(session_id, namespace)
        
        messages_json = await client.lrange(key, 0, limit - 1)
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
    
    async def add_ai_message(self, session_id: str, content: str):
        """Add AI message"""
        await self.add_message(session_id, namespace, "ai", content)
    
    async def clear_history(self, session_id: str):
        """Clear chat history for session"""
        client = await self.redis
        key = self._get_session_key(session_id, namespace)
        await client.delete(key)
    
    async def get_session_ids(self, pattern: str = "chat:session:*") -> List[str]:
        """Get all session IDs (for admin purposes)"""
        client = await self.redis
        keys = await client.keys(pattern)
        # Extract session IDs from keys
        return [key.split(":")[-1] for key in keys]
    
    async def close(self):
        """Close Redis connection pool"""
        if self._redis_pool:
            await self._redis_pool.disconnect()
            print("✅ Redis connection pool closed")

# Global instance
chat_history_manager = AsyncRedisChatManager()