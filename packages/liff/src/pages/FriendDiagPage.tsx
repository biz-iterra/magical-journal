import { MasterCalendarProvider } from "@mj/calendar-data";
import {
  CHARACTER_MAP,
  type PotentialTypeId,
  computeDestiny,
  computeGetsumeiStar,
  computeHonmeiStar,
  computeLifepath,
  computePotential,
  computeZodiac,
  getCharacterName,
  kanaToHepburn,
} from "@mj/engine";
import type { NumerologyNumber, StarNumber, ZodiacSign } from "@mj/engine";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useCharacterTheme } from "../components/CharacterTheme";
import type { PersonalityReport } from "../services/personality";
import { fetchStaticPersonality } from "../services/personality-static";
import { characterImagePath } from "../utils/character-assets";
import * as s from "./FriendDiagPage.css";

// ── 定数 ─────────────────────────────────────────────────

const ZODIAC_JA: Record<ZodiacSign, string> = {
  aries: "牡羊座",
  taurus: "牡牛座",
  gemini: "双子座",
  cancer: "蟹座",
  leo: "獅子座",
  virgo: "乙女座",
  libra: "天秤座",
  scorpio: "蠍座",
  sagittarius: "射手座",
  capricorn: "山羊座",
  aquarius: "水瓶座",
  pisces: "魚座",
};

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

const CURRENT_YEAR = new Date().getFullYear();

// ── 診断結果型 ────────────────────────────────────────────

interface FriendResult {
  zodiac: ZodiacSign;
  potential: {
    primaryType: PotentialTypeId;
    secondaryType?: PotentialTypeId;
    rawValue: number;
  };
  honmeiStar: StarNumber;
  getsumeiStar: StarNumber;
  lifepath: NumerologyNumber;
  destiny: NumerologyNumber | null;
  isMasterLifepath: boolean;
  isMasterDestiny: boolean;
}

// ── ヘルパー ──────────────────────────────────────────────

const MASTER_NUMBERS = new Set([11, 22, 33]);

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) return 29;
  return days[month - 1] ?? 30;
}

function isHiragana(s: string): boolean {
  return /^[぀-ゟー\s]+$/.test(s);
}

// ── コンポーネント ─────────────────────────────────────────

export function FriendDiagPage() {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [nameSei, setNameSei] = useState("");
  const [nameMei, setNameMei] = useState("");
  const [result, setResult] = useState<FriendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { setThemeType } = useCharacterTheme();

  // 結果カードには診断されたタイプの色を適用する(docs/06。結果クリアで元へ戻す)。
  useEffect(() => {
    setThemeType(result ? result.potential.primaryType : null);
    return () => setThemeType(null);
  }, [result, setThemeType]);

  const calendar = useMemo(() => new MasterCalendarProvider(), []);

  const maxDay = year && month ? daysInMonth(Number(year), Number(month)) : 31;

  const canDiagnose = year !== "" && month !== "" && day !== "";

  const handleDiagnose = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!canDiagnose) return;

      const birthDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      const timeStr = birthTime || undefined;

      try {
        const zodiac = computeZodiac(birthDate);
        const potential = computePotential(birthDate, timeStr);
        const honmeiStar = computeHonmeiStar(birthDate, calendar);
        const getsumeiStar = computeGetsumeiStar(honmeiStar, birthDate, calendar);
        const lifepath = computeLifepath(birthDate);

        let destiny: NumerologyNumber | null = null;
        const fullKana = `${nameSei}${nameMei}`.trim();
        if (fullKana && isHiragana(fullKana)) {
          const romaji = kanaToHepburn(fullKana);
          destiny = computeDestiny(romaji);
        }

        setResult({
          zodiac,
          potential,
          honmeiStar,
          getsumeiStar,
          lifepath,
          destiny,
          isMasterLifepath: MASTER_NUMBERS.has(lifepath),
          isMasterDestiny: destiny !== null && MASTER_NUMBERS.has(destiny),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "診断中にエラーが発生しました");
      }
    },
    [year, month, day, birthTime, nameSei, nameMei, canDiagnose, calendar],
  );

  const handleReset = useCallback(() => {
    setYear("");
    setMonth("");
    setDay("");
    setBirthTime("");
    setNameSei("");
    setNameMei("");
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className={s.container}>
      <h1 className={s.pageTitle}>友達のタイプ診断</h1>
      <p className={s.pageSubtitle}>友達の生年月日を入力して診断します</p>

      {/* 入力フォーム */}
      <form onSubmit={handleDiagnose}>
        <div className={s.formCard}>
          {/* 生年月日 */}
          <div className={s.fieldGroup}>
            <span className={s.label}>
              生年月日
              <span className={s.requiredBadge}>必須</span>
            </span>
            <div className={s.selectRow}>
              <select className={s.select} value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">年</option>
                {Array.from({ length: CURRENT_YEAR - 1920 + 1 }, (_, i) => {
                  const y = CURRENT_YEAR - i;
                  return (
                    <option key={`y-${String(y)}`} value={String(y)}>
                      {y}年
                    </option>
                  );
                })}
              </select>
              <select className={s.select} value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">月</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={`m-${String(i + 1)}`} value={String(i + 1)}>
                    {i + 1}月
                  </option>
                ))}
              </select>
              <select className={s.select} value={day} onChange={(e) => setDay(e.target.value)}>
                <option value="">日</option>
                {Array.from({ length: maxDay }, (_, i) => (
                  <option key={`d-${String(i + 1)}`} value={String(i + 1)}>
                    {i + 1}日
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 出生時刻 */}
          <div className={s.fieldGroup}>
            <span className={s.label}>
              出生時刻
              <span className={s.optionalBadge}>任意</span>
            </span>
            <input
              type="time"
              className={s.input}
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              placeholder="HH:MM"
            />
          </div>

          {/* 氏名かな */}
          <div className={s.fieldGroup}>
            <span className={s.label}>
              氏名（ひらがな）
              <span className={s.optionalBadge}>任意</span>
            </span>
            <div className={s.selectRow}>
              <input
                className={`${s.input} ${s.inputHalf}`}
                value={nameSei}
                onChange={(e) => setNameSei(e.target.value)}
                placeholder="せい"
              />
              <input
                className={`${s.input} ${s.inputHalf}`}
                value={nameMei}
                onChange={(e) => setNameMei(e.target.value)}
                placeholder="めい"
              />
            </div>
            {(nameSei || nameMei) && (
              <p className={s.fieldNote}>ディスティニーナンバーの算出に使用します</p>
            )}
          </div>

          <button type="submit" className={s.diagnoseButton} disabled={!canDiagnose}>
            診断する
          </button>
        </div>
      </form>

      {/* エラー */}
      {error && <div className={s.errorBanner}>{error}</div>}

      {/* 結果 */}
      {result && (
        <div className={s.resultSection}>
          <h2 className={s.resultHeader}>診断結果</h2>

          {/* ポテンシャルタイプ */}
          <PotentialCard potential={result.potential} />

          {/* AI占い(事前生成レポートの読み込み。診断ごとに開き直す) */}
          <FriendAiFortuneSection
            key={`${result.potential.primaryType}-${result.zodiac}`}
            potentialType={result.potential.primaryType}
            zodiac={result.zodiac}
          />

          {/* 星座 */}
          <div className={s.card}>
            <div className={s.cardLabel}>星座</div>
            <div className={s.cardValue}>{ZODIAC_JA[result.zodiac]}</div>
          </div>

          {/* 気学 */}
          <div className={s.card}>
            <div className={s.cardLabel}>九星気学</div>
            <div className={s.cardValue}>{STAR_NAMES[result.honmeiStar]}</div>
            <div className={s.cardSub}>月命星: {STAR_NAMES[result.getsumeiStar]}</div>
          </div>

          {/* ライフパス */}
          <div className={s.card}>
            <div className={s.cardLabel}>ライフパスナンバー</div>
            <div className={s.cardValue}>
              {result.lifepath}
              {result.isMasterLifepath && <span className={s.masterBadge}>Master Number</span>}
            </div>
          </div>

          {/* ディスティニー */}
          {result.destiny !== null && (
            <div className={s.card}>
              <div className={s.cardLabel}>ディスティニーナンバー</div>
              <div className={s.cardValue}>
                {result.destiny}
                {result.isMasterDestiny && <span className={s.masterBadge}>Master Number</span>}
              </div>
            </div>
          )}

          <button type="button" className={s.resetButton} onClick={handleReset}>
            別の友達を診断する
          </button>
        </div>
      )}

      <p className={s.privacyNote}>
        入力されたデータはサーバーに送信されません。
        <br />
        すべての計算はこの端末内で完結しています。
        <br />
        AI占いも、タイプ×星座ごとに用意された文章を読み込むだけです。
      </p>
    </div>
  );
}

// ── AI占い(性質レポート・静的配信) ─────────────────────

// 表示する6項目の順序と見出し(マイタイプの AI占いと同一)。
const REPORT_ITEMS: ReadonlyArray<{ key: keyof PersonalityReport["items"]; label: string }> = [
  { key: "basicNature", label: "基本的な性質" },
  { key: "workStrength", label: "仕事上の強み" },
  { key: "workWeakness", label: "仕事上の弱み" },
  { key: "socialTendency", label: "人付き合いの傾向" },
  { key: "goodAt", label: "得意なこと" },
  { key: "badAt", label: "苦手なこと" },
];

/**
 * 友達診断の AI占いセクション。
 *
 * タイプ×星座で決まる 144 通りの事前生成レポートのうち、該当する 1 ファイルを
 * `/personality/<slug>.json` から読むだけ。入力値の送信も認証も伴わない。
 * 未生成(ファイルが無い)なら「準備中」を表示し、既存の診断結果表示は壊さない。
 */
function FriendAiFortuneSection({
  potentialType,
  zodiac,
}: {
  potentialType: PotentialTypeId;
  zodiac: ZodiacSign;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false); // 一度でも取得完了したか(未生成と未取得を区別)
  const [report, setReport] = useState<PersonalityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openAndFetch = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStaticPersonality(potentialType, zodiac);
      setReport(res);
      setLoaded(true);
    } catch {
      // 通信エラーのみここへ来る(未生成は null で「準備中」)
      setError("レポートを読み込めませんでした。通信状況を確認してください。");
    } finally {
      setLoading(false);
    }
  }, [potentialType, zodiac]);

  if (!open) {
    return (
      <button type="button" className={s.aiButton} onClick={openAndFetch}>
        AI占い
        <span className={s.aiButtonSub}>この友達の性質レポートを見る</span>
      </button>
    );
  }

  return (
    <div className={s.reportCard}>
      {loading ? (
        <div className={s.reportLoadingWrap}>
          <div className={s.spinner} />
          <p className={s.reportEmpty}>レポートを読み込んでいます…</p>
        </div>
      ) : report ? (
        <>
          <div className={s.reportBadge}>AI占い</div>
          <div className={s.reportTitle}>{report.typeName}</div>
          <div className={s.reportSubtitle}>{report.zodiacName}</div>

          {REPORT_ITEMS.map(({ key, label }) => {
            const text = report.items[key];
            if (!text) return null;
            return (
              <div key={key} className={s.reportItem}>
                <div className={s.reportItemLabel}>{label}</div>
                <p className={s.reportItemText}>{text}</p>
              </div>
            );
          })}
        </>
      ) : (
        <>
          {error ? (
            <p className={s.reportErrorText}>{error}</p>
          ) : loaded ? (
            <p className={s.reportEmpty}>
              このタイプの性質レポートは準備中です。
              <br />
              公開までしばらくお待ちください。
            </p>
          ) : null}
          <div className={s.reportRetryRow}>
            <button
              type="button"
              className={s.reportRetryButton}
              onClick={openAndFetch}
              disabled={loading}
            >
              再読み込み
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── ポテンシャルタイプカード ────────────────────────────────

function PotentialCard({
  potential,
}: {
  potential: FriendResult["potential"];
}) {
  const info = CHARACTER_MAP.get(potential.primaryType);
  const charName = info ? getCharacterName(potential.primaryType, "male") : null;

  return (
    <div className={s.mainCard}>
      <div className={s.mainCardLabel}>Potential Type</div>
      <img
        src={characterImagePath(potential.primaryType, "male")}
        alt={charName ?? potential.primaryType}
        style={{
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          objectFit: "cover",
          objectPosition: "top",
          marginBottom: "10px",
        }}
      />
      <div className={s.typeCodeLarge}>{potential.primaryType}</div>
      <div className={s.typeNameLarge}>{info?.typeName ?? potential.primaryType}</div>
      {charName && <div className={s.resultCharName}>{charName}</div>}
      {potential.secondaryType && (
        <div className={s.cardSub} style={{ marginTop: "8px" }}>
          ハイブリッド: {potential.secondaryType}
          {(() => {
            const secInfo = CHARACTER_MAP.get(potential.secondaryType);
            return secInfo ? ` (${secInfo.typeName})` : "";
          })()}
        </div>
      )}
    </div>
  );
}
