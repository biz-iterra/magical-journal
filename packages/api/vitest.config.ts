import { defineConfig } from "vitest/config";

// テスト探索は src 配下のみに限定する。
// tsc -b が __tests__ を dist にも出力するため、ビルド後は Vitest 既定の
// dist 除外グロブだけでは dist 側のテストも拾われ二重実行になりうる
// (src/line/__tests__ の入れ子構成で顕在化)。src 固定で決定的にする。
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
  },
});
