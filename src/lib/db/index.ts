import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

let client: Client | undefined;
let db: LibSQLDatabase<typeof schema> | undefined;
let ready: Promise<void> | undefined;

function databaseUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  if (process.env.VERCEL) {
    return "file:/tmp/htgf-voice-agent.db";
  }
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return `file:${path.join(dir, "app.db")}`;
}

async function ensureSchema(connection: Client) {
  await connection.executeMultiple(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      caller_name TEXT NOT NULL,
      caller_email TEXT NOT NULL,
      caller_company TEXT NOT NULL,
      language TEXT NOT NULL,
      tone TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      config_snapshot TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      total_latency_seconds TEXT
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS intakes (
      conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      exported_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      agent_name TEXT NOT NULL,
      language TEXT NOT NULL,
      tone TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS conversations_started_idx ON conversations(started_at);
  `);
  await ensureColumn(connection, "intakes", "exported_at", "INTEGER");
  await ensureColumn(connection, "settings", "script", "TEXT");
}

async function ensureColumn(
  connection: Client,
  table: string,
  column: string,
  definition: string,
) {
  const info = await connection.execute(`PRAGMA table_info(${table})`);
  const exists = info.rows.some((row) => {
    const record = row as Record<string, unknown>;
    return record.name === column || record[1] === column;
  });
  if (!exists) {
    await connection.execute(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
    );
  }
}

export async function getDb() {
  if (!client) {
    client = createClient({
      url: databaseUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    db = drizzle(client, { schema });
  }
  if (!ready) {
    ready = ensureSchema(client);
  }
  await ready;
  if (!db) {
    throw new Error("Database failed to initialise");
  }
  return db;
}
