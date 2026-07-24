#!/usr/bin/env bash
#
# MockLlmProvider + Places フォールバックの end-to-end スモークテスト。
#
# 共有ボリュームで api+batch を同一 DB に接続 →
#   1. ユーザー登録(dev トークン)
#   2. run-daily(mock, Places キー無し=フォールバック)→ daily_fortunes.sections_json に3セクション
#   3. run-personality(mock)→ personality_reports に6項目
#   4. GET /api/today に sections、GET /api/personality に report が反映されることを確認
#   5. コンテナ・ボリュームを片付ける
#
# 前提: Docker Desktop 起動済み。Git Bash では docker へパスを渡すとき MSYS_NO_PATHCONV=1。
# 使い方: bash infra/e2e/run-e2e.sh

set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.e2e.yml -p mj-e2e"
BASE="http://localhost:3001"
DEV="U-e2e-user"
AUTH="Authorization: Bearer dev:${DEV}"

cleanup() {
  echo "--- cleanup ---"
  MSYS_NO_PATHCONV=1 $COMPOSE down -v --remove-orphans || true
}
trap cleanup EXIT

echo "--- build ---"
MSYS_NO_PATHCONV=1 $COMPOSE build api batch

echo "--- start api(schema 初期化 + マイグレーション)---"
MSYS_NO_PATHCONV=1 $COMPOSE up -d api

echo "--- wait for health ---"
for i in $(seq 1 30); do
  if curl -fsS "${BASE}/api/health" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS "${BASE}/api/health"

echo
echo "--- register(dev token, lat/lng 付き)---"
curl -fsS -X POST "${BASE}/api/register" \
  -H "${AUTH}" -H "Content-Type: application/json" \
  -d '{"birthDate":"1990-05-17","nameKana":"テスト","nameRomaji":"TEST","charStyle":"male","lat":35.68,"lng":139.76}'
echo

echo "--- run-daily(mock, Places フォールバック)---"
MSYS_NO_PATHCONV=1 $COMPOSE run --rm batch node dist/index.js run-daily

echo "--- run-personality(mock)---"
MSYS_NO_PATHCONV=1 $COMPOSE run --rm batch node dist/index.js run-personality

echo "--- GET /api/today ---"
TODAY=$(curl -fsS "${BASE}/api/today" -H "${AUTH}")
echo "$TODAY"
echo "$TODAY" | grep -q '"sections"' || { echo "FAIL: sections がない"; exit 1; }
echo "$TODAY" | grep -q '"characterNote"' || { echo "FAIL: characterNote がない"; exit 1; }

echo "--- GET /api/personality ---"
PERS=$(curl -fsS "${BASE}/api/personality" -H "${AUTH}")
echo "$PERS"
echo "$PERS" | grep -q '"items"' || { echo "FAIL: personality items がない"; exit 1; }
if echo "$PERS" | grep -q 'axes'; then echo "FAIL: axes が混入"; exit 1; fi

echo
echo "PASS: 3セクション + 性質レポートが e2e で確認できました"
