import { type User, type InsertUser, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { randomUUID } from "crypto";
import { RedisStorage } from "./redisStorage";

export const storage = new RedisStorage(process.env.REDIS_URL || "redis://redis_server:6379");

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createChatMessage(message: InsertChatMessage & { namespace?: string }): Promise<ChatMessage>;
  getChatMessages(sessionId: string, namespace?: string): Promise<ChatMessage[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private chatMessages: Map<string, ChatMessage>;

  constructor() {
    this.users = new Map();
    this.chatMessages = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      timestamp: new Date().toISOString(),
      isBot: insertMessage.isBot ?? false,
      namespace: insertMessage.namespace || "default",
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getChatMessages(sessionId: string, namespace: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.sessionId === sessionId && message.namespace === namespace)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}