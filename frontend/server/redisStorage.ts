import { Redis } from "ioredis";
import { type User, type InsertUser, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createChatMessage(message: InsertChatMessage & { namespace?: string }): Promise<ChatMessage>;
  getChatMessages(sessionId: string, namespace?: string): Promise<ChatMessage[]>;
}

export class RedisStorage implements IStorage {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url);
  }

  async getUser(id: string): Promise<User | undefined> {
    const user = await this.client.get(`user:${id}`);
    return user ? JSON.parse(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Implement if needed (e.g., scan Redis for users)
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    await this.client.set(`user:${id}`, JSON.stringify(user));
    return user;
  }

  async createChatMessage(insertMessage: InsertChatMessage & { namespace?: string }): Promise<ChatMessage> {
    const id = randomUUID();
    const namespace = insertMessage.namespace || "default";
    const message: ChatMessage = {
      ...insertMessage,
      id,
      timestamp: new Date().toISOString(),
      isBot: insertMessage.isBot ?? false,
      namespace,
    };
    await this.client.lpush(
      `chat_history:${namespace}:${insertMessage.sessionId}`,
      JSON.stringify(message)
    );
    return message;
  }

  async getChatMessages(sessionId: string, namespace: string = "default"): Promise<ChatMessage[]> {
    const messages = await this.client.lrange(
      `chat_history:${namespace}:${sessionId}`,
      0,
      -1
    );
    return messages
      .map(msg => JSON.parse(msg))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}