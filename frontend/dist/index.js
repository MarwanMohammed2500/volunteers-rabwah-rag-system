// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/redisStorage.ts
import { Redis } from "ioredis";
import { randomUUID } from "crypto";
var RedisStorage = class {
  client;
  constructor(url) {
    this.client = new Redis(url);
  }
  async getUser(id) {
    const user = await this.client.get(`user:${id}`);
    return user ? JSON.parse(user) : void 0;
  }
  async getUserByUsername(username) {
    return void 0;
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    await this.client.set(`user:${id}`, JSON.stringify(user));
    return user;
  }
  async createChatMessage(insertMessage) {
    const id = randomUUID();
    const namespace = insertMessage.namespace || "default";
    const message = {
      ...insertMessage,
      id,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isBot: insertMessage.isBot ?? false,
      namespace
    };
    await this.client.lpush(
      `chat_history:${namespace}:${insertMessage.sessionId}`,
      JSON.stringify(message)
    );
    return message;
  }
  async getChatMessages(sessionId, namespace = "default") {
    const messages = await this.client.lrange(
      `chat_history:${namespace}:${sessionId}`,
      0,
      -1
    );
    return messages.map((msg) => JSON.parse(msg)).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  async close() {
    await this.client.quit();
  }
};

// server/storage.ts
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
var storage = new RedisStorage(process.env.REDIS_URL || "redis://redis_server:6379");

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  isBot: boolean("is_bot").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  sessionId: varchar("session_id").notNull(),
  namespace: varchar("namespace").notNull()
  // Required in table and stored objects
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var baseInsertChatMessageSchema = createInsertSchema(chatMessages).pick({
  content: true,
  isBot: true,
  sessionId: true
}).extend({
  namespace: z.string().optional()
  // Make optional for incoming validation
});
var insertChatMessageSchema = baseInsertChatMessageSchema;

// server/routes.ts
import { fileURLToPath as fileURLToPath2 } from "url";
import path2 from "path";
import dotenv2 from "dotenv";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
dotenv2.config({ path: path2.resolve(__dirname2, "../.env") });
async function getRagChatbotResponse(userMessage, namespace, sessionId, chat_history) {
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
      body: JSON.stringify(payload)
    }
  );
  if (!response.ok) {
    throw new Error(`[ERROR] FastAPI responded with status: ${response.status}`);
  }
  const data = await response.json();
  console.log("[INFO] Received from FastAPI:", data);
  return data.response;
}
async function registerRoutes(app2) {
  app2.post("/api/chat/:namespace/:sessionId/message", async (req, res) => {
    const { namespace, sessionId } = req.params;
    const parsedBody = insertChatMessageSchema.parse({
      ...req.body,
      sessionId
    });
    const { content, isBot = false } = parsedBody;
    const userMessage = await storage.createChatMessage({
      content,
      isBot,
      sessionId,
      namespace
    });
    const allMessages = await storage.getChatMessages(sessionId, namespace);
    console.log("[DEBUG] All Messages:", allMessages);
    const chat_history = allMessages.map(
      (msg) => msg.isBot ? { ai: msg.content } : { human: msg.content }
    );
    let botResponse;
    try {
      botResponse = await getRagChatbotResponse(content, namespace, sessionId, chat_history);
    } catch (error) {
      console.error("[ERROR] RAG API error:", error);
      botResponse = "\u0639\u0630\u0631\u0627\u064B\u060C \u062D\u062F\u062B \u062E\u0637\u0623 \u0645\u0624\u0642\u062A. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u0623\u0648 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A.";
    }
    const botMessage = await storage.createChatMessage({
      content: botResponse,
      isBot: true,
      sessionId,
      namespace
    });
    const updatedMessages = await storage.getChatMessages(sessionId, namespace);
    res.json({
      response: botResponse,
      session_id: sessionId,
      namespace,
      messages: updatedMessages
    });
  });
  app2.get("/api/chat/:namespace/:sessionId/message", async (req, res) => {
    const { namespace, sessionId } = req.params;
    try {
      const response = await fetch(
        `${process.env.RAG_ENDPOINT}/api/chat/${namespace}/${sessionId}/message`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        }
      );
      if (!response.ok) {
        throw new Error(`[ERROR] FastAPI responded with status: ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("[ERROR] Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.get("/api/chat/namespaces", async (_req, res) => {
    try {
      const response = await fetch(`${process.env.RAG_ENDPOINT}/api/chat/namespaces`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
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
  return createServer(app2);
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    },
    proxy: {
      "/api": {
        target: "http://backend:8080",
        // FastAPI backend
        changeOrigin: true,
        secure: false
      }
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
