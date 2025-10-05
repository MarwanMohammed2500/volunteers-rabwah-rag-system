// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  chatMessages;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.chatMessages = /* @__PURE__ */ new Map();
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async createChatMessage(insertMessage) {
    const id = randomUUID();
    const message = {
      ...insertMessage,
      id,
      timestamp: /* @__PURE__ */ new Date(),
      isBot: insertMessage.isBot ?? false
    };
    this.chatMessages.set(id, message);
    return message;
  }
  async getChatMessages(sessionId) {
    return Array.from(this.chatMessages.values()).filter((message) => message.sessionId === sessionId).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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
  sessionId: varchar("session_id").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  content: true,
  isBot: true,
  sessionId: true
});

// server/routes.ts
async function getRagChatbotResponse(
  userMessage,
  namespace,
  sessionId,
  chat_history
) {
  const payload = { content: userMessage, chat_history };

  console.log("📤 Sending to FastAPI:", JSON.stringify(payload, null, 2));

  const response = await fetch(
    `http://backend:8080/api/chat/${namespace}/${sessionId}/message`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`FastAPI responded with status: ${response.status}`);
  }

  const data = await response.json();
  console.log("📥 Received from FastAPI:", data);

  return data.response;
}

async function registerRoutes(app2) {
  app2.get("/api/chat/:sessionId/message", async (req, res) => {
    try {
      const { sessionId } = req.params;
      console.log(`\u{1F4CB} Fetching messages for session: ${sessionId}`);
      const messages = await storage.getChatMessages(sessionId);
      console.log(`\u{1F4CB} Found ${messages.length} messages:`, messages);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/chat/:sessionId/message", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { content } = insertChatMessageSchema.omit({ sessionId: true }).parse(req.body);
      const userMessage = await storage.createChatMessage({
        content,
        isBot: false,
        sessionId
      });
      const allMessages = await storage.getChatMessages(sessionId);
      const chat_history = allMessages.map(
        (msg) => msg.isBot ? { ai: msg.content } : { human: msg.content }
      );
      let botResponse;
      try {
        botResponse = await getRagChatbotResponse(content, sessionId, chat_history);
      } catch (error) {
        console.error("RAG API error:", error);
        botResponse = "\u0639\u0630\u0631\u0627\u064B\u060C \u062D\u062F\u062B \u062E\u0637\u0623 \u0645\u0624\u0642\u062A. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u0623\u0648 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A.";
      }
      const botMessage = await storage.createChatMessage({
        content: botResponse,
        isBot: true,
        sessionId
      });
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
      console.error("Error processing message:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  return createServer(app2);
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
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
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
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
      const clientTemplate = path2.resolve(
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
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
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
