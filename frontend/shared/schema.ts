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
  namespace: varchar("namespace").notNull(),  // Required in table and stored objects
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Base insert schema without namespace (optional in input)
const baseInsertChatMessageSchema = createInsertSchema(chatMessages).pick({
  content: true,
  isBot: true,
  sessionId: true,
}).extend({
  namespace: z.string().optional(),  // Make optional for incoming validation
});

export const insertChatMessageSchema = baseInsertChatMessageSchema;

export type InsertUser = z.infer<typeof insertUserSchema>;
// Insert type allows optional namespace
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Output type requires namespace (for stored/fetch data)
export type ChatMessage = Omit<typeof chatMessages.$inferSelect, "timestamp"> & {
  timestamp: string;
};
export type User = typeof users.$inferSelect;