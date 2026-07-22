# ==============================================================
# マジカルジャーナル — NAS 環境変数
# ==============================================================
# このファイルを NAS の作業ディレクトリにコピーし、
# .env にリネームして各値を記入する。
#
#   cp .env.nas .env
#
# docker compose は同ディレクトリの .env を自動で読み込む。
# このファイルは Git にコミットしない（.gitignore 済み）。
# ==============================================================

# ---- LINE — Messaging API チャネル（Bot 用）----
# 取得元: LINE Developers Console > Messaging API チャネル
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=

# ---- LINE — LINE Login チャネル（LIFF 用）----
# 取得元: LINE Developers Console > LINE Login チャネル
LINE_LOGIN_CHANNEL_ID=
LIFF_ID=

# ---- Cloudflare Tunnel ----
# 取得元: dash.cloudflare.com > Networking > Tunnels > mj-nas
# eyJ で始まる長い文字列
CLOUDFLARE_TUNNEL_TOKEN=

# ---- Google Maps ----
# 取得元: Google Cloud Console > 認証情報
# リファラー制限: mj.iterra.jp/* と localhost:5173/*
GOOGLE_MAPS_API_KEY=

# ---- LLM（Phase 2 以降で使用）----
# claude または openai
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# ---- App ----
# カンマ区切りの LINE ユーザー ID（U で始まる 33 文字）
# Webhook ログまたは liff.getProfile() で取得
ALLOWED_LINE_USER_IDS=

# SQLite データベースの保存先（コンテナ内パス）
DATABASE_PATH=./data/mj.sqlite
