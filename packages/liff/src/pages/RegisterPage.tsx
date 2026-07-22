import { kanaToHepburn } from "@mj/engine";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import * as s from "./RegisterPage.css";

// ── 定数 ──────────────────────────────────────────────────

const YEAR_MIN = 1920;
const YEAR_MAX = 2025;
const STEP_LABELS = ["生年月日", "氏名・住所", "表示スタイル"] as const;
const TOTAL_STEPS = STEP_LABELS.length;

/** 0..n-1 の配列を生成する(Array.from のインデックスを key に使わないため) */
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

// ── ヘルパー ─────────────────────────────────────────────

/** 月の日数を返す(うるう年考慮) */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** ひらがなのみかチェック */
function isHiragana(value: string): boolean {
  // ひらがな(ぁ-ゖ)・長音(ー)・全角スペースを許容
  return /^[ぁ-ゖー　]*$/.test(value);
}

// ── 型定義 ────────────────────────────────────────────────

interface FormData {
  year: string;
  month: string;
  day: string;
  birthTimeH: string;
  birthTimeM: string;
  familyNameKana: string;
  givenNameKana: string;
  romajiOverride: string;
  addressText: string;
  charStyle: "male" | "female" | "";
}

const INITIAL: FormData = {
  year: "",
  month: "",
  day: "",
  birthTimeH: "",
  birthTimeM: "",
  familyNameKana: "",
  givenNameKana: "",
  romajiOverride: "",
  addressText: "",
  charStyle: "",
};

interface RegisterPayload {
  birthDate: string;
  birthTime?: string;
  nameKana: string;
  nameRomaji: string;
  addressText?: string;
  charStyle: "male" | "female";
}

// ── コンポーネント ────────────────────────────────────────

/**
 * 初回登録画面 (3 ステップ)
 *
 * ステップ1: 生年月日 + 出生時刻
 * ステップ2: 氏名かな + ローマ字確認 + 住所
 * ステップ3: キャラ表示スタイル選択
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── フォーム更新 ────────────────────────────────────────

  const update = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  // ── ローマ字自動変換 ────────────────────────────────────

  const autoRomaji = useMemo(() => {
    const family = form.familyNameKana.trim();
    const given = form.givenNameKana.trim();
    if (!family && !given) return "";
    return `${kanaToHepburn(family)} ${kanaToHepburn(given)}`.trim();
  }, [form.familyNameKana, form.givenNameKana]);

  /** 最終的に送信するローマ字。手動上書きがあればそちらを優先 */
  const finalRomaji = form.romajiOverride.trim() || autoRomaji;

  // ── 日数計算 ────────────────────────────────────────────

  const maxDay = useMemo(() => {
    const y = Number(form.year);
    const m = Number(form.month);
    if (!y || !m) return 31;
    return daysInMonth(y, m);
  }, [form.year, form.month]);

  // ── バリデーション ─────────────────────────────────────

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return form.year !== "" && form.month !== "" && form.day !== "";
      case 1:
        return (
          form.familyNameKana.trim() !== "" &&
          form.givenNameKana.trim() !== "" &&
          isHiragana(form.familyNameKana) &&
          isHiragana(form.givenNameKana) &&
          finalRomaji !== ""
        );
      case 2:
        return form.charStyle !== "";
      default:
        return false;
    }
  }, [step, form, finalRomaji]);

  // ── ステップ移動 ────────────────────────────────────────

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      setError(null);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
      setError(null);
    }
  }, [step]);

  // ── 送信 ────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!canProceed || submitting) return;

    const pad2 = (n: number) => String(n).padStart(2, "0");
    const birthDate = `${form.year}-${pad2(Number(form.month))}-${pad2(Number(form.day))}`;

    const payload: RegisterPayload = {
      birthDate,
      nameKana: `${form.familyNameKana.trim()} ${form.givenNameKana.trim()}`,
      nameRomaji: finalRomaji,
      charStyle: form.charStyle as "male" | "female",
    };

    // 出生時刻(任意)
    if (form.birthTimeH !== "" && form.birthTimeM !== "") {
      payload.birthTime = `${pad2(Number(form.birthTimeH))}:${pad2(Number(form.birthTimeM))}`;
    }

    // 住所(任意)
    if (form.addressText.trim()) {
      payload.addressText = form.addressText.trim();
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.post("/api/register", payload);
      navigate("/mytype", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // 既に登録済み
        navigate("/", { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }, [canProceed, submitting, form, finalRomaji, navigate]);

  // ── レンダリング ────────────────────────────────────────

  return (
    <div className={s.container}>
      {/* ヘッダー */}
      <div className={s.header}>
        <h1 className={s.title}>プロフィール登録</h1>
        <p className={s.subtitle}>あなたのタイプを診断するための情報を入力してください</p>
      </div>

      {/* ステップインジケーター */}
      <div className={s.stepIndicator}>
        {STEP_LABELS.map((lbl, i) => (
          <div key={lbl} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              className={`${s.stepDot} ${i === step ? s.stepDotActive : i < step ? s.stepDotDone : ""}`}
            />
            {i === step && <span className={s.stepLabel}>{lbl}</span>}
          </div>
        ))}
      </div>

      {/* エラー表示 */}
      {error && <div className={s.errorBanner}>{error}</div>}

      {/* フォーム */}
      <div className={s.formArea}>
        {step === 0 && <Step1BirthDate form={form} maxDay={maxDay} update={update} />}
        {step === 1 && <Step2Name form={form} autoRomaji={autoRomaji} update={update} />}
        {step === 2 && <Step3CharStyle form={form} update={update} />}
      </div>

      {/* ボタン */}
      <div className={s.buttonArea}>
        {step > 0 && (
          <button type="button" className={s.backButton} onClick={goBack}>
            戻る
          </button>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <button type="button" className={s.nextButton} disabled={!canProceed} onClick={goNext}>
            次へ ({step + 1}/{TOTAL_STEPS})
          </button>
        ) : (
          <button
            type="button"
            className={s.nextButton}
            disabled={!canProceed || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "登録中..." : "登録する"}
          </button>
        )}
      </div>

      {/* 送信中オーバーレイ */}
      {submitting && <div className={s.submittingOverlay}>登録中...</div>}
    </div>
  );
}

// ── ステップ1: 生年月日 + 出生時刻 ────────────────────────

interface StepProps {
  form: FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

function Step1BirthDate({ form, maxDay, update }: StepProps & { maxDay: number }) {
  return (
    <>
      {/* 生年月日 */}
      <div className={s.fieldGroup}>
        <div className={s.label}>
          生年月日
          <span className={s.requiredBadge}>必須</span>
        </div>
        <div className={s.selectRow}>
          <div className={s.selectWrapper}>
            <select
              aria-label="生年"
              className={`${s.select} ${form.year === "" ? s.selectPlaceholder : ""}`}
              value={form.year}
              onChange={(e) => update("year", e.target.value)}
            >
              <option value="">年</option>
              {Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, idx) => YEAR_MAX - idx).map(
                (y) => (
                  <option key={`y${y}`} value={String(y)}>
                    {y}年
                  </option>
                ),
              )}
            </select>
          </div>
          <div className={s.selectWrapper}>
            <select
              aria-label="月"
              className={`${s.select} ${form.month === "" ? s.selectPlaceholder : ""}`}
              value={form.month}
              onChange={(e) => update("month", e.target.value)}
            >
              <option value="">月</option>
              {MONTHS.map((m) => (
                <option key={`m${m}`} value={String(m)}>
                  {m}月
                </option>
              ))}
            </select>
          </div>
          <div className={s.selectWrapper}>
            <select
              aria-label="日"
              className={`${s.select} ${form.day === "" ? s.selectPlaceholder : ""}`}
              value={form.day}
              onChange={(e) => update("day", e.target.value)}
            >
              <option value="">日</option>
              {Array.from({ length: maxDay }, (_, idx) => idx + 1).map((d) => (
                <option key={`d${d}`} value={String(d)}>
                  {d}日
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 出生時刻 */}
      <div className={s.fieldGroup}>
        <div className={s.label}>
          出生時刻
          <span className={s.optionalBadge}>任意</span>
        </div>
        <div className={s.selectRow}>
          <div className={s.selectWrapper}>
            <select
              aria-label="時"
              className={`${s.select} ${form.birthTimeH === "" ? s.selectPlaceholder : ""}`}
              value={form.birthTimeH}
              onChange={(e) => update("birthTimeH", e.target.value)}
            >
              <option value="">時</option>
              {HOURS.map((h) => (
                <option key={`h${h}`} value={String(h)}>
                  {h}時
                </option>
              ))}
            </select>
          </div>
          <div className={s.selectWrapper}>
            <select
              aria-label="分"
              className={`${s.select} ${form.birthTimeM === "" ? s.selectPlaceholder : ""}`}
              value={form.birthTimeM}
              onChange={(e) => update("birthTimeM", e.target.value)}
            >
              <option value="">分</option>
              {MINUTES.map((m) => (
                <option key={`min${m}`} value={String(m)}>
                  {String(m).padStart(2, "0")}分
                </option>
              ))}
            </select>
          </div>
        </div>
        <p style={{ fontSize: "11px", color: "#999", marginTop: "6px" }}>
          出生時刻が分かると、より詳しい診断(ハイブリッドタイプ)が可能になります
        </p>
      </div>
    </>
  );
}

// ── ステップ2: 氏名 + ローマ字 + 住所 ────────────────────

function Step2Name({ form, autoRomaji, update }: StepProps & { autoRomaji: string }) {
  const familyErr = form.familyNameKana.trim() !== "" && !isHiragana(form.familyNameKana);
  const givenErr = form.givenNameKana.trim() !== "" && !isHiragana(form.givenNameKana);

  return (
    <>
      {/* 氏名かな */}
      <div className={s.fieldGroup}>
        <div className={s.label}>
          氏名（ひらがな）
          <span className={s.requiredBadge}>必須</span>
        </div>
        <div className={s.selectRow}>
          <input
            type="text"
            aria-label="姓（ひらがな）"
            className={`${s.input} ${s.inputHalf}`}
            placeholder="せい"
            value={form.familyNameKana}
            onChange={(e) => update("familyNameKana", e.target.value)}
            style={familyErr ? { borderColor: "#ef4444" } : undefined}
          />
          <input
            type="text"
            aria-label="名（ひらがな）"
            className={`${s.input} ${s.inputHalf}`}
            placeholder="めい"
            value={form.givenNameKana}
            onChange={(e) => update("givenNameKana", e.target.value)}
            style={givenErr ? { borderColor: "#ef4444" } : undefined}
          />
        </div>
        {(familyErr || givenErr) && (
          <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>
            ひらがなで入力してください
          </p>
        )}
      </div>

      {/* ローマ字確認 */}
      <div className={s.fieldGroup}>
        <div className={s.label}>ローマ字（ヘボン式・自動変換）</div>
        {autoRomaji && <div className={s.romajiPreview}>{autoRomaji}</div>}
        <p className={s.romajiNote}>変換結果が正しくない場合は下の欄で修正できます</p>
        <input
          type="text"
          aria-label="ローマ字修正"
          className={s.input}
          placeholder="修正がある場合はここに入力"
          value={form.romajiOverride}
          onChange={(e) => update("romajiOverride", e.target.value.toUpperCase())}
          style={{ marginTop: "8px" }}
        />
      </div>

      {/* 住所 */}
      <div className={s.fieldGroup}>
        <div className={s.label}>
          住所
          <span className={s.optionalBadge}>任意</span>
        </div>
        <input
          type="text"
          aria-label="住所"
          className={s.input}
          placeholder="東京都渋谷区..."
          value={form.addressText}
          onChange={(e) => update("addressText", e.target.value)}
        />
        <p style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
          方位マップで自宅を中心に表示するために使います
        </p>
      </div>
    </>
  );
}

// ── ステップ3: キャラ表示スタイル ─────────────────────────

function Step3CharStyle({ form, update }: StepProps) {
  return (
    <div className={s.fieldGroup}>
      <div className={s.label}>
        キャラクター表示スタイル
        <span className={s.requiredBadge}>必須</span>
      </div>
      <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
        診断結果に表示されるキャラクターの見た目を選んでください。あとから設定で変更できます。
      </p>
      <div className={s.styleChoices}>
        <button
          type="button"
          className={`${s.styleCard} ${form.charStyle === "male" ? s.styleCardSelected : ""}`}
          onClick={() => update("charStyle", "male")}
        >
          <div className={s.styleCardLabel}>男性キャラ</div>
          <div className={s.styleCardDesc}>力強いデザイン</div>
        </button>
        <button
          type="button"
          className={`${s.styleCard} ${form.charStyle === "female" ? s.styleCardSelected : ""}`}
          onClick={() => update("charStyle", "female")}
        >
          <div className={s.styleCardLabel}>女性キャラ</div>
          <div className={s.styleCardDesc}>やわらかいデザイン</div>
        </button>
      </div>
    </div>
  );
}
