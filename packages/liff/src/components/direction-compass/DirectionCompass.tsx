import type { Direction8, DirectionFortune, MisfortuneType, StarNumber } from "@mj/engine";
import * as s from "./DirectionCompass.css";

/**
 * 方位盤(羅針盤)表示。
 *
 * 「今日のページ」と「月間ページ」で共用する。API が返した方位判定結果
 * (吉凶・凶方位の種類)をそのまま描画するだけで、UI 側では一切再計算しない。
 *
 * レイアウトは 3×3 のグリッドで、北を上に固定して実際の方角の位置に置く:
 *
 *   北西  北  北東
 *   西   中宮  東
 *   南西  南  南東
 *
 * DOM の並び順 = 視覚上の並び順(grid-area / order による並べ替えはしない)。
 */

const STAR_NAMES: Record<number, string> = {
  1: "一白水星",
  2: "二黒土星",
  3: "三碧木星",
  4: "四緑木星",
  5: "五黄土星",
  6: "六白金星",
  7: "七赤金星",
  8: "八白土星",
  9: "九紫火星",
};

const DIR_LABELS: Record<Direction8, string> = {
  N: "北",
  NE: "北東",
  E: "東",
  SE: "南東",
  S: "南",
  SW: "南西",
  W: "西",
  NW: "北西",
};

const MISFORTUNE_LABELS: Record<MisfortuneType, string> = {
  goou_satsu: "五黄殺",
  anken_satsu: "暗剣殺",
  saiha: "歳破",
  geppa: "月破",
  nippa: "日破",
  jouiTaichu: "定位対冲",
  honmei_satsu: "本命殺",
  honmei_tekisatsu: "本命的殺",
  getsumei_satsu: "月命殺",
  getsumei_tekisatsu: "月命的殺",
};

/**
 * 3×3 の並び。null = 中央(中宮)。
 * 配列の順序がそのまま DOM 順 = 表示位置になる(北が上)。
 */
const CELL_LAYOUT: readonly (Direction8 | null)[] = [
  "NW",
  "N",
  "NE",
  "W",
  null,
  "E",
  "SW",
  "S",
  "SE",
];

/** 4 隅のセルだけ外側の角を大きく丸める(盤らしいシルエット) */
const CORNER_CLASS: Partial<Record<Direction8, string>> = {
  NW: s.corner.NW,
  NE: s.corner.NE,
  SW: s.corner.SW,
  SE: s.corner.SE,
};

export interface CompassDirection {
  readonly direction: Direction8;
  readonly star: StarNumber;
  readonly fortune: DirectionFortune;
  readonly misfortunes: readonly MisfortuneType[];
}

export interface DirectionCompassProps {
  /** API が返した 8 方位の判定結果 */
  readonly directions: readonly CompassDirection[];
  /**
   * 中宮の星。値を持たない盤(月盤・年盤の API 応答)では null / 未指定にすると
   * 中央は方位盤の中心を示す装飾のみになる。
   */
  readonly center?: StarNumber | null;
}

function fortuneClass(fortune: DirectionFortune): string {
  switch (fortune) {
    case "great_fortune":
      return s.cellGreat;
    case "fortune":
      return s.cellFortune;
    case "misfortune":
      return s.cellMisfortune;
    default:
      return s.cellNeutral;
  }
}

function fortuneLabel(fortune: DirectionFortune): string | null {
  switch (fortune) {
    case "great_fortune":
      return "大吉";
    case "fortune":
      return "吉";
    default:
      return null;
  }
}

export function DirectionCompass({ directions, center }: DirectionCompassProps) {
  const dirMap = new Map(directions.map((d) => [d.direction, d]));

  return (
    <div className={s.card}>
      {/* 盤は回転しない。北が上であることを明示する(視覚・読み上げ共通の説明) */}
      <div className={s.northNote}>方位盤（上が北）</div>
      <div className={s.grid}>
        {CELL_LAYOUT.map((dir) => {
          if (dir === null) {
            return <CenterCell key="center" center={center ?? null} />;
          }

          const item = dirMap.get(dir);
          const label = DIR_LABELS[dir];

          // 該当方位のデータが無い場合も枠は残す(位置関係を崩さない)
          if (!item) {
            return (
              <div key={dir} className={`${s.cell} ${s.cellNeutral} ${CORNER_CLASS[dir] ?? ""}`}>
                <span className={s.dirLabel}>{label}</span>
              </div>
            );
          }

          const goodLabel = fortuneLabel(item.fortune);

          return (
            <div
              key={dir}
              className={`${s.cell} ${fortuneClass(item.fortune)} ${CORNER_CLASS[dir] ?? ""}`}
            >
              <span className={s.dirLabel}>{label}</span>
              <span className={s.star}>{STAR_NAMES[item.star]?.slice(0, 2)}</span>
              {goodLabel && <span className={s.badgeGood}>{goodLabel}</span>}
              {item.misfortunes.length > 0 && (
                <span className={s.badgeBad}>
                  {item.misfortunes.map((m) => MISFORTUNE_LABELS[m]?.slice(0, 3)).join("・")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 盤の中心。中宮の星があれば表示し、無ければ中心の目印だけを置く。 */
function CenterCell({ center }: { center: StarNumber | null }) {
  if (center == null) {
    return (
      <div className={s.centerCellEmpty}>
        <span className={s.centerDot} />
      </div>
    );
  }

  return (
    <div className={s.centerCell}>
      <span className={s.centerLabel}>中宮</span>
      <span className={s.centerValue}>{STAR_NAMES[center]}</span>
    </div>
  );
}
