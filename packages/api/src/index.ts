/**
 * API サーバー起動エントリポイント。
 * @hono/node-server で Hono アプリを Node.js HTTP サーバーとして起動する。
 */

import { serve } from "@hono/node-server";
import app from "./app.js";
import { initConnection } from "./db/connection.js";
import { initDb } from "./db/schema.js";
import { getEnv } from "./env.js";

// 起動処理
const env = getEnv();

// DB 初期化
const db = initConnection(env.databasePath);
initDb(db);
console.log(`[DB] Initialized at ${env.databasePath}`);

// サーバー起動
serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`[API] Server running on http://localhost:${String(info.port)}`);
});
