import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { vars } from "../styles/theme.css";

interface LayoutProps {
  readonly children: ReactNode;
}

/** 下部ナビの高さ(固定表示するため main の下余白と共有する) */
const NAV_HEIGHT = "56px";

const navItems = [
  { to: "/", label: "今日" },
  { to: "/mytype", label: "タイプ" },
  { to: "/friend", label: "友達" },
  { to: "/monthly", label: "月間" },
  { to: "/settings", label: "設定" },
] as const;

/**
 * 共通レイアウト: コンテンツ領域 + 下部ナビゲーション
 */
export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <>
      {/* フッターは固定表示のため、その高さ分の余白を下に確保する(最後の要素が隠れないように) */}
      <main style={{ flex: 1, padding: "16px", paddingBottom: `calc(${NAV_HEIGHT} + 16px)` }}>
        {children}
      </main>
      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          height: NAV_HEIGHT,
          // iOS のホームバー等(セーフエリア)にかからないようにする
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxSizing: "content-box",
          borderTop: `1px solid ${vars.color.borderFaint}`,
          backgroundColor: vars.color.surface,
        }}
      >
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            style={{
              fontSize: "12px",
              textAlign: "center",
              color: location.pathname === item.to ? vars.color.accent : vars.color.textTertiary,
              fontWeight: location.pathname === item.to ? 600 : 400,
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
