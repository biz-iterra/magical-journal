import type {
  Ban,
  CalendarProvider,
  DiagnosisModule,
  Direction8,
  DirectionFortune,
  DirectionResult,
  GogyoElement,
  MisfortuneType,
  ProfileInputs,
  StarNumber,
} from "../types.js";
import type { EngineConfig } from "../config.js";
import { DEFAULT_CONFIG } from "../config.js";
import { buildBan, getOppositeDirection, JYOUI_POSITIONS } from "./ban.js";
import { computeGetsumeiStar, computeHonmeiStar, starToGogyo } from "./honmei.js";

// ── 全方位リスト ────────────────────────────────────────────

const ALL_DIRECTIONS: readonly Direction8[] = [
  "N", "NE", "E", "SE", "S", "SW", "W", "NW",
];

// ── 十二支→方位の対応 ───────────────────────────────────────

/**
 * 十二支番号(0〜11)から方位への対応表。
 * 破はこの方位の反対に発生する。
 */
const JUNISHI_DIRECTION: Readonly<Record<number, Direction8>> = {
  0: "N",    // 子
  1: "NE",   // 丑
  2: "NE",   // 寅
  3: "E",    // 卯
  4: "SE",   // 辰
  5: "SE",   // 巳
  6: "S",    // 午
  7: "SW",   // 未
  8: "SW",   // 申
  9: "W",    // 酉
  10: "NW",  // 戌
  11: "NW",  // 亥
};

// ── 五行関係の判定 ──────────────────────────────────────────

/**
 * 相生の連鎖: 木→火→土→金→水→木
 * a が b を生じる、または b が a を生じるなら true。
 */
export function isShojo(a: GogyoElement, b: GogyoElement): boolean {
  return SHOJO_PAIRS.has(`${a}->${b}`) || SHOJO_PAIRS.has(`${b}->${a}`);
}

/** 比和(同一五行)の判定 */
export function isBiwa(a: GogyoElement, b: GogyoElement): boolean {
  return a === b;
}

/**
 * 相剋の判定。
 * 木剋土、土剋水、水剋火、火剋金、金剋木
 */
export function isSokoku(a: GogyoElement, b: GogyoElement): boolean {
  return SOKOKU_PAIRS.has(`${a}->${b}`) || SOKOKU_PAIRS.has(`${b}->${a}`);
}

/** 相生ペア(方向あり) */
const SHOJO_PAIRS: ReadonlySet<string> = new Set([
  "wood->fire",
  "fire->earth",
  "earth->metal",
  "metal->water",
  "water->wood",
]);

/** 相剋ペア(方向あり) */
const SOKOKU_PAIRS: ReadonlySet<string> = new Set([
  "wood->earth",
  "earth->water",
  "water->fire",
  "fire->metal",
  "metal->wood",
]);

// ── 方位判定メイン関数 ──────────────────────────────────────

/**
 * 盤の8方位それぞれについて吉凶を判定する。
 *
 * @param ban 判定対象の盤(年盤・月盤・日盤)
 * @param honmeiStar 本命星
 * @param getsumeiStar 月命星
 * @param junishi 十二支番号(0〜11)。歳破/月破/日破の判定に使用
 * @param config エンジン設定(省略時は DEFAULT_CONFIG)
 */
export function judgeDirections(
  ban: Ban,
  honmeiStar: StarNumber,
  getsumeiStar: StarNumber,
  junishi: number,
  config?: Partial<EngineConfig>,
): DirectionResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const results: DirectionResult[] = [];

  // ── 前計算: 万人共通の凶方位 ──

  // 五黄殺・暗剣殺: 五黄(5)の回座方位(五黄が中宮なら発生しない)
  let goouDir: Direction8 | undefined;
  let ankenDir: Direction8 | undefined;
  if (ban.center !== 5) {
    for (const dir of ALL_DIRECTIONS) {
      if (ban.positions[dir] === 5) {
        goouDir = dir;
        ankenDir = getOppositeDirection(dir);
        break;
      }
    }
  }

  // 破: 十二支の方位の反対方位
  const junishiDir = JUNISHI_DIRECTION[junishi];
  const haDir = junishiDir !== undefined ? getOppositeDirection(junishiDir) : undefined;

  // 定位対冲: 盤上の星が定位の反対に回座しているケースを収集
  const jouiTaichuDirs = new Set<Direction8>();
  for (const dir of ALL_DIRECTIONS) {
    const star = ban.positions[dir];
    const homeDir = JYOUI_POSITIONS[star];
    if (homeDir !== undefined) {
      const oppositeHome = getOppositeDirection(homeDir);
      if (dir === oppositeHome) {
        jouiTaichuDirs.add(dir);
      }
    }
  }

  // ── 前計算: 個人別の凶方位 ──

  // 本命殺・本命的殺(本命星が中宮なら発生しない)
  let honmeiSatsuDir: Direction8 | undefined;
  let honmeiTekisatsuDir: Direction8 | undefined;
  if (ban.center !== honmeiStar) {
    for (const dir of ALL_DIRECTIONS) {
      if (ban.positions[dir] === honmeiStar) {
        honmeiSatsuDir = dir;
        honmeiTekisatsuDir = getOppositeDirection(dir);
        break;
      }
    }
  }

  // 月命殺・月命的殺(月命星が中宮なら発生しない)
  let getsumeiSatsuDir: Direction8 | undefined;
  let getsumeiTekisatsuDir: Direction8 | undefined;
  if (ban.center !== getsumeiStar) {
    for (const dir of ALL_DIRECTIONS) {
      if (ban.positions[dir] === getsumeiStar) {
        getsumeiSatsuDir = dir;
        getsumeiTekisatsuDir = getOppositeDirection(dir);
        break;
      }
    }
  }

  // ── 8方位を判定 ──

  for (const dir of ALL_DIRECTIONS) {
    const star = ban.positions[dir];
    const misfortunes: MisfortuneType[] = [];

    // 万人共通
    if (goouDir === dir) misfortunes.push("goou_satsu");
    if (ankenDir === dir) misfortunes.push("anken_satsu");
    if (haDir === dir) misfortunes.push("saiha"); // saiha / geppa / nippa は呼び出し元で区別
    if (jouiTaichuDirs.has(dir)) misfortunes.push("jouiTaichu");

    // 個人別
    if (honmeiSatsuDir === dir) misfortunes.push("honmei_satsu");
    if (honmeiTekisatsuDir === dir) misfortunes.push("honmei_tekisatsu");
    if (getsumeiSatsuDir === dir) misfortunes.push("getsumei_satsu");
    if (getsumeiTekisatsuDir === dir) misfortunes.push("getsumei_tekisatsu");

    // fortune の決定
    const fortune = determineFortune(
      star,
      honmeiStar,
      getsumeiStar,
      misfortunes,
      cfg,
    );

    results.push({ direction: dir, star, fortune, misfortunes });
  }

  return results;
}

/**
 * 方位の吉凶レベルを決定する。
 */
function determineFortune(
  directionStar: StarNumber,
  honmeiStar: StarNumber,
  getsumeiStar: StarNumber,
  misfortunes: readonly MisfortuneType[],
  config: EngineConfig,
): DirectionFortune {
  // 凶方位が1つ以上あれば misfortune
  if (misfortunes.length > 0) {
    return "misfortune";
  }

  const dirGogyo = starToGogyo(directionStar);
  const honmeiGogyo = starToGogyo(honmeiStar);
  const getsumeiGogyo = starToGogyo(getsumeiStar);

  const honmeiShojo = isShojo(dirGogyo, honmeiGogyo);
  const honmeiBiwa = isBiwa(dirGogyo, honmeiGogyo);
  const getsumeiShojo = isShojo(dirGogyo, getsumeiGogyo);
  const getsumeiBiwa = isBiwa(dirGogyo, getsumeiGogyo);

  // 本命星と相生 AND 月命星とも相生/比和 → great_fortune(最大吉方)
  if (honmeiShojo) {
    if (getsumeiShojo || (config.biwaTreatedAsGood && getsumeiBiwa)) {
      return "great_fortune";
    }
    return "fortune";
  }

  // 本命星と比和(吉扱い)
  if (config.biwaTreatedAsGood && honmeiBiwa) {
    return "fortune";
  }

  return "neutral";
}

// ── DiagnosisModule 定義 ────────────────────────────────────

export const kigakuDirectionModule: DiagnosisModule = {
  id: "kigaku_direction",
  version: 1,
  requiredInputs: ["birth_date", "home_latlng"],
  optionalInputs: [],
  clientSafe: false,
  compute(inputs: ProfileInputs, masters?: unknown): {
    yearDirections: DirectionResult[];
    monthDirections: DirectionResult[];
  } {
    if (!masters) {
      throw new Error("kigaku_direction requires CalendarProvider as masters");
    }
    const calendar = masters as CalendarProvider;
    const honmeiStar = computeHonmeiStar(inputs.birthDate, calendar);
    const getsumeiStar = computeGetsumeiStar(
      honmeiStar,
      inputs.birthDate,
      calendar,
    );

    // 現在の日付が必要だが、DiagnosisModule の compute は日付引数を持たない。
    // ここでは birthDate の年の年盤・月盤で判定する(実際の運用では
    // 対象日ベースの判定を別途 API 層で行う)。
    const parts = inputs.birthDate.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);

    const yearBan = calendar.getYearBan(year);
    const monthBan = calendar.getMonthBan(year, month);

    const yearJunishi = calendar.getYearJunishi(year);
    const monthJunishi = calendar.getMonthJunishi(year, month);

    const yearDirections = judgeDirections(
      yearBan,
      honmeiStar,
      getsumeiStar,
      yearJunishi,
    );
    const monthDirections = judgeDirections(
      monthBan,
      honmeiStar,
      getsumeiStar,
      monthJunishi,
    );

    return { yearDirections, monthDirections };
  },
};
