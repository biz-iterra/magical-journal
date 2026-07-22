import type { Direction8, DirectionFortune, MisfortuneType, StarNumber } from "@mj/engine";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { DirectionMap } from "../components/direction-map";
import * as s from "./TodayPage.css";

// ── 定数 ─────────────────────────────────────────────────

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

const DIR_ORDER: Direction8[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

type TabKey = "day" | "month" | "year";
const TAB_LABELS: Record<TabKey, string> = {
  day: "日盤",
  month: "月盤",
  year: "年盤",
};

// ── API レスポンス型 ────────────────────────────────────────

interface DirectionItem {
  direction: Direction8;
  star: StarNumber;
  fortune: DirectionFortune;
  misfortunes: MisfortuneType[];
}

interface TodayResponse {
  date: string;
  honmeiStar: StarNumber;
  getsumeiStar: StarNumber;
  homeLatLng: { lat: number; lng: number } | null;
  dayBan: {
    center: StarNumber;
    positions: Record<Direction8, StarNumber>;
  };
  directions: {
    day: DirectionItem[];
    month: DirectionItem[];
    year: DirectionItem[];
  };
  fortune: {
    text: string;
    directionsJson: unknown;
  } | null;
}

// ── ヘルパー ──────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const dow = weekdays[dt.getDay()] ?? "";
  return `${y}年${Number(m)}月${Number(d)}日（${dow}）`;
}

function fortuneStyle(fortune: DirectionFortune): string {
  switch (fortune) {
    case "great_fortune":
      return s.dirCellGreat;
    case "fortune":
      return s.dirCellFortune;
    case "misfortune":
      return s.dirCellMisfortune;
    default:
      return s.dirCellNeutral;
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

// ── コンポーネント ─────────────────────────────────────────

export function TodayPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("day");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<TodayResponse>("/api/today");
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

  if (!data) {
    return (
      <div className={s.emptyCard}>
        <p className={s.emptyText}>まだ登録されていません</p>
        <Link to="/register" className={s.registerLink}>
          プロフィールを登録する
        </Link>
      </div>
    );
  }

  const directions = data.directions[activeTab];

  return (
    <div className={s.container}>
      <div className={s.dateHeader}>{formatDate(data.date)}</div>
      <h1 className={s.pageTitle}>今日のジャーナル</h1>

      {/* 本命星・月命星 */}
      <div className={s.starRow}>
        <div className={s.starChip}>
          <div className={s.starChipLabel}>本命星</div>
          <div className={s.starChipValue}>{STAR_NAMES[data.honmeiStar]}</div>
        </div>
        <div className={s.starChip}>
          <div className={s.starChipLabel}>月命星</div>
          <div className={s.starChipValue}>{STAR_NAMES[data.getsumeiStar]}</div>
        </div>
      </div>

      {/* 運勢テキスト */}
      <div className={s.fortuneCard}>
        {data.fortune ? (
          <p className={s.fortuneText}>{data.fortune.text}</p>
        ) : (
          <p className={s.fortuneEmpty}>本日の運勢テキストはまだ生成されていません</p>
        )}
      </div>

      {/* 方位タブ切替 */}
      <div className={s.tabRow}>
        {(["day", "month", "year"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={`${s.tab} ${activeTab === key ? s.tabActive : ""}`}
            onClick={() => setActiveTab(key)}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {/* 中宮表示 */}
      {activeTab === "day" && (
        <div className={s.sectionTitle}>中宮: {STAR_NAMES[data.dayBan.center]}</div>
      )}

      {/* 方位グリッド */}
      <DirectionGrid directions={directions} />

      {/* 方位マップ */}
      {data.homeLatLng && (
        <div className={s.mapSection}>
          <DirectionMap center={data.homeLatLng} directions={directions} />
        </div>
      )}
    </div>
  );
}

// ── 方位グリッド ──────────────────────────────────────────

function DirectionGrid({ directions }: { directions: DirectionItem[] }) {
  const dirMap = new Map(directions.map((d) => [d.direction, d]));

  return (
    <div className={s.directionGrid}>
      {DIR_ORDER.map((dir) => {
        const item = dirMap.get(dir);
        if (!item) return null;

        const cellStyle = fortuneStyle(item.fortune);
        const goodLabel = fortuneLabel(item.fortune);

        return (
          <div key={dir} className={`${s.dirCell} ${cellStyle}`}>
            <span className={s.dirLabel}>{DIR_LABELS[dir]}</span>
            <span className={s.dirStar}>{STAR_NAMES[item.star]?.slice(0, 2)}</span>
            {goodLabel && <span className={s.dirBadgeGood}>{goodLabel}</span>}
            {item.misfortunes.length > 0 && (
              <span className={s.dirBadge}>
                {item.misfortunes.map((m) => MISFORTUNE_LABELS[m]?.slice(0, 3)).join("・")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
