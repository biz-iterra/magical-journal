import { CHARACTER_MAP, getCharacterName } from "@mj/engine";
import type { PotentialTypeId } from "@mj/engine";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
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

// ── resultJson 内の型 ────────────────────────────────────

interface PotentialSingle {
  value: number;
  typeName: string;
  potentialSign: string;
  typeCode: PotentialTypeId;
}

interface PotentialHybrid {
  primary: PotentialSingle;
  secondary: PotentialSingle;
}

interface ZodiacResult {
  sign: string;
}

interface KigakuResult {
  honmeiStar: number;
  getsumeiStar: number;
}

interface NumerologyResult {
  lifePathNumber?: number;
  destinyNumber?: number;
  isMasterNumber: boolean;
}

// ── ヘルパー ─────────────────────────────────────────────

function isPotentialHybrid(data: unknown): data is PotentialHybrid {
  return typeof data === "object" && data !== null && "primary" in data && "secondary" in data;
}

function isPotentialSingle(data: unknown): data is PotentialSingle {
  return typeof data === "object" && data !== null && "typeCode" in data && !("primary" in data);
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

      {/* 星座 */}
      {zodiac && <ZodiacSection data={zodiac.result as ZodiacResult} />}

      {/* 気学プロファイル */}
      {kigaku && <KigakuSection data={kigaku.result as KigakuResult} />}

      {/* ライフパスナンバー */}
      {lifepath && (
        <NumerologySection
          label="ライフパスナンバー"
          data={lifepath.result as NumerologyResult}
          numberKey="lifePathNumber"
        />
      )}

      {/* ディスティニーナンバー */}
      {destiny && (
        <NumerologySection
          label="ディスティニーナンバー"
          data={destiny.result as NumerologyResult}
          numberKey="destinyNumber"
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

// ── ポテンシャルタイプセクション ──────────────────────────

function PotentialSection({
  data,
  charStyle,
}: {
  data: unknown;
  charStyle: "male" | "female";
}) {
  if (isPotentialHybrid(data)) {
    return (
      <HybridDisplay primary={data.primary} secondary={data.secondary} charStyle={charStyle} />
    );
  }

  if (isPotentialSingle(data)) {
    return <SingleDisplay type={data} charStyle={charStyle} />;
  }

  return null;
}

function SingleDisplay({
  type,
  charStyle,
}: {
  type: PotentialSingle;
  charStyle: "male" | "female";
}) {
  const charInfo = CHARACTER_MAP.get(type.typeCode);
  const charName = charInfo ? getCharacterName(type.typeCode, charStyle) : null;

  return (
    <div className={s.mainCard}>
      <div className={s.mainCardLabel}>Potential Type</div>
      <div className={s.charPlaceholder}>CHAR</div>
      <div className={s.typeCodeLarge}>{type.typeCode}</div>
      <div className={s.typeNameLarge}>{charInfo?.typeName ?? type.typeName}</div>
      {charName && <div className={s.characterName}>{charName}</div>}
    </div>
  );
}

function HybridDisplay({
  primary,
  secondary,
  charStyle,
}: {
  primary: PotentialSingle;
  secondary: PotentialSingle;
  charStyle: "male" | "female";
}) {
  const primaryInfo = CHARACTER_MAP.get(primary.typeCode);
  const secondaryInfo = CHARACTER_MAP.get(secondary.typeCode);
  const primaryCharName = primaryInfo ? getCharacterName(primary.typeCode, charStyle) : null;
  const secondaryCharName = secondaryInfo ? getCharacterName(secondary.typeCode, charStyle) : null;

  return (
    <div className={s.hybridRow}>
      {/* 主タイプ(大) */}
      <div className={s.hybridPrimary}>
        <div className={s.hybridLabel}>Primary</div>
        <div className={s.charPlaceholder}>CHAR</div>
        <div className={s.typeCodeLarge}>{primary.typeCode}</div>
        <div className={s.typeNameLarge}>{primaryInfo?.typeName ?? primary.typeName}</div>
        {primaryCharName && <div className={s.characterName}>{primaryCharName}</div>}
      </div>
      {/* 副タイプ(小) */}
      <div className={s.hybridSecondary}>
        <div className={s.hybridLabel}>Secondary</div>
        <div className={s.charPlaceholderSmall}>CHAR</div>
        <div className={s.hybridCodeSmall}>{secondary.typeCode}</div>
        <div className={s.hybridNameSmall}>{secondaryInfo?.typeName ?? secondary.typeName}</div>
        {secondaryCharName && (
          <div style={{ fontSize: "11px", color: "#6366f1", marginTop: "4px" }}>
            {secondaryCharName}
          </div>
        )}
      </div>
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

function NumerologySection({
  label,
  data,
  numberKey,
}: {
  label: string;
  data: NumerologyResult;
  numberKey: "lifePathNumber" | "destinyNumber";
}) {
  const num = data[numberKey];
  if (num == null) return null;

  return (
    <div className={s.card}>
      <div className={s.cardLabel}>{label}</div>
      <div className={s.cardValue}>
        {num}
        {data.isMasterNumber && <span className={s.masterBadge}>Master Number</span>}
      </div>
    </div>
  );
}
