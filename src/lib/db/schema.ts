import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  callerName: text("caller_name").notNull(),
  callerEmail: text("caller_email").notNull(),
  callerCompany: text("caller_company").notNull(),
  language: text("language").notNull(),
  tone: text("tone").notNull(),
  agentName: text("agent_name").notNull(),
  configSnapshot: text("config_snapshot").notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  totalLatencySeconds: text("total_latency_seconds"),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const intakes = sqliteTable("intakes", {
  conversationId: text("conversation_id")
    .primaryKey()
    .references(() => conversations.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  exportedAt: integer("exported_at", { mode: "timestamp_ms" }),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  agentName: text("agent_name").notNull(),
  language: text("language").notNull(),
  tone: text("tone").notNull(),
  script: text("script"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
