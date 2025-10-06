import Redis from "ioredis";
import { type ChatMessage, type InsertChatMessage, type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export class RedisStorage {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  async getUser(id: string): Promise<User | undefined> {
    const data = await this.redis.get(`user:${id}`);
    return data ? JSON.parse(data) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const keys = await this.redis.keys("user:*");
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (!data) continue;
      const user: User = JSON.parse(data);
      if (user.username === username) return user;
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    await this.redis.set(`user:${id}`, JSON.stringify(user));
    return user;
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = { 
      ...insertMessage, 
      id,
      timestamp: new Date().toISOString(),
      isBot: insertMessage.isBot ?? false,
      namespace: insertMessage.namespace || "None",
    };

    const key = `chat_history:${insertMessage.namespace}:${insertMessage.sessionId}`;
    await this.redis.rpush(key, JSON.stringify(message));
    await this.redis.expire(key, 86400); // expire in 1 day

    return message;
  }

  async getChatMessages(sessionId: string, namespace: string): Promise<ChatMessage[]> {
    const key = `chat_history:${namespace}:${sessionId}`;
    const messages = await this.redis.lrange(key, 0, -1);
    return messages.map(msg => JSON.parse(msg));
  }
}