import type { Direction8, DirectionFortune, MisfortuneType, StarNumber } from "@mj/engine";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type TabKey = "day" | "month" | "year" | "hour";
const TAB_LABELS: Record<TabKey, string> = {
  day: "日盤",
  month: "月盤",
  year: "年盤",
  hour: "時盤",
};

/** hourly が無い(旧 API)場合のタブ構成 */
const TABS_WITHOUT_HOUR: TabKey[] = ["day", "month", "year"];
const TABS_WITH_HOUR: TabKey[] = ["day", "month", "year", "hour"];

/** 空配列の共有インスタンス(毎レンダーで新しい配列を作ると地図が再描画される) */
const NO_DIRECTIONS: DirectionItem[] = [];

// ── API レスポンス型 ────────────────────────────────────────

interface DirectionItem {
  direction: Direction8;
  star: StarNumber;
  fortune: DirectionFortune;
  misfortunes: MisfortuneType[];
}

/** 時盤 1 刻ぶん(GET /api/today の hourly 要素) */
interface HourlyItem {
  /** 刻の番号 = 十二支番号(0=子刻 … 11=亥刻) */
  index: number;
  /** 表示ラベル(例: "1:00〜3:00")。時刻文字列は API の値をそのまま使う */
  label: string;
  startHour: number;
  endHour: number;
  center: StarNumber;
  directions: DirectionItem[];
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
  /** 時盤 12 刻(index 昇順)。旧 API と繋がった場合は undefined */
  hourly?: HourlyItem[];
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

/**
 * 現在時刻(端末のローカル時刻)が属する刻の index を返す。
 * 23 時台・0 時台 = 0(子刻)、1〜2 時 = 1、3〜4 時 = 2、… 21〜22 時 = 11。
 */
function currentKokuIndex(now: Date = new Date()): number {
  return Math.floor(((now.getHours() + 1) % 24) / 2);
}

/**
 * スライダーの表示順における刻の並び順キー。
 * 1:00〜3:00(index=1)を先頭にし、子刻(index=0 / 23:00〜1:00)を末尾に置く。
 */
function hourDisplayRank(index: number): number {
  return index === 0 ? 12 : index;
}

/** hourly を表示順(1,2,…,11,0)に並べ替える。API の index 昇順に依存しない。 */
function orderHourly(hourly: HourlyItem[]): HourlyItem[] {
  return [...hourly].sort((a, b) => hourDisplayRank(a.index) - hourDisplayRank(b.index));
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
  // 選択中の刻(API の index。0=子刻 … 11=亥刻)。初期値は現在時刻の刻。
  const [selectedKoku, setSelectedKoku] = useState<number>(() => currentKokuIndex());

  // 表示順(1:00〜3:00 → … → 23:00〜1:00)に並べ替えた 12 刻
  const hourlyOrdered = useMemo(() => orderHourly(data?.hourly ?? []), [data]);

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

  // hourly が無い/空(旧 API)なら時盤タブ自体を出さない。エラーにはしない。
  const hasHourly = hourlyOrdered.length > 0;
  const effectiveTab: TabKey = activeTab === "hour" && !hasHourly ? "day" : activeTab;

  // スライダー位置 = 表示順配列でのインデックス。
  // 現在時刻の刻が見つからなければ 1:00〜3:00(index=1)へフォールバック。
  const kokuPos = (() => {
    const pos = hourlyOrdered.findIndex((h) => h.index === selectedKoku);
    if (pos >= 0) return pos;
    const fallback = hourlyOrdered.findIndex((h) => h.index === 1);
    return fallback >= 0 ? fallback : 0;
  })();
  const selectedHour = hourlyOrdered[kokuPos] ?? null;

  const directions: DirectionItem[] =
    effectiveTab === "hour"
      ? (selectedHour?.directions ?? NO_DIRECTIONS)
      : data.directions[effectiveTab];
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
        {(hasHourly ? TABS_WITH_HOUR : TABS_WITHOUT_HOUR).map((key) => (
          <button
            key={key}
            type="button"
            className={`${s.tab} ${effectiveTab === key ? s.tabActive : ""}`}
            onClick={() => setActiveTab(key)}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {/* 時盤: 時間帯スライダー(時盤タブ選択時のみ) */}
      {effectiveTab === "hour" && selectedHour && (
        <HourSlider
          hours={hourlyOrdered}
          position={kokuPos}
          current={selectedHour}
          onChange={(item) => setSelectedKoku(item.index)}
        />
      )}

      {/* 中宮表示 */}
      {effectiveTab === "day" && (
        <div className={s.sectionTitle}>中宮: {STAR_NAMES[data.dayBan.center]}</div>
      )}
      {effectiveTab === "hour" && selectedHour && (
        <div className={s.sectionTitle}>中宮: {STAR_NAMES[selectedHour.center]}</div>
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

// ── 時盤: 時間帯スライダー ────────────────────────────────

/**
 * 12 刻を選ぶスライダー。
 *
 * - `hours` は表示順(1:00〜3:00 … 21:00〜23:00, 23:00〜1:00)に並んだ配列。
 *   スライダーの値 0..11 はこの配列の添字で、API の index とは一致しない。
 * - ラベルは API の `label` をそのまま表示する(時刻文字列を自前で組み立てない)。
 */
function HourSlider({
  hours,
  position,
  current,
  onChange,
}: {
  hours: HourlyItem[];
  position: number;
  current: HourlyItem;
  onChange: (item: HourlyItem) => void;
}) {
  const first = hours[0];
  const last = hours[hours.length - 1];

  return (
    <div className={s.hourPanel}>
      <div className={s.hourValue}>{current.label}</div>
      <input
        type="range"
        className={s.hourRange}
        min={0}
        max={hours.length - 1}
        step={1}
        value={position}
        aria-label="時間帯"
        aria-valuetext={current.label}
        onChange={(e) => {
          const next = hours[Number(e.target.value)];
          if (next) onChange(next);
        }}
      />
      <div className={s.hourScale}>
        <span>{first?.label}</span>
        <span>{last?.label}</span>
      </div>
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
