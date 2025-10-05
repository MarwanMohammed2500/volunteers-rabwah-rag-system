import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatMessageSchema } from "@shared/schema";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
  namespace: string,
  sessionId: string,
  chat_history: ChatMessage[]
): Promise<string> {
  const payload = {
    content: userMessage,
    chat_history
  };

  console.log("[INFO] Sending to FastAPI:", JSON.stringify(payload, null, 2));

  const response = await fetch(
    `${process.env.RAG_ENDPOINT}/api/chat/${namespace}/${sessionId}/message`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`[ERROR] FastAPI responded with status: ${response.status}`);
  }

  const data: ChatResponse = await response.json();
  console.log("[INFO] Received from FastAPI:", data);
  return data.response;
}


export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/chat/:namespace/:sessionId/message", async (req, res) => {
    const { namespace, sessionId } = req.params;
    const { content } = insertChatMessageSchema.omit({ sessionId: true }).parse(req.body);

    const userMessage = await storage.createChatMessage({
      content,
      isBot: false,
      sessionId,
      namespace,
    });

    const allMessages = await storage.getChatMessages(sessionId);
    const chat_history = allMessages.map(msg =>
      msg.isBot ? { ai: msg.content } : { human: msg.content }
    );

    let botResponse: string;
    try {
      botResponse = await getRagChatbotResponse(content, namespace, sessionId, chat_history);
    } catch (error) {
      console.error("[ERROR] RAG API error:", error);
      botResponse = "عذراً، حدث خطأ مؤقت. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.";
    }

    const botMessage = await storage.createChatMessage({
      content: botResponse,
      isBot: true,
      sessionId,
      namespace,
    });

  res.json({ userMessage, botMessage });
});


  app.get("/api/chat/namespaces", async (_req, res) => {
  try {
    const response = await fetch(`${process.env.RAG_ENDPOINT}/api/chat/namespaces`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`[ERROR] FastAPI responded with status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("[ERROR] Error fetching namespaces:", error);
    res.status(500).json({ message: "Failed to fetch namespaces" });
  }
});
  return createServer(app);
}