import type { EngineConfig } from "../config.js";
import { DEFAULT_CONFIG } from "../config.js";
import type { DiagnosisModule, NumerologyNumber, ProfileInputs } from "../types.js";

/** マスターナンバーの集合 */
const MASTER_NUMBERS: ReadonlySet<number> = new Set([11, 22, 33]);

/**
 * 数字の各桁を合計する。
 * @example digitSum(32) => 5, digitSum(11) => 2
 */
function digitSum(n: number): number {
  let sum = 0;
  let v = n;
  while (v > 0) {
    sum += v % 10;
    v = Math.floor(v / 10);
  }
  return sum;
}

/**
 * 合計値をマスターナンバー/1桁まで還元する。
 * masterNumberEnabled=true の場合、11/22/33 で停止する。
 * masterNumberEnabled=false の場合、1桁になるまで還元する。
 */
function reduceToNumerology(total: number, masterNumberEnabled: boolean): NumerologyNumber {
  let current = total;
  while (current > 9) {
    if (masterNumberEnabled && MASTER_NUMBERS.has(current)) {
      return current as NumerologyNumber;
    }
    current = digitSum(current);
  }
  return current as NumerologyNumber;
}

/**
 * ライフパスナンバーを算出する(全桁合算方式)。
 *
 * 1. YYYYMMDD の全数字を1桁ずつ合計
 * 2. 合計が 11/22/33(マスターナンバー)で masterNumberEnabled=true ならそこで確定
 * 3. それ以外は各桁を再加算し、1桁になるまで繰り返す
 * 4. masterNumberEnabled=false の場合、マスターナンバーで停止せず1桁まで還元
 *
 * @param birthDate "YYYY-MM-DD" 形式の生年月日
 * @param config masterNumberEnabled / lifepathMethod の設定(省略時は DEFAULT_CONFIG)
 */
export function computeLifepath(
  birthDate: string,
  config?: Partial<Pick<EngineConfig, "masterNumberEnabled" | "lifepathMethod">>,
): NumerologyNumber {
  const masterNumberEnabled = config?.masterNumberEnabled ?? DEFAULT_CONFIG.masterNumberEnabled;

  // YYYY-MM-DD からハイフンを除去し、各桁を合計
  const digits = birthDate.replace(/-/g, "");
  let total = 0;
  for (let i = 0; i < digits.length; i++) {
    total += Number(digits[i]);
  }

  return reduceToNumerology(total, masterNumberEnabled);
}

// ── DiagnosisModule 定義 ────────────────────────────────────

export const lifepathModule: DiagnosisModule = {
  id: "numerology_lifepath",
  version: 1,
  requiredInputs: ["birth_date"],
  optionalInputs: [],
  clientSafe: true,
  compute(inputs: ProfileInputs): { lifepath: NumerologyNumber } {
    return { lifepath: computeLifepath(inputs.birthDate) };
  },
};
