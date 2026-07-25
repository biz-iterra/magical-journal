/**
 * 時盤(じばん)= 2時間ごとの九星方位盤。
 *
 * 中宮星は「その日の十二支 × 遁」で子刻の星を決め、刻が進むごとに
 * 陽遁は +1(順行)、陰遁は -1(逆行)する(docs/02 §時盤)。
 *
 * ★暦マスタは増やさない。日盤が持つ「日の十二支」と「遁」からの決定的導出であり、
 *   実行時の天文計算はしない(CLAUDE.md ルール3)。
 * ★対象日 D の時盤は D の日盤を基準に 12 刻すべてを算出する。
 *   D の 23:00〜翌 1:00 も「D の子刻」として扱う(23 時以降を翌日扱いにしない)。
 *   流派差のある論点。docs/02 に採用した扱いを明記している。
 */

import type { Ban, StarNumber, TonpuMode } from "../types.js";
import { buildBan } from "./ban.js";

// ── 12 刻の定義 ─────────────────────────────────────────────

/** 1 刻の長さ(時間) */
const HOURS_PER_PERIOD = 2;

/** 刻の数 */
const PERIOD_COUNT = 12;

/**
 * 1 つの刻(2 時間)。
 * index は刻の十二支番号と一致する(0=子, 1=丑, … 11=亥)。
 */
export interface HourPeriod {
  /** 刻の番号 = 十二支番号(0=子刻, 1=丑刻, … 11=亥刻) */
  readonly index: number;
  /** 開始時(24 時制)。子刻は 23 */
  readonly startHour: number;
  /** 終了時(24 時制)。子刻は 1(日をまたぐ) */
  readonly endHour: number;
  /** 表示ラベル(例: "1:00〜3:00") */
  readonly label: string;
}

/** 子刻の開始時刻(23:00)。ここから 2 時間ずつ進む */
const FIRST_PERIOD_START_HOUR = 23;

function buildHourPeriod(index: number): HourPeriod {
  const startHour = (FIRST_PERIOD_START_HOUR + index * HOURS_PER_PERIOD) % 24;
  const endHour = (startHour + HOURS_PER_PERIOD) % 24;
  return {
    index,
    startHour,
    endHour,
    label: `${String(startHour)}:00〜${String(endHour)}:00`,
  };
}

/**
 * 12 刻の定義(index 順 = 子→亥)。
 * 表示順(何刻から並べるか)は利用側の責務。
 */
export const HOUR_PERIODS: readonly HourPeriod[] = Array.from(
  { length: PERIOD_COUNT },
  (_unused, i) => buildHourPeriod(i),
);

// ── 時刻 → 刻 ───────────────────────────────────────────────

/**
 * 時(24 時制)から刻の番号(0〜11)を求める。
 *
 * 子刻は 23:00〜翌 1:00 なので、23 時台と 0 時台が同じ刻(0)になる。
 *
 * @param hour 0〜23
 */
export function getHourPeriodIndex(hour: number): number {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error(`hour must be an integer between 0 and 23 (got ${String(hour)})`);
  }
  // 23 時を 0 に寄せてから 2 時間ごとに区切る
  return Math.floor(((hour + 1) % 24) / HOURS_PER_PERIOD);
}

/**
 * "HH:MM" 形式の時刻から刻を返す。
 * ★Date を生成しない(タイムゾーン事故防止。暦は JST 前提)。
 */
export function getHourPeriodByTime(time: string): HourPeriod {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match?.[1]) {
    throw new Error(`time must be "HH:MM" (got "${time}")`);
  }
  const period = HOUR_PERIODS[getHourPeriodIndex(Number(match[1]))];
  if (!period) {
    throw new Error(`Cannot resolve hour period for "${time}"`);
  }
  return period;
}

// ── 子刻の中宮星(確定仕様・変更禁止) ──────────────────────

/**
 * 日の十二支の 3 群ごとの「子刻の中宮星」。
 * 十二支番号(子=0 … 亥=11)を 3 で割った余りで群が決まる。
 *
 *   余り 0: 子・午・卯・酉  → 陽遁 一白(1) / 陰遁 九紫(9)
 *   余り 1: 辰・戌・丑・未  → 陽遁 四緑(4) / 陰遁 六白(6)
 *   余り 2: 寅・申・巳・亥  → 陽遁 七赤(7) / 陰遁 三碧(3)
 *
 * ★診断結果を左右する固定値(CLAUDE.md ルール2)。実行時に生成・推測しない。
 */
const NE_KOKU_CENTER_STAR: Readonly<Record<TonpuMode, readonly StarNumber[]>> = {
  youton: [1, 4, 7],
  inton: [9, 6, 3],
};

// ── 時盤の中宮星 ────────────────────────────────────────────

/**
 * 時盤の中宮星を求める。
 *
 * @param dayJunishi その日の十二支番号(0=子 … 11=亥)
 * @param tonpu      その日の遁(日盤の遁をそのまま使う)
 * @param hourIndex  刻の番号(0=子刻 … 11=亥刻)
 */
export function computeHourCenterStar(
  dayJunishi: number,
  tonpu: TonpuMode,
  hourIndex: number,
): StarNumber {
  if (!Number.isInteger(dayJunishi) || dayJunishi < 0 || dayJunishi > 11) {
    throw new Error(`dayJunishi must be an integer between 0 and 11 (got ${String(dayJunishi)})`);
  }
  if (!Number.isInteger(hourIndex) || hourIndex < 0 || hourIndex > 11) {
    throw new Error(`hourIndex must be an integer between 0 and 11 (got ${String(hourIndex)})`);
  }

  const base = NE_KOKU_CENTER_STAR[tonpu][dayJunishi % 3];
  if (base === undefined) {
    throw new Error(`Cannot resolve base star for junishi=${String(dayJunishi)}`);
  }

  // 陽遁は刻ごとに +1、陰遁は -1(9→1 / 1→9 に循環)
  const step = tonpu === "youton" ? hourIndex : -hourIndex;
  return (((((base - 1 + step) % 9) + 9) % 9) + 1) as StarNumber;
}

/**
 * 時盤(Ban)を組み立てる。配置は既存の buildBan を再利用する。
 */
export function computeHourBan(dayJunishi: number, tonpu: TonpuMode, hourIndex: number): Ban {
  return buildBan(computeHourCenterStar(dayJunishi, tonpu, hourIndex));
}

// ── 1 日分(12 刻)の時盤 ───────────────────────────────────

/** 1 刻ぶんの時盤 */
export interface HourBan {
  readonly period: HourPeriod;
  readonly center: StarNumber;
  readonly ban: Ban;
}

/**
 * 対象日の 12 刻すべての時盤を index 順(子→亥)で返す。
 *
 * @param dayJunishi その日の十二支番号(0=子 … 11=亥)
 * @param tonpu      その日の遁
 */
export function computeDayHourBans(dayJunishi: number, tonpu: TonpuMode): readonly HourBan[] {
  return HOUR_PERIODS.map((period) => {
    const center = computeHourCenterStar(dayJunishi, tonpu, period.index);
    return { period, center, ban: buildBan(center) };
  });
}
