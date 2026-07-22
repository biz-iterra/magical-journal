import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  readonly children: ReactNode;
}

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
      <main style={{ flex: 1, padding: "16px" }}>{children}</main>
      <nav
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          height: "56px",
          borderTop: "1px solid #e0e0e0",
          backgroundColor: "#ffffff",
        }}
      >
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            style={{
              fontSize: "12px",
              textAlign: "center",
              color: location.pathname === item.to ? "#6366f1" : "#666666",
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
