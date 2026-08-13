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
 * 接続ごとの設定を当てる。
 *
 * ★foreign_keys は接続単位の設定。api だけ未設定だと、スキーマに書いた外部キー制約が
 *   「書き込みの大半を担う側では効かない」状態になる(batch では効く)。
 *   同じ DB ファイルを共有するので、pragma は必ず両者で揃える。
 */
function applyPragmas(db: Database.Database): Database.Database {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

/**
 * DB 接続を初期化する。
 * 既に初期化済みの場合は既存インスタンスを返す。
 */
export function initConnection(path: string): Database.Database {
  if (instance) return instance;
  instance = applyPragmas(new Database(path));
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
  // 本番と同じ制約で動かす(WAL はインメモリでは無視される)
  instance = applyPragmas(new Database(":memory:"));
  return instance;
}
