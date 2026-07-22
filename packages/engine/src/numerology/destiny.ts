import type {
  DiagnosisModule,
  NumerologyNumber,
  ProfileInputs,
} from "../types.js";
import type { EngineConfig } from "../config.js";
import { DEFAULT_CONFIG } from "../config.js";
import { kanaToHepburn } from "./romaji.js";

// ── ピタゴラス式変換表 ─────────────────────────────────────

/**
 * A=1, B=2, C=3, D=4, E=5, F=6, G=7, H=8, I=9,
 * J=1, K=2, L=3, M=4, N=5, O=6, P=7, Q=8, R=9,
 * S=1, T=2, U=3, V=4, W=5, X=6, Y=7, Z=8
 */
const PYTHAGOREAN: Readonly<Record<string, number>> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
};

/** マスターナンバーの集合 */
const MASTER_NUMBERS: ReadonlySet<number> = new Set([11, 22, 33]);

/**
 * 数字の各桁を合計する。
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
 */
function reduceToNumerology(
  total: number,
  masterNumberEnabled: boolean,
): NumerologyNumber {
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
 * ディスティニーナンバーを算出する。
 *
 * 1. ローマ字フルネーム(大文字)の全アルファベットをピタゴラス式変換表で数値化し合計
 * 2. スペース・記号は無視
 * 3. ライフパスと同じ還元ルール(マスターナンバー 11/22/33 で確定、それ以外は1桁まで)
 *
 * @param nameRomaji 大文字ローマ字のフルネーム
 * @param config masterNumberEnabled の設定(省略時は DEFAULT_CONFIG)
 */
export function computeDestiny(
  nameRomaji: string,
  config?: Partial<Pick<EngineConfig, "masterNumberEnabled">>,
): NumerologyNumber {
  const masterNumberEnabled =
    config?.masterNumberEnabled ?? DEFAULT_CONFIG.masterNumberEnabled;

  const upper = nameRomaji.toUpperCase();
  let total = 0;

  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i]!;
    const value = PYTHAGOREAN[ch];
    if (value !== undefined) {
      total += value;
    }
    // スペース・記号は無視
  }

  return reduceToNumerology(total, masterNumberEnabled);
}

// ── DiagnosisModule 定義 ────────────────────────────────────

export const destinyModule: DiagnosisModule = {
  id: "numerology_destiny",
  version: 1,
  requiredInputs: ["name_kana", "name_romaji"],
  optionalInputs: [],
  clientSafe: true,
  compute(inputs: ProfileInputs): { destiny: NumerologyNumber; romaji: string } {
    // nameRomaji が ProfileInputs にあればそれを使い、
    // なければ nameKana から kanaToHepburn で変換
    const romaji = inputs.nameRomaji ?? kanaToHepburn(inputs.nameKana ?? "");
    return {
      destiny: computeDestiny(romaji),
      romaji,
    };
  },
};
