import type {
  CalendarProvider,
  DiagnosisModule,
  GogyoElement,
  ProfileInputs,
  StarNumber,
} from "../types.js";

// ── 九星→五行の対応(固定値・変更禁止) ────────────────────

const STAR_GOGYO: Readonly<Record<StarNumber, GogyoElement>> = {
  1: "water",
  2: "earth",
  3: "wood",
  4: "wood",
  5: "earth",
  6: "metal",
  7: "metal",
  8: "earth",
  9: "fire",
};

/** 九星番号から五行を返す */
export function starToGogyo(star: StarNumber): GogyoElement {
  return STAR_GOGYO[star];
}

// ── 本命星 ──────────────────────────────────────────────────

/**
 * 生年月日から本命星を算出する。
 *
 * 1. CalendarProvider の節入りデータで立春(月=2)前か後かを判定
 * 2. 立春前なら前年扱い
 * 3. 気学上の年から: n = year % 9 (n=0 なら 9)、star = 11 - n (10 なら 1)
 *
 * @param birthDate "YYYY-MM-DD" 形式
 * @param calendar CalendarProvider
 */
export function computeHonmeiStar(
  birthDate: string,
  calendar: CalendarProvider,
): StarNumber {
  const year = getKigakuYear(birthDate, calendar);
  return yearToStar(year);
}

/**
 * 西暦年から本命星(=年盤中宮星)を計算する。
 * 内部ヘルパー。CalendarProvider の立春判定は呼び出し元で済ませること。
 */
function yearToStar(year: number): StarNumber {
  let n = year % 9;
  if (n === 0) n = 9;
  let star = 11 - n;
  if (star === 10) star = 1;
  return star as StarNumber;
}

/**
 * 生年月日から気学上の年を返す。
 * 立春(月=2 の節入り日)より前なら前年扱い。
 */
function getKigakuYear(
  birthDate: string,
  calendar: CalendarProvider,
): number {
  const parts = birthDate.split("-");
  const calendarYear = Number(parts[0]);

  const boundaries = calendar.getSekkiriBoundaries(calendarYear);
  // 月=2 が立春
  const risshun = boundaries.find((b) => b.month === 2);
  if (risshun === undefined) {
    throw new Error(
      `CalendarProvider: risshun (month=2) boundary not found for year ${String(calendarYear)}`,
    );
  }

  // 日付の文字列比較で前後判定 ("YYYY-MM-DD" 形式なので辞書順=日付順)
  if (birthDate < risshun.date) {
    return calendarYear - 1;
  }
  return calendarYear;
}

// ── 月命星 ──────────────────────────────────────────────────

/**
 * 本命星グループごとの寅月(月=2)起点星。
 * (1,4,7) → 8、(3,6,9) → 5、(2,5,8) → 2
 */
function getGetsumeiKiten(honmeiStar: StarNumber): StarNumber {
  if (honmeiStar === 1 || honmeiStar === 4 || honmeiStar === 7) return 8;
  if (honmeiStar === 3 || honmeiStar === 6 || honmeiStar === 9) return 5;
  // 2, 5, 8
  return 2;
}

/**
 * 生年月日から気学上の月(1〜12)を返す。
 * 各月の節入り日をまたぐタイミングで切り替わる。
 *
 * 節入りは月=2(立春)〜月=1(小寒)の12個。
 * birthDate がどの節入り区間に入るかを判定する。
 *
 * ただし、年をまたぐ場合(1月生まれなど)は前年の小寒〜当年の立春前を考慮する。
 */
function getKigakuMonth(
  birthDate: string,
  calendar: CalendarProvider,
): number {
  const parts = birthDate.split("-");
  const calendarYear = Number(parts[0]);

  // 当年の境界を取得
  const boundaries = calendar.getSekkiriBoundaries(calendarYear);

  // 立春(month=2)前なら前年の区間に属する。
  // ここでは当年の立春と前年1月(小寒)の位置を考慮。
  // 節入りは month=2,3,4,...,12,1 の順に並ぶ（月順）
  // birthDate が当年立春前の場合、前年12月(大雪)〜1月(小寒)の範囲を判定する必要がある。

  // boundaries は month 順とは限らないので、date 順にソート
  const sorted = [...boundaries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // 後ろから走査して、birthDate >= boundary.date の最初の境界を見つける
  for (let i = sorted.length - 1; i >= 0; i--) {
    const boundary = sorted[i]!;
    if (birthDate >= boundary.date) {
      return boundary.month;
    }
  }

  // すべての境界より前(=当年の小寒(1月)より前)
  // 前年の境界を参照して判定する
  const prevBoundaries = calendar.getSekkiriBoundaries(calendarYear - 1);
  const prevSorted = [...prevBoundaries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  for (let i = prevSorted.length - 1; i >= 0; i--) {
    const boundary = prevSorted[i]!;
    if (birthDate >= boundary.date) {
      return boundary.month;
    }
  }

  // ここに到達することはないはずだが、安全のためエラー
  throw new Error(
    `CalendarProvider: could not determine kigaku month for ${birthDate}`,
  );
}

/**
 * 月命星を算出する。
 *
 * @param honmeiStar 本命星
 * @param birthDate "YYYY-MM-DD" 形式の生年月日
 * @param calendar CalendarProvider
 */
export function computeGetsumeiStar(
  honmeiStar: StarNumber,
  birthDate: string,
  calendar: CalendarProvider,
): StarNumber {
  const kigakuMonth = getKigakuMonth(birthDate, calendar);
  const kiten = getGetsumeiKiten(honmeiStar);

  // 寅月(月=2)からの経過月数
  // 気学上の月は 2,3,4,...,12,1 と進む
  let elapsed: number;
  if (kigakuMonth >= 2) {
    elapsed = kigakuMonth - 2;
  } else {
    // 月=1(丑月)は寅月から10ヶ月後
    elapsed = 11;
  }

  // 月命星 = ((起点 - 経過月数 - 1) % 9 + 9) % 9 + 1
  const star = (((kiten - elapsed - 1) % 9) + 9) % 9 + 1;
  return star as StarNumber;
}

// ── DiagnosisModule 定義 ────────────────────────────────────

export const kigakuProfileModule: DiagnosisModule = {
  id: "kigaku_profile",
  version: 1,
  requiredInputs: ["birth_date"],
  optionalInputs: [],
  clientSafe: true,
  compute(inputs: ProfileInputs, masters?: unknown): {
    honmeiStar: StarNumber;
    getsumeiStar: StarNumber;
  } {
    if (!masters) {
      throw new Error("kigaku_profile requires CalendarProvider as masters");
    }
    const calendar = masters as CalendarProvider;
    const honmeiStar = computeHonmeiStar(inputs.birthDate, calendar);
    const getsumeiStar = computeGetsumeiStar(
      honmeiStar,
      inputs.birthDate,
      calendar,
    );
    return { honmeiStar, getsumeiStar };
  },
};
