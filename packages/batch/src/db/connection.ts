/**
 * SQLite 接続管理(better-sqlite3)。
 * api と同一の SQLite ファイルを共有する(WAL モード)。
 * スキーマ定義・マイグレーションは api が所有するため、ここでは行わない。
 */

import Database from "better-sqlite3";

let instance: Database.Database | undefined;

/** DB インスタンスを取得する(initConnection 未実行ならエラー) */
export function getDb(): Database.Database {
  if (!instance) {
    throw new Error("Database not initialized. Call initConnection() first.");
  }
  return instance;
}

/**
 * DB 接続を初期化する。既に初期化済みなら既存インスタンスを返す。
 * WAL モードで開き、api と安全に同一ファイルを共有する。
 */
export function initConnection(path: string): Database.Database {
  if (instance) return instance;
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  instance = db;
  return instance;
}

/** DB 接続を閉じる */
export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = undefined;
  }
}

/** テスト用: インメモリ DB で初期化する */
export function initMemoryDb(): Database.Database {
  if (instance) {
    instance.close();
  }
  instance = new Database(":memory:");
  instance.pragma("foreign_keys = ON");
  return instance;
}
