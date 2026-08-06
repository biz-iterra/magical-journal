import { useEffect, useRef, useState } from "react";
import { clientError } from "../../errors";
import { vars } from "../../styles/theme.css";
import { DISTANCE_RINGS_KM, getFortuneColor, getSectorAngle } from "./geometry";
import { GoogleMapsProvider } from "./google-maps-provider";
import type { DirectionMapProps } from "./types";

const MAP_RADIUS_KM = 100;
// 駅周辺・徒歩圏が読み取れる縮尺(Google マップの体感に寄せる)。
// 小さいと地名が潰れて、どの方角に何があるのか分からなくなる。
const ZOOM_LEVEL = 13;

export function DirectionMap({ center, directions, height = "300px" }: DirectionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<GoogleMapsProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // 地図本体の生成完了フラグ。オーバーレイ描画はこれが立ってから行う。
  const [mapReady, setMapReady] = useState(false);

  // ── 地図本体の生成(中心が変わったときだけ) ──────────────
  // 盤の切替(日/月/年/時盤スライダー)でここを再実行すると地図が作り直され、
  // タイルの再読込でちらつく。生成と描画は分離する。
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const provider = new GoogleMapsProvider();
    providerRef.current = provider;
    let cancelled = false;

    provider
      .init(container, center, ZOOM_LEVEL)
      .then(() => {
        if (cancelled) return;
        setMapReady(true);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(clientError("MJ-MAP-003"));
        setLoading(false);
      });

    return () => {
      cancelled = true;
      setMapReady(false);
      provider.destroy();
      providerRef.current = null;
    };
  }, [center]);

  // ── 方位オーバーレイ(扇形 + 距離リング)の差し替え ────────
  // 盤が切り替わったときはこちらだけを走らせ、地図はそのまま使い回す。
  useEffect(() => {
    const provider = providerRef.current;
    if (!mapReady || !provider) return;

    provider.clearOverlays();

    for (const dir of directions) {
      const angle = getSectorAngle(dir.direction);
      const { color, opacity } = getFortuneColor(dir.fortune);
      provider.addSectorOverlay(center, angle.start, angle.end, MAP_RADIUS_KM, color, opacity);
    }

    for (const km of DISTANCE_RINGS_KM) {
      provider.addDistanceRing(center, km);
    }
  }, [mapReady, center, directions]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
  if (!apiKey) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: vars.color.surfaceMuted,
          borderRadius: vars.radius.md,
          color: vars.color.textMuted,
          fontSize: "13px",
        }}
      >
        方位マップ（API キー未設定）
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: vars.color.misfortuneBg,
          borderRadius: vars.radius.md,
          color: vars.color.misfortuneText,
          fontSize: "13px",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={containerRef}
        style={{
          height,
          borderRadius: vars.radius.md,
          overflow: "hidden",
        }}
      />
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: vars.color.overlayScrim,
            borderRadius: vars.radius.md,
            color: vars.color.textMuted,
            fontSize: "13px",
          }}
        >
          地図を読み込み中...
        </div>
      )}
      <MapLegend />
    </div>
  );
}

function MapLegend() {
  const items = [
    { label: "大吉", color: "#22c55e" },
    { label: "吉", color: "#4ade80" },
    { label: "凶", color: "#6b7280" },
    { label: "中立", color: "#d1d5db" },
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "12px",
        marginTop: "8px",
        fontSize: "11px",
        color: vars.color.textSecondary,
      }}
    >
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              backgroundColor: item.color,
              opacity: 0.7,
              display: "inline-block",
            }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}
