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

-- 「今日のジャーナル」設定(1 ユーザー 1 行。行が無い = すべて未設定)
-- 診断には一切影響しない生成の嗜好なので profiles(診断入力)とは分離する。
-- 全項目 NULL 許容: 未設定でもスケジュール生成が壊れないこと(既定挙動へフォールバック)。
--   wake_time / sleep_time  : "HH:MM"。スケジュールのタイムラインをこの範囲に収める
--   transport_mode          : 'walk'|'bike'|'train'|'car'。Places の距離パラメータに反映
--   holiday_weekdays        : 休日にする曜日の JSON 配列 "[0,6]"(0=日 … 6=土)。NULL=既定の土日
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  wake_time TEXT,
  sleep_time TEXT,
  transport_mode TEXT,
  holiday_weekdays TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- よく行く場所(お気に入り地点。1 ユーザー複数行・サーバー側上限 10 件)
-- 座標はフロントが Geocoding で取得して送る(サーバーでは Geocoding しない)。
-- 本人の行き先のみを登録する(第三者情報は扱わない)。
CREATE TABLE IF NOT EXISTS favorite_places (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  category TEXT,
  address_text TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_favorite_places_user_id ON favorite_places(user_id);

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

  // user_preferences の追加列(将来の設定項目もここに冪等追記する)。
  // ★user_preferences 自体は CREATE TABLE IF NOT EXISTS で作られるため、
  //   既存 DB でも上の CREATE_TABLES 実行時に新規作成される(ALTER は不要)。
  //   既に user_preferences を持つ DB に列を足すときのみ、以下の形で追記する。
  for (const column of ["wake_time", "sleep_time", "transport_mode", "holiday_weekdays"] as const) {
    if (!hasColumn(db, "user_preferences", column)) {
      db.exec(`ALTER TABLE user_preferences ADD COLUMN ${column} TEXT`);
    }
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
