import type { Direction8, DirectionFortune, MisfortuneType, StarNumber } from "@mj/engine";
import { getStarMeaning } from "@mj/engine";
import { useCallback, useRef, useState } from "react";
import * as s from "./DirectionCompass.css";
import { DirectionDetailModal } from "./DirectionDetailModal";
import { DIR_LABELS, MISFORTUNE_LABELS, fortuneLabel } from "./labels";

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
 *
 * `interactive` を渡すと 8 方位のセルがボタンになり、タップで詳細モーダル
 * (方位・回座星・吉凶・方位の効果・九星の効果)を開く。中宮は方位ではないので
 * タップ対象にしない。既定は非対話(他画面の見た目・挙動を変えない)。
 */

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
  /** true にすると方位セルをタップして詳細モーダルを開けるようにする(既定 false) */
  readonly interactive?: boolean;
  /** 詳細モーダルの見出しに添える盤の種別(例: 日盤)。interactive 時のみ使う */
  readonly banLabel?: string | undefined;
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

export function DirectionCompass({
  directions,
  center,
  interactive = false,
  banLabel,
}: DirectionCompassProps) {
  const dirMap = new Map(directions.map((d) => [d.direction, d]));
  // 開いている方位。モーダルの内容は常に最新の directions から引き直すので、
  // 盤タブ・日付を切り替えても表示が古い盤のまま残らない。
  const [openDir, setOpenDir] = useState<Direction8 | null>(null);
  // 閉じたときにフォーカスを戻すセル(キーボード利用者のため)
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpenDir(null);
    triggerRef.current?.focus();
  }, []);

  const opened = openDir ? (dirMap.get(openDir) ?? null) : null;

  return (
    <div className={s.card}>
      {/* 盤は回転しない。北が上であることを明示する(視覚・読み上げ共通の説明) */}
      <div className={s.northNote}>
        {interactive ? "方位盤（上が北）・方位をタップすると詳細" : "方位盤（上が北）"}
      </div>
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
          const cellClass = `${s.cell} ${fortuneClass(item.fortune)} ${CORNER_CLASS[dir] ?? ""}`;
          const inner = (
            <>
              <span className={s.dirLabel}>{label}</span>
              <span className={s.star}>{getStarMeaning(item.star).shortName}</span>
              {goodLabel && <span className={s.badgeGood}>{goodLabel}</span>}
              {item.misfortunes.length > 0 && (
                <span className={s.badgeBad}>
                  {item.misfortunes.map((m) => MISFORTUNE_LABELS[m]?.slice(0, 3)).join("・")}
                </span>
              )}
            </>
          );

          if (!interactive) {
            return (
              <div key={dir} className={cellClass}>
                {inner}
              </div>
            );
          }

          return (
            <button
              key={dir}
              type="button"
              className={`${cellClass} ${s.cellButton}`}
              aria-label={`${label}の詳細`}
              aria-haspopup="dialog"
              onClick={(e) => {
                triggerRef.current = e.currentTarget;
                setOpenDir(dir);
              }}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {interactive && opened && (
        <DirectionDetailModal item={opened} banLabel={banLabel} onClose={close} />
      )}
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
      <span className={s.centerValue}>{getStarMeaning(center).name}</span>
    </div>
  );
}
