/**
 * SQLite 接続管理(better-sqlite3)。
 * シングルトンパターンで DB インスタンスを保持する。
 */

import Database from "better-sqlite3";

let instance: Database.Database | undefined;

/**
 * DB インスタンスを取得する。
 * initConnection() が先に呼ばれていない場合はエラー。
 */
export function getDb(): Database.Database {
  if (!instance) {
    throw new Error("Database not initialized. Call initConnection() first.");
  }
  return instance;
}

/**
 * DB 接続を初期化する。
 * 既に初期化済みの場合は既存インスタンスを返す。
 */
export function initConnection(path: string): Database.Database {
  if (instance) return instance;
  instance = new Database(path);
  return instance;
}

/**
 * DB 接続を閉じる。
 */
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
  return instance;
}
