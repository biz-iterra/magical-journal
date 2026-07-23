import type { Direction8, DirectionFortune, MisfortuneType, StarNumber } from "@mj/engine";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { DirectionMap } from "../components/direction-map";
import * as s from "./MonthlyPage.css";

// ── 定数 ─────────────────────────────────────────────────
// TodayPage と同等の表示ヘルパー。月間ページは月盤のみを扱う。

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

// ── API レスポンス型 ────────────────────────────────────────

interface DirectionItem {
  direction: Direction8;
  star: StarNumber;
  fortune: DirectionFortune;
  misfortunes: MisfortuneType[];
}

interface MonthlyResponse {
  date: string;
  kigakuYear: number;
  kigakuMonth: number;
  honmeiStar: StarNumber;
  getsumeiStar: StarNumber;
  homeLatLng: { lat: number; lng: number } | null;
  monthBan: {
    center: StarNumber;
    positions: Record<Direction8, StarNumber>;
  };
  directions: {
    month: DirectionItem[];
  };
  fortune: {
    text: string;
    directionsJson: unknown;
  } | null;
}

// ── ヘルパー ──────────────────────────────────────────────

function formatKigakuMonth(year: number, month: number): string {
  return `${year}年 ${month}月（気学）`;
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

export function MonthlyPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<MonthlyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<MonthlyResponse>("/api/monthly");
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

  const directions = data.directions.month;

  return (
    <div className={s.container}>
      <div className={s.dateHeader}>{formatKigakuMonth(data.kigakuYear, data.kigakuMonth)}</div>
      <h1 className={s.pageTitle}>月間運勢</h1>
      <p className={s.kigakuNote}>
        気学の月は節入り(毎月おおむね上旬)を境に切り替わるため、暦の月とは境目がずれます。
      </p>

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
          <p className={s.fortuneEmpty}>今月の運勢はまだ生成されていません</p>
        )}
      </div>

      {/* 中宮表示(月盤) */}
      <div className={s.sectionTitle}>中宮: {STAR_NAMES[data.monthBan.center]}</div>

      {/* 方位グリッド(月盤) */}
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
