import { useState } from "react";
import { lookupPostalCode } from "../services/postal";

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
      setError(err instanceof Error ? err.message : "住所を取得できませんでした");
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
            fontSize: "15px",
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          disabled={loading || zip.length !== 7}
          onClick={() => void search(zip)}
          style={{
            padding: "0 16px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: loading || zip.length !== 7 ? "#c7d2fe" : "#6366f1",
            border: "none",
            borderRadius: "10px",
            cursor: loading || zip.length !== 7 ? "default" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "検索中" : "住所検索"}
        </button>
      </div>
      {error && <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>{error}</p>}
    </div>
  );
}
