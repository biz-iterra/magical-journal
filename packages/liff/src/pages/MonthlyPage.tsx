import type { Direction8, DirectionFortune, MisfortuneType, StarNumber } from "@mj/engine";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { DirectionCompass } from "../components/direction-compass";
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

      {/* 方位盤(月盤。中宮は盤の中央に統合表示する) */}
      <DirectionCompass directions={directions} center={data.monthBan.center} />

      {/* 方位マップ */}
      {data.homeLatLng && (
        <div className={s.mapSection}>
          <DirectionMap center={data.homeLatLng} directions={directions} />
        </div>
      )}
    </div>
  );
}
