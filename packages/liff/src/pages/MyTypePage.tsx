import { CHARACTER_MAP, getCharacterName } from "@mj/engine";
import type { PotentialTypeId } from "@mj/engine";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import {
  type PersonalityReport,
  getPersonality,
  regeneratePersonality,
} from "../services/personality";
import { characterImagePath } from "../utils/character-assets";
import * as s from "./MyTypePage.css";

// ── 定数マッピング ────────────────────────────────────────

const ZODIAC_JA: Record<string, string> = {
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

// ── API レスポンス型 ─────────────────────────────────────

interface DiagnosisResult {
  moduleId: string;
  moduleVersion: number;
  result: unknown;
  computedAt: string;
}

interface ProfileResponse {
  profile: {
    charStyle: "male" | "female";
  };
  diagnosis: DiagnosisResult[];
}

// ── resultJson 内の型(engine モジュールの出力形状と一致させる) ──

interface PotentialResult {
  primaryType: PotentialTypeId;
  secondaryType?: PotentialTypeId;
  rawValue: number;
}

interface ZodiacResult {
  sign: string;
}

interface KigakuResult {
  honmeiStar: number;
  getsumeiStar: number;
}

interface LifepathResult {
  lifepath: number;
}

interface DestinyResult {
  destiny: number;
  romaji: string;
}

// ── ヘルパー ─────────────────────────────────────────────

const MASTER_NUMBERS = [11, 22, 33];

function isPotentialResult(data: unknown): data is PotentialResult {
  return typeof data === "object" && data !== null && "primaryType" in data;
}

// ── コンポーネント ────────────────────────────────────────

/**
 * マイタイプ詳細画面
 *
 * enabled モジュールの診断結果をカード形式でセクション表示する。
 * ハイブリッドの場合は主キャラ大 + 副キャラ小で表示する。
 */
export function MyTypePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ProfileResponse>("/api/profile");
      setData(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        navigate("/register", { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className={s.loadingWrap}>読み込み中...</div>;
  }

  if (error) {
    return (
      <div className={s.errorWrap}>
        <p className={s.errorText}>{error}</p>
        <button type="button" className={s.retryButton} onClick={fetchData}>
          再試行
        </button>
      </div>
    );
  }

  if (!data) return null;

  const results = data.diagnosis;
  const charStyle = data.profile.charStyle ?? "male";

  // moduleId でルックアップ
  const findResult = (id: string) => results.find((r) => r.moduleId === id);

  const potential = findResult("potential");
  const zodiac = findResult("zodiac");
  const kigaku = findResult("kigaku_profile");
  const lifepath = findResult("numerology_lifepath");
  const destiny = findResult("numerology_destiny");

  return (
    <div className={s.container}>
      <h1 className={s.pageTitle}>マイタイプ</h1>

      {/* ポテンシャルタイプ */}
      {potential && <PotentialSection data={potential.result} charStyle={charStyle} />}

      {/* AI占い(性質レポート) */}
      <AiFortuneSection />

      {/* 星座 */}
      {zodiac && <ZodiacSection data={zodiac.result as ZodiacResult} />}

      {/* 気学プロファイル */}
      {kigaku && <KigakuSection data={kigaku.result as KigakuResult} />}

      {/* ライフパスナンバー */}
      {lifepath && (
        <NumerologySection
          label="ライフパスナンバー"
          value={(lifepath.result as LifepathResult).lifepath}
        />
      )}

      {/* ディスティニーナンバー */}
      {destiny && (
        <NumerologySection
          label="ディスティニーナンバー"
          value={(destiny.result as DestinyResult).destiny}
        />
      )}

      {/* 結果がゼロの場合 */}
      {results.length === 0 && (
        <div className={s.card}>
          <p className={s.cardSub}>診断結果がまだありません。しばらくお待ちください。</p>
        </div>
      )}
    </div>
  );
}

// ── AI占い(性質レポート)セクション ──────────────────────

// 表示する6項目の順序と見出し(この順・この見出しで固定)。
const REPORT_ITEMS: ReadonlyArray<{ key: keyof PersonalityReport["items"]; label: string }> = [
  { key: "basicNature", label: "基本的な性質" },
  { key: "workStrength", label: "仕事上の強み" },
  { key: "workWeakness", label: "仕事上の弱み" },
  { key: "socialTendency", label: "人付き合いの傾向" },
  { key: "goodAt", label: "得意なこと" },
  { key: "badAt", label: "苦手なこと" },
];

/**
 * AI占い(性質レポート)セクション。
 *
 * - 主動線: 「AI占い」ボタンで事前生成済みレポート(GET /api/personality)を表示する。
 * - 未生成(report=null)なら「準備中」を表示する。
 * - 副次: レポート内の「再生成」ボタン(β品質テスト用)で POST /api/personality/regenerate。
 *   レート制限超過は 429 + MJ-PERS-429 →「メッセージ(コード)」形式で表示する。
 */
function AiFortuneSection() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false); // 一度でも取得完了したか(null=準備中 と未取得を区別)
  const [report, setReport] = useState<PersonalityReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const openAndFetch = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await getPersonality();
      setReport(res);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "レポートの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  const regenerate = useCallback(async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await regeneratePersonality();
      setReport(res);
      setLoaded(true);
    } catch (err) {
      // ApiError の message は「メッセージ(コード)」形式に整形済み(例: MJ-PERS-429)。
      setError(err instanceof Error ? err.message : "再生成に失敗しました");
    } finally {
      setRegenerating(false);
    }
  }, []);

  // 未展開: 主動線ボタンのみ
  if (!open) {
    return (
      <button type="button" className={s.aiButton} onClick={openAndFetch}>
        AI占い
        <span className={s.aiButtonSub}>あなたの性質レポートを見る</span>
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
          <div className={s.reportHeaderRow}>
            <div>
              <div className={s.reportBadge}>AI占い</div>
              <div className={s.reportTitle}>{report.typeName}</div>
              <div className={s.reportSubtitle}>{report.zodiacName}</div>
            </div>
          </div>

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

          {/* 再生成(β品質テスト用の副次操作) */}
          <div className={s.regenRow}>
            {error && <p className={s.reportErrorText}>{error}</p>}
            <button
              type="button"
              className={s.regenButton}
              onClick={regenerate}
              disabled={regenerating}
            >
              {regenerating && <span className={s.spinnerSmall} />}
              {regenerating ? "再生成中…" : "再生成(テスト用)"}
            </button>
            <p className={s.regenNote}>β版の品質テスト用です(1日5回まで)</p>
          </div>
        </>
      ) : (
        // report=null: 準備中、または取得エラー
        <>
          {error ? (
            <p className={s.reportErrorText}>{error}</p>
          ) : loaded ? (
            <p className={s.reportEmpty}>
              性質レポートは準備中です。
              <br />
              登録直後は生成中の場合があります。しばらくしてからお試しください。
            </p>
          ) : null}
          <div className={s.regenRow}>
            <button
              type="button"
              className={s.regenButton}
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

// ── ポテンシャルタイプセクション ──────────────────────────

function PotentialSection({
  data,
  charStyle,
}: {
  data: unknown;
  charStyle: "male" | "female";
}) {
  if (!isPotentialResult(data)) return null;

  if (data.secondaryType) {
    return (
      <HybridDisplay
        primary={data.primaryType}
        secondary={data.secondaryType}
        charStyle={charStyle}
      />
    );
  }

  return <SingleDisplay typeId={data.primaryType} charStyle={charStyle} />;
}

function SingleDisplay({
  typeId,
  charStyle,
}: {
  typeId: PotentialTypeId;
  charStyle: "male" | "female";
}) {
  const charInfo = CHARACTER_MAP.get(typeId);
  const charName = charInfo ? getCharacterName(typeId, charStyle) : null;

  return (
    <div className={s.mainCard}>
      <div className={s.mainCardLabel}>Potential Type</div>
      <img
        className={s.charImage}
        src={characterImagePath(typeId, charStyle)}
        alt={charName ?? typeId}
      />
      <div className={s.typeCodeLarge}>{typeId}</div>
      <div className={s.typeNameLarge}>{charInfo?.typeName ?? typeId}</div>
      {charName && <div className={s.characterName}>{charName}</div>}
    </div>
  );
}

function HybridDisplay({
  primary,
  secondary,
  charStyle,
}: {
  primary: PotentialTypeId;
  secondary: PotentialTypeId;
  charStyle: "male" | "female";
}) {
  const primaryInfo = CHARACTER_MAP.get(primary);
  const secondaryInfo = CHARACTER_MAP.get(secondary);
  const primaryCharName = primaryInfo ? getCharacterName(primary, charStyle) : null;
  const secondaryCharName = secondaryInfo ? getCharacterName(secondary, charStyle) : null;

  return (
    <div className={s.mainCard}>
      <div className={s.mainCardLabel}>Potential Type</div>

      {/* 主タイプ(大) — 主役。単一表示と同じヒーロー体裁 */}
      <div className={s.hybridPrimary}>
        <img
          className={s.charImage}
          src={characterImagePath(primary, charStyle)}
          alt={primaryCharName ?? primary}
        />
        <div className={s.typeCodeLarge}>{primary}</div>
        <div className={s.typeNameLarge}>{primaryInfo?.typeName ?? primary}</div>
        {primaryCharName && <div className={s.characterName}>{primaryCharName}</div>}
      </div>

      {/* 副タイプ(小) — 従属。沈めたインセット面 */}
      <div className={s.hybridSecondary}>
        <div className={s.hybridSecondaryLabel}>併せ持つタイプ</div>
        <div className={s.hybridSecondaryRow}>
          <img
            className={s.charImageSmall}
            src={characterImagePath(secondary, charStyle)}
            alt={secondaryCharName ?? secondary}
          />
          <div className={s.hybridSecondaryText}>
            <div className={s.hybridCodeSmall}>{secondary}</div>
            <div className={s.hybridNameSmall}>{secondaryInfo?.typeName ?? secondary}</div>
            {secondaryCharName && <div className={s.hybridCharName}>{secondaryCharName}</div>}
          </div>
        </div>
      </div>

      {/* ハイブリッドの意味付け(固定コピー・LLM 不使用) */}
      <p className={s.hybridNote}>
        生まれた時刻が日の変わり目に近いため、2つのタイプの性質を併せ持ちます。
      </p>
    </div>
  );
}

// ── 星座セクション ────────────────────────────────────────

function ZodiacSection({ data }: { data: ZodiacResult }) {
  const name = ZODIAC_JA[data.sign] ?? data.sign;
  return (
    <div className={s.card}>
      <div className={s.cardLabel}>星座</div>
      <div className={s.cardValue}>{name}</div>
    </div>
  );
}

// ── 気学セクション ────────────────────────────────────────

function KigakuSection({ data }: { data: KigakuResult }) {
  const honmei = STAR_NAMES[data.honmeiStar] ?? `${data.honmeiStar}`;
  const getsumei = STAR_NAMES[data.getsumeiStar] ?? `${data.getsumeiStar}`;
  return (
    <div className={s.card}>
      <div className={s.cardLabel}>九星気学</div>
      <div className={s.cardValue}>{honmei}</div>
      <div className={s.cardSub}>月命星: {getsumei}</div>
    </div>
  );
}

// ── 数秘術セクション ─────────────────────────────────────

function NumerologySection({ label, value }: { label: string; value: number }) {
  return (
    <div className={s.card}>
      <div className={s.cardLabel}>{label}</div>
      <div className={s.cardValue}>
        {value}
        {MASTER_NUMBERS.includes(value) && <span className={s.masterBadge}>Master Number</span>}
      </div>
    </div>
  );
}
