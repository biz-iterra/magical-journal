import { useState } from "react";
import { clientError } from "../errors";
import { lookupPostalCode } from "../services/postal";
import { vars } from "../styles/theme.css";

interface Props {
  /** 住所が見つかったときに呼ばれる(住所欄へ反映する) */
  readonly onFound: (address: string) => void;
}

/**
 * 郵便番号入力 + 検索ボタン。
 * 7桁入力で自動検索し、見つかった住所を onFound で親へ渡す。
 * 登録画面・設定画面で共用する。
 */
export function PostalCodeField({ onFound }: Props) {
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (value: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await lookupPostalCode(value);
      onFound(result.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : clientError("MJ-NET-001"));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 7);
    setZip(digits);
    setError(null);
    // 7桁そろったら自動検索
    if (digits.length === 7) {
      void search(digits);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
        <input
          type="text"
          inputMode="numeric"
          aria-label="郵便番号"
          placeholder="1500001(ハイフン不要)"
          value={zip}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 12px",
            fontSize: vars.fontSize.body,
            color: vars.color.text,
            backgroundColor: vars.color.surfaceSubtle,
            border: `1px solid ${vars.color.borderInput}`,
            borderRadius: vars.radius.sm,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          disabled={loading || zip.length !== 7}
          onClick={() => void search(zip)}
          style={{
            minHeight: "44px",
            padding: "0 16px",
            fontSize: vars.fontSize.caption,
            fontWeight: 600,
            // 非活性は淡いアクセント塗り+白文字にせず、沈めた面 + 非活性文字にする
            color: loading || zip.length !== 7 ? vars.color.textDisabled : vars.color.onAccent,
            backgroundColor:
              loading || zip.length !== 7 ? vars.color.surfaceMuted : vars.color.accent,
            border: "none",
            borderRadius: vars.radius.sm,
            cursor: loading || zip.length !== 7 ? "default" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "検索中" : "住所検索"}
        </button>
      </div>
      {error && (
        <p style={{ fontSize: "11px", color: vars.color.misfortuneText, marginTop: "4px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
