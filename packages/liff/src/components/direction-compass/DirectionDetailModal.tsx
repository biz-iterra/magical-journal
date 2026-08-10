import type { DirectionFortune, StarMeaning } from "@mj/engine";
import { getDirectionEffect, getStarMeaning } from "@mj/engine";
import { Fragment, useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { CompassDirection } from "./DirectionCompass";
import * as s from "./DirectionDetailModal.css";
import { DIR_LABELS, MISFORTUNE_LABELS, fortuneLabelFull, isFavorable } from "./labels";

/**
 * 方位の詳細モーダル。
 *
 * 羅針盤のセルをタップすると開き、その方位について
 * 「方位 → その日の回座星 → 吉凶 → 方位の効果 → 九星の効果」の順に表示する。
 *
 * ★回座星と定位星の区別(docs/14 §3)
 * - **回座星** = その盤でその方位に回っている星。`item.star`(API / engine の判定結果)。
 *   モーダルの主役はこちらで、九星の象意(`getStarMeaning`)もこの星で引く。
 * - **定位星** = 後天定位盤でその方位に定位する星(北なら常に一白)。
 *   `getDirectionEffect(dir).jyouiStar` がこれ。日によって変わらないため、
 *   補足として一段弱く添えるだけにする。
 *
 * 吉凶の判定は engine が済ませたものをそのまま表示する(UI では再計算しない)。
 * 表示する象意は docs/14 のマスタのみで、axes や個人情報は一切含めない。
 */

/** 象意キーワードの表示順とラベル(docs/14 §1-2 の並び) */
const KEYWORD_ROWS: readonly { label: string; pick: (k: StarMeaning["keywords"]) => string }[] = [
  { label: "自然物", pick: (k) => k.nature.join(" / ") },
  { label: "季節", pick: (k) => k.season },
  { label: "時間帯", pick: (k) => k.timeOfDay },
  { label: "人物", pick: (k) => k.person.join(" / ") },
  { label: "事象", pick: (k) => k.matter.join(" / ") },
  { label: "身体", pick: (k) => k.body.join(" / ") },
];

/** 五黄は中宮が定位で、回座した方位は五黄殺になる。作用ではなく注記として扱う星。 */
const NO_FAVORABLE_STAR = 5;

function badgeClass(fortune: DirectionFortune): string {
  switch (fortune) {
    case "great_fortune":
      return s.fortuneBadge.great;
    case "fortune":
      return s.fortuneBadge.good;
    case "misfortune":
      return s.fortuneBadge.bad;
    default:
      return s.fortuneBadge.neutral;
  }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), summary, input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface DirectionDetailModalProps {
  /** 表示する方位の判定結果(盤に描いているものと同一のオブジェクト) */
  readonly item: CompassDirection;
  /** 盤の種別ラベル(例: 日盤)。どの盤の話かを見出しに添える */
  readonly banLabel?: string | undefined;
  readonly onClose: () => void;
}

export function DirectionDetailModal({ item, banLabel, onClose }: DirectionDetailModalProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const dirLabel = DIR_LABELS[item.direction];
  const effect = getDirectionEffect(item.direction);
  // ★主役は「その日この方位に回座している星」。定位星(effect.jyouiStar)ではない。
  const star = getStarMeaning(item.star);
  const jyouiStar = getStarMeaning(effect.jyouiStar);
  const favorable = isFavorable(item.fortune);

  // 開いている間は背面をスクロールさせない
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 開いたらフォーカスをモーダル内へ移す(閉じたときの復帰は呼び出し側が行う)
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Esc で閉じる / Tab はモーダル内を巡回する
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const nodes = sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  /**
   * 「今日どちらなのか」が一目で分かるよう、該当する側を主に置く。
   * 平(吉方位でも凶方位でもない)のときはどちらも主にせず、参考として並べる。
   */
  const neutral = item.fortune === "neutral";
  const primary = favorable || neutral ? effect.favorable : effect.unfavorable;
  const secondary = favorable || neutral ? effect.unfavorable : effect.favorable;
  const primaryLead = neutral
    ? "吉方位として用いた場合（参考）"
    : favorable
      ? "この方位を吉方位として用いた場合"
      : "この方位を凶方位として用いた場合に気を配りたいこと";
  const secondaryLead =
    favorable || neutral ? "凶方位として用いた場合に気を配りたいこと" : "吉方位として用いた場合";

  return createPortal(
    <div className={s.overlay} onKeyDown={onKeyDown}>
      {/* 背景タップで閉じる。読み上げ・タブ移動からは外し(閉じ方はボタンと Esc がある)、
          クリック領域としてだけ置く */}
      <button
        type="button"
        className={s.backdrop}
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      {/* 表示位置は自前で制御するため showModal() は使わず open 属性で描画する */}
      <dialog ref={sheetRef} className={s.sheet} aria-modal="true" aria-labelledby={titleId} open>
        <div className={s.header}>
          <div className={s.eyebrow}>{banLabel ? `${banLabel}・方位` : "方位"}</div>
          <h2 id={titleId} className={s.title}>
            {dirLabel}
          </h2>
          <button ref={closeRef} type="button" className={s.closeButton} onClick={onClose}>
            <span aria-hidden="true">×</span>
            <span className={s.srOnly}>閉じる</span>
          </button>
        </div>

        <div className={s.body}>
          {/* 1. 吉凶(盤と同じ語彙・同じ意味色) */}
          <div className={s.fortuneRow}>
            <span className={badgeClass(item.fortune)}>{fortuneLabelFull(item.fortune)}</span>
            {item.misfortunes.map((m) => (
              <span key={m} className={s.misfortuneChip}>
                {MISFORTUNE_LABELS[m]}
              </span>
            ))}
          </div>

          {/* 2. その日の回座星(主役)。定位星は補足として一段弱く添える */}
          <section className={s.section}>
            <h3 className={s.sectionTitle}>この方位に回座している九星</h3>
            <div className={s.starRow}>
              <span className={s.starName}>{star.name}</span>
              <span className={s.elementTag}>五行 {star.elementLabel}</span>
            </div>
            <p className={s.jyouiNote}>
              {item.star === effect.jyouiStar ? (
                <>
                  （{star.name}は後天定位盤で{dirLabel}に定位する星でもあります）
                </>
              ) : (
                <>
                  （後天定位盤で{dirLabel}に定位するのは{jyouiStar.name}です。上の
                  {star.name}は今この盤で{dirLabel}に回座している九星です）
                </>
              )}
            </p>
          </section>

          {/* 3. 方位の効果。今日どちらなのかが一目で分かるよう、該当する側を主表示する */}
          <section className={s.section}>
            <h3 className={s.sectionTitle}>方位の効果</h3>
            {neutral && (
              <p className={s.jyouiNote}>
                この盤では{dirLabel}は吉方位にも凶方位にもあたりません。以下は{dirLabel}
                という方位そのものが持つ意味です。
              </p>
            )}
            <div className={s.effectBlock}>
              <div className={s.effectLead}>{primaryLead}</div>
              <ul className={s.effectList}>
                {primary.map((line) => (
                  <li key={line} className={s.effectItem}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <details className={s.details}>
              <summary className={s.summary}>{secondaryLead}（参考）</summary>
              <div className={s.detailsBody}>
                <ul className={s.effectList}>
                  {secondary.map((line) => (
                    <li key={line} className={s.effectItem}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          </section>

          {/* 4. 九星の効果(回座星の象意) */}
          <section className={s.section}>
            <h3 className={s.sectionTitle}>{star.name}の象意</h3>
            {item.star === NO_FAVORABLE_STAR ? (
              // 五黄は「吉方位としては用いない」旨の注記。他の星と同じ「作用」欄には出さない
              <p className={s.starNote}>{star.favorableEffect}</p>
            ) : (
              <>
                <div className={s.effectLead}>吉方位として用いたときに期待される作用</div>
                <p className={s.starEffect}>{star.favorableEffect}</p>
              </>
            )}
            <dl className={s.keywordList}>
              {KEYWORD_ROWS.map((row) => (
                <Fragment key={row.label}>
                  <dt className={s.keywordLabel}>{row.label}</dt>
                  <dd className={s.keywordValue}>{row.pick(star.keywords)}</dd>
                </Fragment>
              ))}
            </dl>
          </section>

          {/* 和文は JSX の改行が半角スペースになるため 1 行で書く */}
          <p className={s.footnote}>
            吉凶の判定は盤の計算結果です。象意は伝統的な対応を整理したもので、行動を指示するものではありません。
          </p>
        </div>
      </dialog>
    </div>,
    document.body,
  );
}
