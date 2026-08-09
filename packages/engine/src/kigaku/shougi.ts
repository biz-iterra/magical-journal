import type { Direction8, GogyoElement, StarNumber } from "../types.js";

/**
 * 方位・九星の象意(意味・効果)マスタ。
 *
 * データソース: docs/14_象意マスタ.md(一次情報)
 *
 * - 九星気学において流派を問わず共通する伝統的な象意体系を、独自の表現で書き起こした静的マスタ。
 * - 五行・定位は docs/02 §1(および `starToGogyo` / `JYOUI_POSITIONS`)と完全に一致させること。
 * - 実行時に生成・推測しない。変更は全ユーザーの表示に影響するため人間の承認が必要。
 */

// ── 九星の象意 ──────────────────────────────────────────────

/** 九星の象意キーワード(伝統的に対応づけられている事物) */
export interface StarKeywords {
  /** 自然物・自然現象 */
  readonly nature: readonly string[];
  /** 季節 */
  readonly season: string;
  /** 時間帯 */
  readonly timeOfDay: string;
  /** 人物 */
  readonly person: readonly string[];
  /** 事象・分野 */
  readonly matter: readonly string[];
  /** 身体・部位 */
  readonly body: readonly string[];
}

/** 九星の象意 */
export interface StarMeaning {
  readonly star: StarNumber;
  /** 正式名(例: 一白水星) */
  readonly name: string;
  /** 略称(例: 一白) */
  readonly shortName: string;
  /** 五行(docs/02 §1 と一致) */
  readonly element: GogyoElement;
  /** 五行の日本語表記(例: 水) */
  readonly elementLabel: string;
  /** 後天定位盤での定位。五黄は中宮のため null */
  readonly jyoui: Direction8 | null;
  /** 象意キーワード */
  readonly keywords: StarKeywords;
  /** その星が回座する方位を吉方位として用いたときに期待される作用 */
  readonly favorableEffect: string;
}

/**
 * 九星の象意マスタ(固定データ)。
 * 五行・定位は docs/02 §1 の表と一致する。
 */
export const STAR_MEANINGS: Readonly<Record<StarNumber, StarMeaning>> = {
  1: {
    star: 1,
    name: "一白水星",
    shortName: "一白",
    element: "water",
    elementLabel: "水",
    jyoui: "N",
    keywords: {
      nature: ["水", "雨", "雪", "泉", "川"],
      season: "冬",
      timeOfDay: "真夜中",
      person: ["中年の男性", "部下", "苦労を知る人"],
      matter: ["交際", "信頼", "思索", "秘めごと", "水にまつわること"],
      body: ["腎臓", "耳", "血液"],
    },
    favorableEffect:
      "人との縁が静かに深まり、考えを整理する時間を取りやすくなる。表に出ない形の支えを受け取りやすい。",
  },
  2: {
    star: 2,
    name: "二黒土星",
    shortName: "二黒",
    element: "earth",
    elementLabel: "土",
    jyoui: "SW",
    keywords: {
      nature: ["大地", "平野", "田畑", "土"],
      season: "晩夏から初秋",
      timeOfDay: "昼過ぎ",
      person: ["母", "妻", "働き手", "多くの人"],
      matter: ["育てること", "準備", "地道な作業", "生活", "従うこと"],
      body: ["胃腸", "腹部"],
    },
    favorableEffect:
      "日々の積み重ねが形になりやすく、生活や仕事の土台を整えるのに向く。支える役回りがうまく回りやすい。",
  },
  3: {
    star: 3,
    name: "三碧木星",
    shortName: "三碧",
    element: "wood",
    elementLabel: "木",
    jyoui: "E",
    keywords: {
      nature: ["雷", "若草", "芽吹き"],
      season: "春",
      timeOfDay: "日の出",
      person: ["長男", "若い人", "新しい世代"],
      matter: ["始まり", "音", "声", "情報", "発信", "評判"],
      body: ["肝臓", "のど", "足"],
    },
    favorableEffect:
      "新しいことを始める勢いが出やすく、発信や連絡が届きやすくなる。気力が戻りやすい。",
  },
  4: {
    star: 4,
    name: "四緑木星",
    shortName: "四緑",
    element: "wood",
    elementLabel: "木",
    jyoui: "SE",
    keywords: {
      nature: ["風", "樹木", "香り"],
      season: "初夏",
      timeOfDay: "午前",
      person: ["長女", "旅する人", "仲立ちをする人"],
      matter: ["縁", "信用", "往来", "通信", "整えること"],
      body: ["呼吸器", "腸", "髪"],
    },
    favorableEffect:
      "人との縁や紹介がまとまりやすく、信用が積み上がりやすい。遠方との行き来にも向く。",
  },
  5: {
    star: 5,
    name: "五黄土星",
    shortName: "五黄",
    element: "earth",
    elementLabel: "土",
    jyoui: null,
    keywords: {
      nature: ["中央", "土用", "朽ちて還る土"],
      season: "土用(季節の変わり目)",
      timeOfDay: "定めなし",
      person: ["中心にいる人", "古参"],
      matter: ["支配", "古いもの", "終わりと立て直し", "強い力"],
      body: ["消化器全般"],
    },
    favorableEffect:
      "五黄は中宮を定位とし、回座した方位は五黄殺となるため吉方位としては用いない。物事の終わりと立て直しを示す星として扱う。",
  },
  6: {
    star: 6,
    name: "六白金星",
    shortName: "六白",
    element: "metal",
    elementLabel: "金",
    jyoui: "NW",
    keywords: {
      nature: ["天", "天体", "澄んだ空"],
      season: "晩秋から初冬",
      timeOfDay: "夜のはじまり",
      person: ["父", "主人", "責任者", "目上"],
      matter: ["公的なこと", "決断", "勝負", "乗り物", "遠出"],
      body: ["頭", "肺", "骨"],
    },
    favorableEffect: "目上の引き立てを受けやすく、公的な手続きや大きな判断を進めるのに向く。",
  },
  7: {
    star: 7,
    name: "七赤金星",
    shortName: "七赤",
    element: "metal",
    elementLabel: "金",
    jyoui: "W",
    keywords: {
      nature: ["沢", "湖", "実り"],
      season: "秋",
      timeOfDay: "日暮れ",
      person: ["少女", "客", "話し上手な人"],
      matter: ["金銭", "飲食", "会話", "遊び", "実りを味わうこと"],
      body: ["口", "歯", "呼吸器"],
    },
    favorableEffect: "金銭や飲食にまつわる事柄が動きやすく、社交の場で話がまとまりやすい。",
  },
  8: {
    star: 8,
    name: "八白土星",
    shortName: "八白",
    element: "earth",
    elementLabel: "土",
    jyoui: "NE",
    keywords: {
      nature: ["山", "積み重なった土", "止まる力"],
      season: "晩冬から初春",
      timeOfDay: "夜明け前",
      person: ["少年", "跡を継ぐ人", "身内"],
      matter: ["変わり目", "蓄え", "住まい", "受け継ぐこと", "積み上げ"],
      body: ["関節", "背中", "腰"],
    },
    favorableEffect: "区切りや切り替えに向き、住まい・家族・蓄えに関わる事柄が動きやすい。",
  },
  9: {
    star: 9,
    name: "九紫火星",
    shortName: "九紫",
    element: "fire",
    elementLabel: "火",
    jyoui: "S",
    keywords: {
      nature: ["火", "光", "太陽の輝き"],
      season: "夏",
      timeOfDay: "正午",
      person: ["中年の女性", "人前に立つ人", "見識のある人"],
      matter: ["名誉", "学問", "芸術", "美", "見極め", "離れること"],
      body: ["目", "心臓", "頭部"],
    },
    favorableEffect:
      "人の目に触れて評価されやすく、学びや表現が進みやすい。見極めや区切りにも向く。",
  },
};

/** 九星の象意を返す */
export function getStarMeaning(star: StarNumber): StarMeaning {
  return STAR_MEANINGS[star];
}

// ── 方位の効果 ──────────────────────────────────────────────

/** 方位の効果(吉方位として用いた場合 / 凶方位として用いた場合) */
export interface DirectionEffect {
  readonly direction: Direction8;
  /** 方位名(例: 北東) */
  readonly name: string;
  /** 後天定位盤でこの方位に定位する九星 */
  readonly jyouiStar: StarNumber;
  /** 吉方位として用いた場合に期待される作用 */
  readonly favorable: readonly string[];
  /** 凶方位として用いた場合に注意したいこと */
  readonly unfavorable: readonly string[];
}

/**
 * 八方位の効果マスタ(固定データ)。
 * jyouiStar は後天定位盤(docs/02 §1・`JYOUI_POSITIONS`)と一致する。
 */
export const DIRECTION_EFFECTS: Readonly<Record<Direction8, DirectionEffect>> = {
  N: {
    direction: "N",
    name: "北",
    jyouiStar: 1,
    favorable: [
      "信頼できる相手との縁が静かに深まりやすい",
      "考えを整理したり、方針を練り直したりするのに向く",
      "表に出ない形での支援や協力を得やすい",
      "心身を休め、消耗を回復させるのに向く",
    ],
    unfavorable: [
      "気持ちが内へ向きやすく、判断が慎重になりすぎることがある",
      "人間関係の行き違いが見えにくい形で残りやすい",
      "冷えや睡眠の乱れなど、体調の崩れに気を配りたい",
      "打ち明けにくい事柄を抱え込みやすい",
    ],
  },
  NE: {
    direction: "NE",
    name: "北東",
    jyouiStar: 8,
    favorable: [
      "区切りをつけて次へ切り替えるのに向く",
      "住まい・不動産・受け継ぐ事柄が動きやすい",
      "家族や身内との関係を見直すのに向く",
      "地道に積み上げてきたことが形になりやすい",
    ],
    unfavorable: [
      "変化が中途半端なところで止まりやすい",
      "住まいや身内に関する話が滞りやすい",
      "急いで決めた事柄が後から覆りやすい",
      "腰や関節など、体への負担に気を配りたい",
    ],
  },
  E: {
    direction: "E",
    name: "東",
    jyouiStar: 3,
    favorable: [
      "新しいことを始める、動き出すのに向く",
      "発信や告知が相手に届きやすい",
      "必要な情報が集まりやすい",
      "気力が戻り、行動が軽くなりやすい",
    ],
    unfavorable: [
      "勢いが先に立ち、詰めが甘くなりやすい",
      "言葉が先走って誤解を招きやすい",
      "落ち着かず、計画が散らかりやすい",
      "確かめていない話に振り回されやすい",
    ],
  },
  SE: {
    direction: "SE",
    name: "南東",
    jyouiStar: 4,
    favorable: [
      "人との縁や紹介がまとまりやすい",
      "信用を積み重ねていくのに向く",
      "旅や遠方とのやり取りに向く",
      "連絡・調整ごとが整いやすい",
    ],
    unfavorable: [
      "まとまりかけた話が流れやすい",
      "連絡の行き違いが起こりやすい",
      "信用に関わる約束は確認を重ねたい",
      "予定が定まらず、動きが散りやすい",
    ],
  },
  S: {
    direction: "S",
    name: "南",
    jyouiStar: 9,
    favorable: [
      "人の目に触れる場面や、評価される場面に向く",
      "学びや表現、美にまつわることが進みやすい",
      "物事を見極め、選び分けるのに向く",
      "けじめや区切りをつけたいときに向く",
    ],
    unfavorable: [
      "感情が高ぶりやすく、言い合いに発展しやすい",
      "見え方を気にしすぎて中身が伴いにくい",
      "距離が離れる方向へ話が進みやすい",
      "目の疲れやのぼせなど、熱のこもりに気を配りたい",
    ],
  },
  SW: {
    direction: "SW",
    name: "南西",
    jyouiStar: 2,
    favorable: [
      "日々の積み重ねや下準備を進めるのに向く",
      "家庭や生活の基盤を整えるのに向く",
      "誰かを支える役回りがうまく回りやすい",
      "手間のかかる作業を着実に片づけやすい",
    ],
    unfavorable: [
      "物事の進みが重く、時間がかかりやすい",
      "頼まれごとを抱えすぎやすい",
      "迷いが長引き、決めきれないことがある",
      "胃腸の不調や疲れの蓄積に気を配りたい",
    ],
  },
  W: {
    direction: "W",
    name: "西",
    jyouiStar: 7,
    favorable: [
      "金銭や商いにまつわる事柄が動きやすい",
      "会食や社交など、和やかな場に向く",
      "話し合いがまとまりやすい",
      "楽しみや息抜きを取り入れるのに向く",
    ],
    unfavorable: [
      "予定していなかった出費が増えやすい",
      "口が過ぎて行き違いが生じやすい",
      "楽な方へ流れ、締まりを欠きやすい",
      "飲食が偏りやすい点に気を配りたい",
    ],
  },
  NW: {
    direction: "NW",
    name: "北西",
    jyouiStar: 6,
    favorable: [
      "目上や責任者の引き立てを受けやすい",
      "公的な手続きや大きな判断を進めるのに向く",
      "先頭に立ってまとめる役回りに向く",
      "遠出や移動にまつわる事柄が進みやすい",
    ],
    unfavorable: [
      "主張が強くなりすぎて、ぶつかりやすい",
      "独りで決めて周囲と噛み合わなくなりやすい",
      "大きな決断や出費は判断を急がないほうがよい",
      "働きすぎや頭の疲れに気を配りたい",
    ],
  },
};

/** 方位の効果を返す */
export function getDirectionEffect(direction: Direction8): DirectionEffect {
  return DIRECTION_EFFECTS[direction];
}
