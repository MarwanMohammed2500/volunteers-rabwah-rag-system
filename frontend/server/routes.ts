import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatMessageSchema } from "@shared/schema";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

interface ChatMessage {
  human?: string;
  ai?: string;
}

interface ChatResponse {
  response: string;
  session_id: string;
}

async function getRagChatbotResponse(
  userMessage: string,
  sessionId: string,
  chat_history: ChatMessage[]
): Promise<string> {
  try {
    const payload = {
      content: userMessage,
      chat_history
    };

    console.log("[INFO] Sending to FastAPI:", JSON.stringify(payload, null, 2));

    const response = await fetch(`${process.env.RAG_ENDPOINT}/api/chat/${sessionId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`[ERROR] FastAPI responded with status: ${response.status}`);
    }

    const data: ChatResponse = await response.json();
    console.log("[INFO] Received from FastAPI:", data);
    return data.response;
  } catch (error) {
    console.error("[ERROR] RAG API error:", error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/chat/:sessionId/messages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      console.log(`[INFO] Fetching messages for session: ${sessionId}`);
      const messages = await storage.getChatMessages(sessionId);
      console.log(`[INFO] Found ${messages.length} messages:`, messages);
      
      // Prevent caching issues
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(messages);
    } catch (error) {
      console.error("[ERROR] Error fetching messages:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/chat/:sessionId/message", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { content } = insertChatMessageSchema.omit({ sessionId: true }).parse(req.body);

      // 1. Save user message FIRST
      const userMessage = await storage.createChatMessage({
        content,
        isBot: false,
        sessionId,
      });

      // 2. Now fetch COMPLETE history including the new message
      const allMessages = await storage.getChatMessages(sessionId);
      const chat_history = allMessages.map(msg => 
        msg.isBot ? { ai: msg.content } : { human: msg.content }
      );

      // 3. Send to RAG backend with FULL history
      let botResponse: string;
      try {
        botResponse = await getRagChatbotResponse(content, sessionId, chat_history);
      } catch (error) {
        console.error("[ERROR] RAG API error:", error);
        botResponse = "عذراً، حدث خطأ مؤقت. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.";
      }

      // 4. Save bot message
      const botMessage = await storage.createChatMessage({
        content: botResponse,
        isBot: true,
        sessionId,
      });

      // 5. Return BOTH messages with proper format
      res.json({
        userMessage: {
          id: userMessage.id,
          content: userMessage.content,
          isBot: userMessage.isBot,
          sessionId: userMessage.sessionId,
          timestamp: userMessage.timestamp
        },
        botMessage: {
          id: botMessage.id,
          content: botMessage.content,
          isBot: botMessage.isBot,
          sessionId: botMessage.sessionId,
          timestamp: botMessage.timestamp
        }
      });

    } catch (error) {
      console.error("[ERROR] Error processing message:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return createServer(app);
}
