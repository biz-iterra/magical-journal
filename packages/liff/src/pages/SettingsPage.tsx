import { computePotential, getCharacterName } from "@mj/engine";
import type { PotentialTypeId } from "@mj/engine";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { PlaceSearchField } from "../components/PlaceSearchField";
import { PostalCodeField } from "../components/PostalCodeField";
import { clientError } from "../errors";
import { geocodeAddress } from "../services/geocode";
import type { FavoritePlace, PreferencesPatch, TransportMode } from "../services/preferences";
import {
  addFavoritePlace,
  deleteFavoritePlace,
  getPreferences,
  updatePreferences,
} from "../services/preferences";
import { characterImagePath } from "../utils/character-assets";
import * as s from "./SettingsPage.css";

// ── API 型 ────────────────────────────────────────────────

interface ProfileResponse {
  profile: {
    birthDate: string;
    birthTime: string | null;
    nameKana: string | null;
    nameRomaji: string | null;
    addressText: string | null;
    lat: number | null;
    lng: number | null;
    charStyle: "male" | "female";
  };
}

interface UpdatePayload {
  birthTime?: string;
  addressText?: string;
  lat?: number;
  lng?: number;
  charStyle?: "male" | "female";
}

// ── 定数 ──────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const pad2 = (n: number) => String(n).padStart(2, "0");

/** 活動時間帯は 5 分刻みで十分(出生時刻のような分単位の精度は不要) */
const PREF_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const TRANSPORT_OPTIONS: ReadonlyArray<{ value: TransportMode; label: string }> = [
  { value: "walk", label: "徒歩" },
  { value: "bike", label: "自転車" },
  { value: "train", label: "電車" },
  { value: "car", label: "車" },
];

/** 曜日番号は日曜=0 〜 土曜=6(API と同じ) */
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** "HH:MM" を時/分の文字列に分解する(未設定なら空文字) */
function splitTime(time: string | null): { h: string; m: string } {
  if (!time) return { h: "", m: "" };
  const [h, m] = time.split(":");
  return { h: String(Number(h)), m: String(Number(m)) };
}

/** 時/分の選択値から "HH:MM" を組み立てる。どちらか未選択なら null(未設定) */
function joinTime(h: string, m: string): string | null {
  if (h === "" || m === "") return null;
  return `${pad2(Number(h))}:${pad2(Number(m))}`;
}

// ── コンポーネント ────────────────────────────────────────

/**
 * 設定画面
 *
 * - 住所変更(変更時のみ Geocoding 再実行 → 方位マップ中心を更新)
 * - 出生時刻の追記(変更時は API 側でポテンシャルタイプを再診断)
 * - キャラ表示スタイルの切り替え
 *
 * 生年月日・氏名は診断の基礎のため設定では変更不可(再登録が必要)。
 */
export function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [birthDate, setBirthDate] = useState("");
  const [origBirthTime, setOrigBirthTime] = useState<string | null>(null);
  const [origAddress, setOrigAddress] = useState<string | null>(null);
  const [timeH, setTimeH] = useState("");
  const [timeM, setTimeM] = useState("");
  const [address, setAddress] = useState("");
  const [charStyle, setCharStyle] = useState<"male" | "female">("male");

  // ── 今日のジャーナルの設定(診断には影響しない) ──
  const [wakeH, setWakeH] = useState("");
  const [wakeM, setWakeM] = useState("");
  const [sleepH, setSleepH] = useState("");
  const [sleepM, setSleepM] = useState("");
  const [transportMode, setTransportMode] = useState<TransportMode | null>(null);
  const [holidayWeekdays, setHolidayWeekdays] = useState<number[]>([]);
  const [places, setPlaces] = useState<FavoritePlace[]>([]);
  const [placesLimit, setPlacesLimit] = useState(10);
  // 場所の追加フォーム
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [addingPlace, setAddingPlace] = useState(false);
  // マップ検索で選んだ場所の座標。あれば Geocoding をやり直さずそのまま使う
  const [pickedLatLng, setPickedLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ProfileResponse>("/api/profile");
      const p = res.profile;
      setBirthDate(p.birthDate);
      setOrigBirthTime(p.birthTime);
      setOrigAddress(p.addressText);
      if (p.birthTime) {
        const [h, m] = p.birthTime.split(":");
        setTimeH(String(Number(h)));
        setTimeM(String(Number(m)));
      }
      setAddress(p.addressText ?? "");
      setCharStyle(p.charStyle);

      // ジャーナルの設定も併せて取得(失敗しても診断設定の編集は続けられるようにする)
      try {
        const prefRes = await getPreferences();
        const pref = prefRes.preferences;
        const wake = splitTime(pref.wakeTime);
        const sleep = splitTime(pref.sleepTime);
        setWakeH(wake.h);
        setWakeM(wake.m);
        setSleepH(sleep.h);
        setSleepM(sleep.m);
        setTransportMode(pref.transportMode);
        // 未設定なら既定(土日)が effectiveHolidayWeekdays に入っている
        setHolidayWeekdays([...pref.effectiveHolidayWeekdays]);
        setPlaces([...prefRes.places]);
        setPlacesLimit(prefRes.limits.places);
      } catch (err) {
        // 握りつぶさず表示する(旧 API に繋がっている場合もここに来る)
        setError(err instanceof Error ? err.message : "ジャーナル設定の取得に失敗しました");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        navigate("/register", { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : "プロフィールの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // 表示スタイルのプレビュー用に、生年月日+出生時刻からタイプを算出
  const typeId: PotentialTypeId | null = useMemo(() => {
    if (!birthDate) return null;
    const birthTime =
      timeH !== "" && timeM !== "" ? `${pad2(Number(timeH))}:${pad2(Number(timeM))}` : undefined;
    try {
      return computePotential(birthDate, birthTime).primaryType;
    } catch {
      return null;
    }
  }, [birthDate, timeH, timeM]);

  const currentBirthTime =
    timeH !== "" && timeM !== "" ? `${pad2(Number(timeH))}:${pad2(Number(timeM))}` : null;

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload: UpdatePayload = {};

    // キャラスタイルは常に送る(トグルなので差分判定不要)
    payload.charStyle = charStyle;

    // 出生時刻: 変更があれば送る(API 側で再診断)
    if (currentBirthTime && currentBirthTime !== origBirthTime) {
      payload.birthTime = currentBirthTime;
    }

    try {
      // 住所変更時のみ Geocoding を再実行(docs/01 §6)
      const trimmedAddr = address.trim();
      if (trimmedAddr && trimmedAddr !== (origAddress ?? "")) {
        const latLng = await geocodeAddress(trimmedAddr);
        payload.addressText = trimmedAddr;
        if (latLng) {
          payload.lat = latLng.lat;
          payload.lng = latLng.lng;
        }
      }

      const res = await apiClient.patch<ProfileResponse>("/api/profile", payload);
      // 更新後の値で表示を同期
      setOrigBirthTime(res.profile.birthTime);
      setOrigAddress(res.profile.addressText);

      // ジャーナルの設定も同じ保存操作でまとめて送る(操作感を1つにするため)。
      // null を送れば未設定に戻り、holidayWeekdays の空配列は「休日なし」を意味する。
      const prefPatch: PreferencesPatch = {
        wakeTime: joinTime(wakeH, wakeM),
        sleepTime: joinTime(sleepH, sleepM),
        transportMode,
        holidayWeekdays,
      };
      await updatePreferences(prefPatch);

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    charStyle,
    currentBirthTime,
    origBirthTime,
    address,
    origAddress,
    wakeH,
    wakeM,
    sleepH,
    sleepM,
    transportMode,
    holidayWeekdays,
  ]);

  /** 曜日トグル(全解除=休日なしも許容する) */
  const toggleHoliday = useCallback((day: number) => {
    setSaved(false);
    setHolidayWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }, []);

  /**
   * よく行く場所を追加する。
   * 座標はここで Geocoding して渡す(サーバーは Geocoding しない)。
   * 一覧操作は即時反映にする(保存ボタンを待たせない)。
   */
  const handleAddPlace = useCallback(async () => {
    if (addingPlace) return;
    const name = newName.trim();
    const addressText = newAddress.trim();
    if (!name || !addressText) {
      setError("名前と住所を入力してください");
      return;
    }

    setAddingPlace(true);
    setError(null);
    try {
      // よく行く場所は方位計算に座標が必須なので、取れないときは登録しない。
      // マップ検索で選んでいればその座標を使い、手入力なら住所から Geocoding する。
      // geocodeAddress は「該当なし/失敗」なら MJ-MAP-002 を throw し、
      // 「Maps キー未設定(開発時)」では null を返す。後者は別メッセージにする。
      const latLng = pickedLatLng ?? (await geocodeAddress(addressText));
      if (!latLng) {
        setError(clientError("MJ-MAP-001"));
        return;
      }
      const category = newCategory.trim();
      const res = await addFavoritePlace({
        name,
        addressText,
        lat: latLng.lat,
        lng: latLng.lng,
        ...(category ? { category } : {}),
      });
      setPlaces((prev) => [...prev, res.place]);
      setNewName("");
      setNewAddress("");
      setNewCategory("");
      setPickedLatLng(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "場所の追加に失敗しました");
    } finally {
      setAddingPlace(false);
    }
  }, [addingPlace, newName, newAddress, newCategory, pickedLatLng]);

  /** よく行く場所を削除する(更新 API は無いので、変更は削除→追加で行う) */
  const handleDeletePlace = useCallback(async (place: FavoritePlace) => {
    if (!window.confirm(`「${place.name}」を削除しますか?`)) return;
    setError(null);
    try {
      await deleteFavoritePlace(place.id);
      setPlaces((prev) => prev.filter((p) => p.id !== place.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "場所の削除に失敗しました");
    }
  }, []);

  if (loading) {
    return <div className={s.loadingWrap}>読み込み中...</div>;
  }

  return (
    <div className={s.container}>
      <h1 className={s.pageTitle}>設定</h1>

      {error && <div className={`${s.banner} ${s.bannerError}`}>{error}</div>}
      {saved && <div className={`${s.banner} ${s.bannerSuccess}`}>保存しました</div>}

      {/* ── 診断に関わる設定 ── */}
      <div className={s.groupTitle}>診断に関わる設定</div>

      {/* 生年月日(変更不可) */}
      <div className={s.section}>
        <div className={s.sectionLabel}>生年月日</div>
        <div className={s.readonlyValue}>{birthDate}</div>
        <div className={s.readonlyNote}>生年月日の変更は再登録が必要です</div>
      </div>

      {/* 出生時刻 */}
      <div className={s.section}>
        <div className={s.sectionLabel}>出生時刻</div>
        <div className={s.selectRow}>
          <select
            aria-label="時"
            className={s.select}
            value={timeH}
            onChange={(e) => {
              setTimeH(e.target.value);
              setSaved(false);
            }}
          >
            <option value="">時</option>
            {HOURS.map((h) => (
              <option key={`h${h}`} value={String(h)}>
                {h}時
              </option>
            ))}
          </select>
          <select
            aria-label="分"
            className={s.select}
            value={timeM}
            onChange={(e) => {
              setTimeM(e.target.value);
              setSaved(false);
            }}
          >
            <option value="">分</option>
            {MINUTES.map((m) => (
              <option key={`min${m}`} value={String(m)}>
                {pad2(m)}分
              </option>
            ))}
          </select>
        </div>
        <p className={s.hint}>出生時刻を追記すると、ハイブリッドタイプの診断が反映されます</p>
      </div>

      {/* 住所 */}
      <div className={s.section}>
        <div className={s.sectionLabel}>住所</div>
        <div style={{ marginBottom: "8px" }}>
          <PostalCodeField
            onFound={(addr) => {
              setAddress(addr);
              setSaved(false);
            }}
          />
        </div>
        <input
          type="text"
          aria-label="住所"
          className={s.input}
          placeholder="東京都渋谷区..."
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setSaved(false);
          }}
        />
        <p className={s.hint}>
          郵便番号で検索するか、直接入力できます。変更すると方位マップの中心が更新されます
        </p>
      </div>

      {/* キャラ表示スタイル */}
      <div className={s.section}>
        <div className={s.sectionLabel}>キャラクター表示スタイル</div>
        <div className={s.styleChoices}>
          {(["male", "female"] as const).map((style) => (
            <button
              key={style}
              type="button"
              className={`${s.styleCard} ${charStyle === style ? s.styleCardSelected : ""}`}
              onClick={() => {
                setCharStyle(style);
                setSaved(false);
              }}
            >
              {typeId && (
                <img
                  className={s.styleCardImage}
                  src={characterImagePath(typeId, style)}
                  alt={getCharacterName(typeId, style)}
                />
              )}
              <div className={s.styleCardLabel}>
                {typeId
                  ? getCharacterName(typeId, style)
                  : style === "male"
                    ? "男性キャラ"
                    : "女性キャラ"}
              </div>
              <div className={s.styleCardDesc}>
                {style === "male" ? "男性キャラ" : "女性キャラ"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 今日のジャーナルの設定(診断には影響しない) ── */}
      <div className={s.groupTitle}>今日のジャーナルの設定</div>
      <p className={s.groupNote}>
        ここで設定した内容が、今日のスケジュール提案に反映されます。診断結果は変わりません。
      </p>

      {/* 活動時間帯 */}
      <div className={s.section}>
        <div className={s.sectionLabel}>活動時間帯</div>
        <div className={s.selectRow}>
          <select
            aria-label="起床時"
            className={s.select}
            value={wakeH}
            onChange={(e) => {
              setWakeH(e.target.value);
              setSaved(false);
            }}
          >
            <option value="">起床</option>
            {HOURS.map((h) => (
              <option key={`wh${h}`} value={String(h)}>
                {h}時
              </option>
            ))}
          </select>
          <select
            aria-label="起床分"
            className={s.select}
            value={wakeM}
            onChange={(e) => {
              setWakeM(e.target.value);
              setSaved(false);
            }}
          >
            <option value="">分</option>
            {PREF_MINUTES.map((m) => (
              <option key={`wm${m}`} value={String(m)}>
                {pad2(m)}分
              </option>
            ))}
          </select>
        </div>
        <div className={s.selectRow} style={{ marginTop: "8px" }}>
          <select
            aria-label="就寝時"
            className={s.select}
            value={sleepH}
            onChange={(e) => {
              setSleepH(e.target.value);
              setSaved(false);
            }}
          >
            <option value="">就寝</option>
            {HOURS.map((h) => (
              <option key={`sh${h}`} value={String(h)}>
                {h}時
              </option>
            ))}
          </select>
          <select
            aria-label="就寝分"
            className={s.select}
            value={sleepM}
            onChange={(e) => {
              setSleepM(e.target.value);
              setSaved(false);
            }}
          >
            <option value="">分</option>
            {PREF_MINUTES.map((m) => (
              <option key={`sm${m}`} value={String(m)}>
                {pad2(m)}分
              </option>
            ))}
          </select>
        </div>
        <p className={s.hint}>
          スケジュールをこの時間帯に収めます。「起床」「就寝」を空に戻すと未設定になります
        </p>
      </div>

      {/* 移動手段 */}
      <div className={s.section}>
        <div className={s.sectionLabel}>主な移動手段</div>
        <div className={s.chipRow}>
          {TRANSPORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${s.chip} ${transportMode === opt.value ? s.chipSelected : ""}`}
              onClick={() => {
                // 同じものを押したら未設定に戻す
                setTransportMode((prev) => (prev === opt.value ? null : opt.value));
                setSaved(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className={s.hint}>提案される移動距離の目安が変わります(もう一度押すと未設定)</p>
      </div>

      {/* 休日にする曜日 */}
      <div className={s.section}>
        <div className={s.sectionLabel}>休日にする曜日</div>
        <div className={s.chipRow}>
          {WEEKDAY_LABELS.map((label, day) => (
            <button
              key={label}
              type="button"
              aria-pressed={holidayWeekdays.includes(day)}
              className={`${s.weekdayChip} ${holidayWeekdays.includes(day) ? s.chipSelected : ""}`}
              onClick={() => toggleHoliday(day)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className={s.hint}>
          休日は過ごし方中心、平日は仕事中心のスケジュールになります(すべて解除も可)
        </p>
      </div>

      {/* よく行く場所 */}
      <div className={s.section}>
        <div className={s.sectionLabel}>よく行く場所</div>
        <p className={s.hint} style={{ marginTop: 0, marginBottom: "10px" }}>
          その日の吉方位に合う場所が、スケジュールの行先として提案されます(最大{placesLimit}件)
        </p>

        {places.length > 0 ? (
          <div className={s.placeList}>
            {places.map((place) => (
              <div key={place.id} className={s.placeItem}>
                <div className={s.placeBody}>
                  <div className={s.placeName}>{place.name}</div>
                  <div className={s.placeMeta}>
                    {place.category ? `${place.category}・` : ""}
                    {place.addressText}
                  </div>
                </div>
                <button
                  type="button"
                  className={s.placeDelete}
                  onClick={() => handleDeletePlace(place)}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={s.placeEmpty}>
            まだ登録がありません。よく行くカフェやコワーキングスペースを追加しておくと、行先として提案されます
          </div>
        )}

        <div className={s.placeForm}>
          {/* Google マップのテキスト検索。選ぶと名前・住所・座標がまとめて入る。
              Places が使えない構成では何も表示されず、下の手入力だけが残る */}
          <PlaceSearchField
            onSelect={(place) => {
              setNewName(place.name);
              setNewAddress(place.addressText);
              setPickedLatLng({ lat: place.lat, lng: place.lng });
            }}
          />
          <input
            type="text"
            aria-label="場所の名前"
            className={s.input}
            placeholder="名前(例: 〇〇コワーキング)"
            maxLength={60}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <PostalCodeField
            onFound={(addr) => {
              setNewAddress(addr);
              // 住所を選び直したので、検索で得た座標は無効にする
              setPickedLatLng(null);
            }}
          />
          <input
            type="text"
            aria-label="場所の住所"
            className={s.input}
            placeholder="住所"
            maxLength={200}
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
          />
          <input
            type="text"
            aria-label="場所のカテゴリ"
            className={s.input}
            placeholder="カテゴリ(任意。例: カフェ)"
            maxLength={30}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <button
            type="button"
            className={s.subButton}
            disabled={addingPlace || places.length >= placesLimit}
            onClick={handleAddPlace}
          >
            {addingPlace ? "追加中..." : "この場所を追加"}
          </button>
          {places.length >= placesLimit && (
            <p className={s.hint}>
              上限{placesLimit}件に達しています。追加するには、いずれかを削除してください
            </p>
          )}
        </div>
      </div>

      {/* 保存バー */}
      <div className={s.saveBar}>
        <button type="button" className={s.saveButton} disabled={saving} onClick={handleSave}>
          {saving ? "保存中..." : "変更を保存"}
        </button>
      </div>
    </div>
  );
}
