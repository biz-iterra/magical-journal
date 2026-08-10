import { MasterCalendarProvider } from "@mj/calendar-data";
import type {
  Direction8,
  DirectionFortune,
  MisfortuneType,
  PotentialTypeId,
  StarNumber,
} from "@mj/engine";
import { judgeDirections } from "@mj/engine";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { useCharacterTheme } from "../components/CharacterTheme";
import { DirectionCompass } from "../components/direction-compass";
import { DirectionMap } from "../components/direction-map";
import { characterMotif } from "../utils/character-assets";
import * as s from "./TodayPage.css";

// ── 定数 ─────────────────────────────────────────────────

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

/**
 * 暦マスタが持つ日付の範囲(節入りデータの収録年)。
 * この外を選ぶと盤を算出できないため、日付入力の min/max で選択自体を防ぐ。
 */
const CALENDAR_MIN_DATE = "1920-01-01";
const CALENDAR_MAX_DATE = "2050-12-31";

// ── API レスポンス型 ────────────────────────────────────────

interface DirectionItem {
  direction: Direction8;
  star: StarNumber;
  fortune: DirectionFortune;
  // engine の DirectionResult と揃える(日付切替時はその戻り値をそのまま使うため)
  misfortunes: readonly MisfortuneType[];
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
  /**
   * 今月の月運(v0.6 で月間ページから集約)。オブジェクト自体は必ず返る。
   * text が null のときはサーバーが裏で生成を開始しており、次回アクセスで表示される。
   * 旧 API と繋がった場合は undefined。
   */
  monthly?: {
    kigakuYear: number;
    /** 気学月(節入り基準)。カレンダー月とはずれる */
    kigakuMonth: number;
    text: string | null;
  };
}

// ── ヘルパー ──────────────────────────────────────────────

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** "YYYY-MM-DD" を W-1 ヘッダー用の表示要素に分解する。 */
function formatHeaderDate(dateStr: string): { big: string; meta: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const year = y ?? 0;
  const dt = new Date(year, (m ?? 1) - 1, d ?? 1);
  const dow = WEEKDAYS[dt.getDay()] ?? "";
  // 和暦は令和(2019-05-01〜)のみ扱い、範囲外は西暦のまま表示する
  const era = year >= 2019 ? `令和${year - 2018}年` : `${year}年`;
  return { big: `${m}.${d}`, meta: `${era} ・ ${dow}曜` };
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

/** "YYYY-MM-DD" を年・月・日に分解する */
function parseDateParts(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y: y ?? 0, m: m ?? 1, d: d ?? 1 };
}

/** その年月の日数(当月内で日を切り替える範囲) */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 年・月・日から "YYYY-MM-DD" を組み立てる */
function toDateStr(y: number, m: number, d: number): string {
  return `${String(y)}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ── コンポーネント ─────────────────────────────────────────

export function TodayPage() {
  const navigate = useNavigate();
  const { ownCharacterName, themeType } = useCharacterTheme();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("day");
  // 選択中の刻(API の index。0=子刻 … 11=亥刻)。初期値は現在時刻の刻。
  const [selectedKoku, setSelectedKoku] = useState<number>(() => currentKokuIndex());
  // 日盤で見ている日付 "YYYY-MM-DD"。null = 今日(API の値をそのまま使う)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // 月盤で見ている気学年・気学月。null = 今月(API の値をそのまま使う)
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);

  // 暦マスタ。任意の日付・年月の盤をこの場で算出するために使う
  // (engine はブラウザでも動く設計。通信せずに切り替えられる)
  const calendar = useMemo(() => new MasterCalendarProvider(), []);

  // 表示順(1:00〜3:00 → … → 23:00〜1:00)に並べ替えた 12 刻
  const hourlyOrdered = useMemo(() => orderHourly(data?.hourly ?? []), [data]);

  // hourly が無い/空(旧 API)なら時盤タブ自体を出さない。エラーにはしない。
  const hasHourly = hourlyOrdered.length > 0;
  const effectiveTab: TabKey = activeTab === "hour" && !hasHourly ? "day" : activeTab;

  /**
   * 日盤・月盤で「今日以外」を選んでいるときの盤と方位。
   * 暦マスタ + engine でこの場で算出する(サーバーと同じ計算・同じマスタなので
   * 今日を選べば API の値と一致する)。今日・今月なら null を返し、API の値を使う。
   *
   * ★Hooks はすべて早期 return より前で呼ぶ(条件付き呼び出しにしない)。
   */
  const computed = useMemo(() => {
    if (!data) return null;

    // 暦マスタの範囲外を選ぶと暦の取得が例外になる。画面を壊さずメッセージにする。
    try {
      if (effectiveTab === "day" && selectedDate != null) {
        const ban = calendar.getDayBan(selectedDate);
        const junishi = calendar.getDayJunishi(selectedDate);
        return {
          directions: judgeDirections(ban, data.honmeiStar, data.getsumeiStar, junishi),
          center: ban.center,
          outOfRange: false,
        };
      }

      if (effectiveTab === "month" && selectedMonth != null) {
        const ban = calendar.getMonthBan(selectedMonth.year, selectedMonth.month);
        const junishi = calendar.getMonthJunishi(selectedMonth.year, selectedMonth.month);
        return {
          directions: judgeDirections(ban, data.honmeiStar, data.getsumeiStar, junishi),
          center: ban.center,
          outOfRange: false,
        };
      }
    } catch {
      // 暦データが無い期間。方位は出せないので、その旨だけ返す
      return { directions: NO_DIRECTIONS, center: null, outOfRange: true };
    }

    return null;
  }, [data, effectiveTab, selectedDate, selectedMonth, calendar]);

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

  // スライダー位置 = 表示順配列でのインデックス。
  // 現在時刻の刻が見つからなければ 1:00〜3:00(index=1)へフォールバック。
  const kokuPos = (() => {
    const pos = hourlyOrdered.findIndex((h) => h.index === selectedKoku);
    if (pos >= 0) return pos;
    const fallback = hourlyOrdered.findIndex((h) => h.index === 1);
    return fallback >= 0 ? fallback : 0;
  })();
  const selectedHour = hourlyOrdered[kokuPos] ?? null;

  // 日盤・月盤は見る日付/年月を切り替えられる。今日・今月なら API の値をそのまま使い、
  // それ以外は暦マスタ + engine でこの場で算出する(サーバーと同じ計算・同じマスタ)。
  const today = parseDateParts(data.date);
  const viewedDate = selectedDate ?? data.date;
  const viewedMonth = selectedMonth ?? {
    year: data.monthly?.kigakuYear ?? today.y,
    month: data.monthly?.kigakuMonth ?? today.m,
  };

  const directions: DirectionItem[] =
    computed?.directions ??
    (effectiveTab === "hour"
      ? (selectedHour?.directions ?? NO_DIRECTIONS)
      : data.directions[effectiveTab]);

  // 中宮の星。API 応答が中宮を持つのは日盤と時盤のみだが、
  // 日付/年月を切り替えたときは算出した盤の中宮を使う。
  const banCenter: StarNumber | null =
    computed?.center ??
    (effectiveTab === "day"
      ? data.dayBan.center
      : effectiveTab === "hour"
        ? (selectedHour?.center ?? null)
        : null);

  const sections = data.fortune?.sections ?? null;
  const charHeading = ownCharacterName ? `${ownCharacterName}からの一言` : "キャラクターからの一言";

  return (
    <div className={s.container}>
      {/* W-1「気配のヘッダー」: キャラ色の wash + 明朝の大日付 + 小さなキャラ章 */}
      <TodayHeader date={data.date} typeId={themeType} characterName={ownCharacterName} />

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

      {/* 日盤: 任意の年月日を選んで切り替える */}
      {effectiveTab === "day" && (
        <DayPicker
          date={viewedDate}
          todayDate={data.date}
          onChange={(d) => setSelectedDate(d === data.date ? null : d)}
        />
      )}

      {/* 月盤: 気学の年月を指定して切り替える */}
      {effectiveTab === "month" && (
        <MonthPicker
          year={viewedMonth.year}
          month={viewedMonth.month}
          currentYear={data.monthly?.kigakuYear ?? today.y}
          currentMonth={data.monthly?.kigakuMonth ?? today.m}
          onChange={(year, month) => {
            const isCurrent =
              year === (data.monthly?.kigakuYear ?? today.y) &&
              month === (data.monthly?.kigakuMonth ?? today.m);
            setSelectedMonth(isCurrent ? null : { year, month });
          }}
        />
      )}

      {/* 時盤: 時間帯スライダー(時盤タブ選択時のみ) */}
      {effectiveTab === "hour" && selectedHour && (
        <HourSlider
          hours={hourlyOrdered}
          position={kokuPos}
          current={selectedHour}
          onChange={(item) => setSelectedKoku(item.index)}
        />
      )}

      {/* 暦データを持たない期間を選んだとき(方位は出せない) */}
      {computed?.outOfRange && (
        <div className={s.fortuneCard}>
          <p className={s.fortuneEmpty}>
            この日付の暦データがありません。別の日付を選んでください。
          </p>
        </div>
      )}

      {/* 方位盤(羅針盤。中宮は盤の中央に統合表示する) */}
      <DirectionCompass
        directions={directions}
        center={banCenter}
        interactive
        banLabel={TAB_LABELS[effectiveTab]}
      />

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

      {/* 5. 今月の運勢(v0.6 で月間ページから集約。今日の話の後に置く) */}
      {data.monthly && <MonthlyFortune monthly={data.monthly} />}
    </div>
  );
}

// ── W-1「気配のヘッダー」(シグネチャ) ─────────────────────

/**
 * 今日のページ上端のヘッダー。
 *
 * デザイン計画書 §4「案 W-1 気配のヘッダー」の実装。キャラ色の wash を上端から
 * 下へ落とし、その中に明朝の大日付を置く。キャラ本体は描かず、右上の小さな
 * 円形マーク(モチーフ 1 文字)だけで気配を示す。
 *
 * ※ 計画書のワイヤーにある二十四節気チップは、API が節気を返さないため出さない
 *   (計画書自身が「データ供給が無ければ W-1 単独で進める」としている)。
 */
function TodayHeader({
  date,
  typeId,
  characterName,
}: {
  date: string;
  typeId: PotentialTypeId | null;
  characterName: string | null;
}) {
  const { big, meta } = formatHeaderDate(date);
  return (
    <header className={s.header}>
      <div className={s.headerTexture} />
      <div className={s.headerInner}>
        <div>
          <div className={s.headerDate} data-num>
            {big}
          </div>
          <div className={s.headerMeta}>{meta}</div>
          <h1 className={s.headerTitle}>今日のジャーナル</h1>
        </div>
        {typeId && (
          <div className={s.headerMark}>
            <span className={s.headerMarkCircle} aria-hidden="true">
              {characterMotif(typeId)}
            </span>
            {characterName && <span className={s.headerMarkName}>{characterName}</span>}
          </div>
        )}
      </div>
    </header>
  );
}

// ── 盤を見る日付・年月の切り替え ──────────────────────────

/**
 * 日盤で見る日を当月内で切り替える。
 * 前後の矢印で1日ずつ動かし、当月の範囲外へは進めない。
 */
function DayPicker({
  date,
  todayDate,
  onChange,
}: {
  /** 表示中の日付 "YYYY-MM-DD" */
  date: string;
  /** 今日の日付 "YYYY-MM-DD" */
  todayDate: string;
  onChange: (date: string) => void;
}) {
  const p = parseDateParts(date);
  const isToday = date === todayDate;

  // 前後の日へ(月・年をまたいで移動できる)
  const shift = (delta: number) => {
    const d = new Date(p.y, p.m - 1, p.d + delta);
    onChange(toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  };

  return (
    <div className={s.pickerRow}>
      <button
        type="button"
        className={s.pickerArrow}
        aria-label="前の日"
        disabled={date <= CALENDAR_MIN_DATE}
        onClick={() => shift(-1)}
      >
        ◀
      </button>
      <div className={s.pickerValue}>
        {/* 日付そのものを直接選べる(モバイルではネイティブの日付ピッカーが開く) */}
        <input
          type="date"
          aria-label="日盤を見る日付"
          className={s.pickerDate}
          value={date}
          min={CALENDAR_MIN_DATE}
          max={CALENDAR_MAX_DATE}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
        />
        {isToday && <span className={s.pickerBadge}>今日</span>}
      </div>
      <button
        type="button"
        className={s.pickerArrow}
        aria-label="次の日"
        disabled={date >= CALENDAR_MAX_DATE}
        onClick={() => shift(1)}
      >
        ▶
      </button>
      {!isToday && (
        <button type="button" className={s.pickerReset} onClick={() => onChange(todayDate)}>
          今日に戻す
        </button>
      )}
    </div>
  );
}

/**
 * 月盤で見る年月を切り替える。
 * 気学の月は節入り基準でカレンダー月とずれるため、その旨をラベルで示す。
 */
function MonthPicker({
  year,
  month,
  currentYear,
  currentMonth,
  onChange,
}: {
  year: number;
  month: number;
  currentYear: number;
  currentMonth: number;
  onChange: (year: number, month: number) => void;
}) {
  // 暦マスタの範囲内で前後数年を選べるようにする
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const isCurrent = year === currentYear && month === currentMonth;
  return (
    <div className={s.pickerRow}>
      <select
        aria-label="年"
        className={s.pickerSelect}
        value={String(year)}
        onChange={(e) => onChange(Number(e.target.value), month)}
      >
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}年
          </option>
        ))}
      </select>
      <select
        aria-label="月"
        className={s.pickerSelect}
        value={String(month)}
        onChange={(e) => onChange(year, Number(e.target.value))}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={String(m)}>
            {m}月
          </option>
        ))}
      </select>
      {isCurrent ? (
        <span className={s.pickerBadge}>今月</span>
      ) : (
        <button
          type="button"
          className={s.pickerReset}
          onClick={() => onChange(currentYear, currentMonth)}
        >
          今月に戻す
        </button>
      )}
    </div>
  );
}

// ── 今月の運勢(月間ページから集約) ──────────────────────

/**
 * 今月の月運を表示する。
 * text が null のときはサーバーが裏で生成を開始しているので、次回アクセスで出る旨を案内する。
 */
function MonthlyFortune({ monthly }: { monthly: NonNullable<TodayResponse["monthly"]> }) {
  return (
    <div className={s.fortuneCard}>
      <div className={s.fortuneSectionTitle}>今月の運勢</div>
      {/* 気学月は節入り基準でカレンダー月とずれるため、その旨が伝わる表記にする */}
      <div className={s.monthlyMeta}>{monthly.kigakuMonth}月（気学の月）</div>
      {monthly.text ? (
        <p className={s.fortuneText}>{monthly.text}</p>
      ) : (
        <p className={s.fortuneEmpty}>
          今月の運勢は準備中です。しばらくしてから開き直すと表示されます。
        </p>
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
        {/* 運勢文はキャラの語り。明朝・行間ゆったりで「ゆっくり読ませる」 */}
        <p className={s.fortuneLead}>{fortune.sections.fortune}</p>
      </>
    );
  }

  // 2. 後方互換: 単一テキスト(sections が無い場合)
  if (fortune && !fortune.sections && fortune.text) {
    return <p className={s.fortuneLead}>{fortune.text}</p>;
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
