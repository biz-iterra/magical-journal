import type { Direction8, DirectionFortune, MisfortuneType, StarNumber } from "@mj/engine";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { useCharacterTheme } from "../components/CharacterTheme";
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
    // 後方互換: 従来の単一テキスト(= 運勢セクション相当)
    text: string;
    // 新: 3セクション。旧データ/パース不能なら null
    sections: {
      fortune: string;
      schedule: string;
      characterNote: string;
    } | null;
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
  const { ownCharacterName } = useCharacterTheme();
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
    // 初回アクセスはサーバー側で運勢を同期生成するため数秒〜十数秒かかりうる。
    // 固まって見えないよう、スピナー + 生成中である旨のメッセージを出す。
    return (
      <div className={s.loadingWrap}>
        <div className={s.spinner} />
        <p className={s.loadingText}>
          今日のジャーナルを準備しています…
          <br />
          初回は少し時間がかかることがあります
        </p>
      </div>
    );
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
  const sections = data.fortune?.sections ?? null;
  const charHeading = ownCharacterName ? `${ownCharacterName}からの一言` : "キャラクターからの一言";

  return (
    <div className={s.container}>
      <div className={s.dateHeader}>{formatDate(data.date)}</div>
      <h1 className={s.pageTitle}>今日のジャーナル</h1>

      {/* 1. 今日の運勢(3セクションの運勢 → 単一テキスト → 準備中 の順にフォールバック) */}
      <div className={s.fortuneCard}>
        <FortuneMain fortune={data.fortune} />
      </div>

      {/* 2. {キャラ名}からの一言(運勢の直下)。sections がある時のみ表示 */}
      {sections?.characterNote && (
        <div className={s.fortuneCard}>
          <div className={s.fortuneSectionTitle}>{charHeading}</div>
          <p className={s.fortuneCharBody}>{sections.characterNote}</p>
        </div>
      )}

      {/* 3. 方位マップ(盤タブ + 中宮 + 方位グリッド + 地図) */}
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

      {/* 方位マップ(地図) */}
      {data.homeLatLng && (
        <div className={s.mapSection}>
          <DirectionMap center={data.homeLatLng} directions={directions} />
        </div>
      )}

      {/* 4. 今日のスケジュール(方位マップの下)。sections がある時のみ表示 */}
      {sections?.schedule && (
        <div className={s.fortuneCard}>
          <div className={s.fortuneSectionTitle}>今日のスケジュール</div>
          <ScheduleList schedule={sections.schedule} />
        </div>
      )}
    </div>
  );
}

// ── 運勢本文(今日の運勢) ────────────────────────────────

/**
 * 「今日の運勢」ブロックの本文を表示する。
 *
 * 1. fortune.sections.fortune があれば 見出し「今日の運勢」+ 本文。
 * 2. sections が null で text があれば従来どおり単一テキスト(後方互換・見出しなし)。
 * 3. fortune 自体が null / 本文が空なら穏やかな「準備中」表示。
 *
 * ※ 一言・スケジュールは呼び出し側で別ブロックとして配置する。
 */
function FortuneMain({ fortune }: { fortune: TodayResponse["fortune"] }) {
  // 1. 3セクションの運勢
  if (fortune?.sections?.fortune) {
    return (
      <>
        <div className={s.fortuneSectionTitle}>今日の運勢</div>
        <p className={s.fortuneText}>{fortune.sections.fortune}</p>
      </>
    );
  }

  // 2. 後方互換: 単一テキスト(sections が無い場合)
  if (fortune && !fortune.sections && fortune.text) {
    return <p className={s.fortuneText}>{fortune.text}</p>;
  }

  // 3. 未生成/生成失敗/本文が空
  return (
    <p className={s.fortuneEmpty}>
      今日のジャーナルは準備中です。
      <br />
      しばらくしてからもう一度ご覧ください。
    </p>
  );
}

// ── 今日のスケジュール(複数行タイムライン) ───────────────

/**
 * schedule 文字列を \n で分割し、各行を独立した行として描画する。
 * 1つの塊のベタ表示にせず、タイムラインの各行が1行ずつ並ぶ。
 */
function ScheduleList({ schedule }: { schedule: string }) {
  const lines = schedule
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return (
    <div className={s.scheduleList}>
      {lines.map((line, i) => (
        <p key={`${i}-${line}`} className={s.scheduleLine}>
          {line}
        </p>
      ))}
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
