import type {
  DiagnosisModule,
  PotentialResult,
  PotentialTypeId,
  ProfileInputs,
} from "./types.js";
import { POTENTIAL_TABLE } from "./potential-table.js";

// ── 日付計算(Date オブジェクト不使用) ──────────────────────

/**
 * グレゴリオ暦の年月日からユリウス日番号を計算する。
 * Date オブジェクトに依存せず、整数演算のみで暦日差を正確に求められる。
 */
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

/** "YYYY-MM-DD" 文字列を [year, month, day] に分解する */
function parseDate(dateStr: string): [number, number, number] {
  const parts = dateStr.split("-");
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

/**
 * 2つの日付間の暦日差(daysBetween = target - base)を返す。
 * 負の値も正しく返す(基準日より前の日付に対応)。
 */
function daysBetween(
  baseYear: number,
  baseMonth: number,
  baseDay: number,
  targetYear: number,
  targetMonth: number,
  targetDay: number,
): number {
  return (
    toJulianDay(targetYear, targetMonth, targetDay) -
    toJulianDay(baseYear, baseMonth, baseDay)
  );
}

// ── 基準日(固定値・変更禁止) ────────────────────────────────

const BASE_YEAR = 1920;
const BASE_MONTH = 1;
const BASE_DAY = 1;

/** 周期(固定値・変更禁止) */
const CYCLE = 60;

// ── ポテンシャル算出 ─────────────────────────────────────────

/**
 * 生年月日から算出値(0〜59)を計算する。
 *
 * 算出値 = (経過日数 + 1) % 60
 * - 経過日数 = 基準日(1920-01-01)から birthDate までの暦日数
 * - 基準日より前の日付でも 0〜59 の範囲に正規化される
 *
 * @param birthDate "YYYY-MM-DD" 形式
 */
export function computePotentialValue(birthDate: string): number {
  const [year, month, day] = parseDate(birthDate);
  const elapsed = daysBetween(BASE_YEAR, BASE_MONTH, BASE_DAY, year, month, day);
  // JavaScript の % は負の被除数に対して負を返すため、正規化する
  return ((elapsed + 1) % CYCLE + CYCLE) % CYCLE;
}

/**
 * 翌日の日付文字列を返す。Date オブジェクトを使わない。
 */
function nextDate(dateStr: string): string {
  const [year, month, day] = parseDate(dateStr);

  // 月ごとの日数
  const daysInMonth = [
    0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  // うるう年判定
  if (
    (year % 4 === 0 && year % 100 !== 0) ||
    year % 400 === 0
  ) {
    daysInMonth[2] = 29;
  }

  let ny = year;
  let nm = month;
  let nd = day + 1;

  if (nd > daysInMonth[nm]!) {
    nd = 1;
    nm += 1;
    if (nm > 12) {
      nm = 1;
      ny += 1;
    }
  }

  const yy = String(ny).padStart(4, "0");
  const mm = String(nm).padStart(2, "0");
  const dd = String(nd).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * ポテンシャルタイプを算出する。
 *
 * @param birthDate "YYYY-MM-DD" 形式の生年月日
 * @param birthTime "HH:MM" 形式の出生時刻(省略可)。
 *   23:00〜23:59 の場合、当日と翌日の両方のタイプを返す(ハイブリッド)。
 *   ただし当日と翌日が同一タイプの場合は単一タイプとして返す。
 */
export function computePotential(
  birthDate: string,
  birthTime?: string,
): PotentialResult {
  const rawValue = computePotentialValue(birthDate);
  const primaryType: PotentialTypeId = POTENTIAL_TABLE[rawValue]!;

  // ハイブリッド判定: 23:00〜23:59
  if (birthTime !== undefined) {
    const timeParts = birthTime.split(":");
    const hour = Number(timeParts[0]);
    const minute = Number(timeParts[1]);

    if (hour === 23 && minute >= 0 && minute <= 59) {
      const nextDateStr = nextDate(birthDate);
      const nextRawValue = computePotentialValue(nextDateStr);
      const secondaryType: PotentialTypeId = POTENTIAL_TABLE[nextRawValue]!;

      if (primaryType !== secondaryType) {
        return { primaryType, secondaryType, rawValue };
      }
    }
  }

  return { primaryType, rawValue };
}

// ── DiagnosisModule 定義 ────────────────────────────────────

export const potentialModule: DiagnosisModule = {
  id: "potential",
  version: 1,
  requiredInputs: ["birth_date"],
  optionalInputs: ["birth_time"],
  clientSafe: true,
  compute(inputs: ProfileInputs): PotentialResult {
    return computePotential(inputs.birthDate, inputs.birthTime);
  },
};
