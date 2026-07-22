/**
 * 節入り日生成スクリプト
 *
 * 太陽の黄経を近似計算(Jean Meeus 簡易版)し、
 * 各節気の日付を二分探索で求める。
 *
 * 使用法:
 *   pnpm --filter @mj/calendar-data exec tsx src/generator/generate-sekki.ts [startYear] [endYear]
 *
 * デフォルト: 2024〜2027 の 4 年分。
 * 全範囲生成時: startYear=1920, endYear=2050
 */

// ── ユリウス日計算(engine の potential.ts と同方式) ──────────

function toJulianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdToGregorian(jd: number): {
  year: number;
  month: number;
  day: number;
} {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

// ── 太陽黄経の近似計算(Jean Meeus "Astronomical Algorithms" 簡易版) ──

function solarLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0; // J2000.0 からの経過世紀
  // 太陽の平均黄経
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  // 太陽の平均近点角
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mrad = (M * Math.PI) / 180;
  // 太陽の中心差
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);
  // 太陽の黄経
  const sunLon = L0 + C;
  // 0〜360 に正規化
  return ((sunLon % 360) + 360) % 360;
}

// ── 各節気に対応する太陽黄経(度) ──────────────────────────

/** 気学上の月番号 → 太陽黄経 */
const SEKKI_LONGITUDES: Record<number, number> = {
  2: 315, // 立春
  3: 345, // 啓蟄
  4: 15, // 清明
  5: 45, // 立夏
  6: 75, // 芒種
  7: 105, // 小暑
  8: 135, // 立秋
  9: 165, // 白露
  10: 195, // 寒露
  11: 225, // 立冬
  12: 255, // 大雪
  1: 285, // 小寒
};

/** 節気の名前(表示用) */
const SEKKI_NAMES: Record<number, string> = {
  1: "小寒",
  2: "立春",
  3: "啓蟄",
  4: "清明",
  5: "立夏",
  6: "芒種",
  7: "小暑",
  8: "立秋",
  9: "白露",
  10: "寒露",
  11: "立冬",
  12: "大雪",
};

// ── 角度差(最短弧) ────────────────────────────────────────

function angleDiff(from: number, to: number): number {
  let diff = to - from;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

// ── 節入り日の探索 ────────────────────────────────────────

/**
 * 指定された年・節気月の節入り日を求める。
 *
 * @param year 西暦年
 * @param sekkiMonth 気学上の月(1〜12)
 * @returns "YYYY-MM-DD" 形式の日付文字列
 */
function findSekkiDate(year: number, sekkiMonth: number): string {
  const targetLon = SEKKI_LONGITUDES[sekkiMonth]!;

  // おおよその月(暦月と気学月はほぼ一致)を起点に ±20 日で探索
  const approxCalMonth = sekkiMonth;
  const centerJd = toJulianDay(year, approxCalMonth, 6);

  // まず target より手前(solarLon < target)の JD を見つける
  let loJd = centerJd - 20;
  let hiJd = centerJd + 20;

  // 安全のため loJd が target 手前であることを確認
  const lonAtLo = solarLongitude(loJd);
  const diffAtLo = angleDiff(lonAtLo, targetLon);
  if (diffAtLo < 0) {
    // loJd が既に target を越えている → もっと前に戻す
    loJd -= 30;
  }

  // hiJd が target を越えていることを確認
  const lonAtHi = solarLongitude(hiJd);
  const diffAtHi = angleDiff(lonAtHi, targetLon);
  if (diffAtHi > 0) {
    // hiJd がまだ target に達していない → もっと先に進める
    hiJd += 30;
  }

  // 二分探索: solarLongitude が target を通過する瞬間を見つける
  // angleDiff(solarLon, target) > 0 → まだ到達していない
  // angleDiff(solarLon, target) <= 0 → 到達した or 通過した
  for (let i = 0; i < 50; i++) {
    const midJd = (loJd + hiJd) / 2;
    const lonAtMid = solarLongitude(midJd);
    const diffAtMid = angleDiff(lonAtMid, targetLon);

    if (diffAtMid > 0) {
      loJd = midJd; // まだ到達していない
    } else {
      hiJd = midJd; // 到達した
    }
  }

  // loJd と hiJd はほぼ同じ値(瞬間)に収束
  // JST に変換(UT + 9h = JD + 9/24)
  const crossingJdJst = (loJd + hiJd) / 2 + 9.0 / 24.0;

  // JST の日付を取得(Julian Day の整数部 = 正午なので、0.5 を境に日が変わる)
  const dateJd = Math.floor(crossingJdJst + 0.5);
  const { year: y, month: m, day: d } = jdToGregorian(dateJd);

  const yy = String(y).padStart(4, "0");
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// ── メイン ────────────────────────────────────────────────

function generateSekkiData(
  startYear: number,
  endYear: number,
): Map<number, Array<{ month: number; date: string }>> {
  const result = new Map<number, Array<{ month: number; date: string }>>();

  // 各年の節入り月順序: 1(小寒), 2(立春), 3(啓蟄), ..., 12(大雪)
  const monthOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  for (let year = startYear; year <= endYear; year++) {
    const boundaries: Array<{ month: number; date: string }> = [];
    for (const m of monthOrder) {
      const date = findSekkiDate(year, m);
      boundaries.push({ month: m, date });
    }
    result.set(year, boundaries);
  }

  return result;
}

// ── TypeScript ソースコード生成 ────────────────────────────

function generateTypeScript(
  data: Map<number, Array<{ month: number; date: string }>>,
): string {
  const lines: string[] = [];
  lines.push("// このファイルは generate-sekki.ts によって生成されています。");
  lines.push("// 手動で編集しないでください。");
  lines.push("");
  lines.push('import type { SekkiriBoundary } from "@mj/engine";');
  lines.push("");
  lines.push(
    "export const SEKKI_DATA: ReadonlyMap<number, readonly SekkiriBoundary[]> = new Map([",
  );

  const sortedYears = [...data.keys()].sort((a, b) => a - b);
  for (const year of sortedYears) {
    const boundaries = data.get(year)!;
    lines.push(`  [${String(year)}, [`);
    for (const b of boundaries) {
      lines.push(
        `    { month: ${String(b.month)}, date: "${b.date}" },`,
      );
    }
    lines.push("  ]],");
  }

  lines.push("]);");
  lines.push("");
  return lines.join("\n");
}

// ── CLI エントリポイント ──────────────────────────────────

const args = process.argv.slice(2);
const startYear = args[0] ? Number(args[0]) : 2024;
const endYear = args[1] ? Number(args[1]) : 2027;

console.log(
  `Generating sekki data for ${String(startYear)}-${String(endYear)}...`,
);
console.log("");

const data = generateSekkiData(startYear, endYear);

// コンソール出力(確認用)
for (const [year, boundaries] of data) {
  console.log(`=== ${String(year)} ===`);
  for (const b of boundaries) {
    const name = SEKKI_NAMES[b.month] ?? `月${String(b.month)}`;
    console.log(`  ${name}(月${String(b.month)}): ${b.date}`);
  }
}

// --write フラグがあればファイルに書き出す
if (args.includes("--write")) {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const outPath = path.resolve(
    import.meta.dirname ?? ".",
    "..",
    "sekki-data.ts",
  );
  const content = generateTypeScript(data);
  fs.writeFileSync(outPath, content, "utf-8");
  console.log("");
  console.log(`Written to ${outPath}`);
} else {
  console.log("");
  console.log("TypeScript output (--write to save to file):");
  console.log("");
  console.log(generateTypeScript(data));
}
