/**
 * SQLite スキーマ定義とマイグレーション。
 * 設計書(docs/01 §5)に基づくテーブル構造。
 */

import type Database from "better-sqlite3";

const CREATE_TABLES = `
-- ユーザー
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  is_allowed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- プロフィール
CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  birth_date TEXT NOT NULL,
  birth_time TEXT,
  name_kana TEXT NOT NULL,
  name_romaji TEXT NOT NULL,
  address_text TEXT,
  lat REAL,
  lng REAL,
  char_style TEXT NOT NULL DEFAULT 'male',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 診断結果(モジュール汎用スキーマ)
CREATE TABLE IF NOT EXISTS diag_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  module_id TEXT NOT NULL,
  module_version INTEGER NOT NULL,
  result_json TEXT NOT NULL,
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, module_id)
);

-- モジュール設定
CREATE TABLE IF NOT EXISTS module_config (
  module_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'enabled',
  display_order INTEGER NOT NULL DEFAULT 0
);

-- キャラクター
CREATE TABLE IF NOT EXISTS characters (
  potential_type TEXT PRIMARY KEY,
  motif TEXT,
  theme_color TEXT,
  accent_color TEXT,
  asset_dir TEXT,
  catch_copy TEXT
);

-- キャラクターバリアント
CREATE TABLE IF NOT EXISTS character_variants (
  potential_type TEXT NOT NULL,
  gender TEXT NOT NULL,
  name TEXT NOT NULL,
  first_person TEXT,
  tone TEXT,
  image_ref TEXT,
  PRIMARY KEY (potential_type, gender),
  FOREIGN KEY (potential_type) REFERENCES characters(potential_type)
);

-- 日次運勢(バッチ生成)
-- sections_json: 3セクション {fortune, schedule, characterNote} を JSON で保存する。
-- fortune_text は後方互換のため残し、運勢(fortune)を格納する。
CREATE TABLE IF NOT EXISTS daily_fortunes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  directions_json TEXT,
  fortune_text TEXT,
  sections_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

-- 性質レポート(「AI占い」用。夜間バッチで事前生成)
-- タイプ×星座で固定なので 1 ユーザー 1 行。report_json に6項目 + 生成根拠(タイプ/星座)を格納。
-- タイプが変わらない限り再生成しない(report_json 内の potentialType/zodiac で判定)。
CREATE TABLE IF NOT EXISTS personality_reports (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id)
);

-- 性質レポート手動再生成のレート制限カウント(「AI占い」ボタンのテスト用)
-- 1ユーザー1日(JST)最大5回。date は JST の "YYYY-MM-DD"。日付が変わればリセット(新しい行)。
CREATE TABLE IF NOT EXISTS personality_regen_counts (
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- 月次運勢(月次バッチ生成)
-- キーは「気学の年・月」(節入り基準)。カレンダー月とは境界がずれるため、
-- 節入りをまたいでも 1 気学月 = 1 エントリになるよう kigaku_year/kigaku_month を UNIQUE にする。
CREATE TABLE IF NOT EXISTS monthly_fortunes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  kigaku_year INTEGER NOT NULL,
  kigaku_month INTEGER NOT NULL,
  directions_json TEXT,
  fortune_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, kigaku_year, kigaku_month)
);
`;

/**
 * 指定テーブルに指定カラムが存在するかを返す(ALTER 前の存在チェック用)。
 */
function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

/**
 * 既存 DB へのマイグレーション(冪等)。
 *
 * CREATE TABLE IF NOT EXISTS は新規テーブルにしか効かないため、
 * 既存行を持つ本番 DB へのカラム追加は ALTER TABLE で行う(存在チェック込み)。
 */
function migrate(db: Database.Database): void {
  // daily_fortunes.sections_json(3セクション {fortune, schedule, characterNote})
  if (!hasColumn(db, "daily_fortunes", "sections_json")) {
    db.exec("ALTER TABLE daily_fortunes ADD COLUMN sections_json TEXT");
  }
}

/**
 * DB を初期化する。WAL モードを設定し、全テーブルを作成する。
 */
export function initDb(db: Database.Database): void {
  // WAL モード設定(並行読み取り性能向上)
  db.pragma("journal_mode = WAL");
  // 外部キー制約を有効化
  db.pragma("foreign_keys = ON");

  db.exec(CREATE_TABLES);
  // 既存 DB へのカラム追加(新規 DB では CREATE TABLE 済みなので no-op)
  migrate(db);
}
