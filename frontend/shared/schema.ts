import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  isBot: boolean("is_bot").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  sessionId: varchar("session_id").notNull(),
  namespace: varchar("namespace").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  content: true,
  isBot: true,
  sessionId: true,
  namespace: true,
});


export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type ChatMessage = Omit<typeof chatMessages.$inferSelect, "timestamp"> & {
  timestamp: string;
};
