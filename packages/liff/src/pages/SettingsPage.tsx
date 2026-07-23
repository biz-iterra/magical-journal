import { computePotential, getCharacterName } from "@mj/engine";
import type { PotentialTypeId } from "@mj/engine";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { PostalCodeField } from "../components/PostalCodeField";
import { geocodeAddress } from "../services/geocode";
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
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [saving, charStyle, currentBirthTime, origBirthTime, address, origAddress]);

  if (loading) {
    return <div className={s.loadingWrap}>読み込み中...</div>;
  }

  return (
    <div className={s.container}>
      <h1 className={s.pageTitle}>設定</h1>

      {error && <div className={`${s.banner} ${s.bannerError}`}>{error}</div>}
      {saved && <div className={`${s.banner} ${s.bannerSuccess}`}>保存しました</div>}

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

      {/* 保存バー */}
      <div className={s.saveBar}>
        <button type="button" className={s.saveButton} disabled={saving} onClick={handleSave}>
          {saving ? "保存中..." : "変更を保存"}
        </button>
      </div>
    </div>
  );
}
