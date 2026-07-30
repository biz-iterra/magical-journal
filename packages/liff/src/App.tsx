import { Navigate, Route, Routes } from "react-router-dom";
import { CharacterThemeProvider } from "./components/CharacterTheme";
import { Layout } from "./components/Layout";
import { useLiff } from "./hooks/useLiff";
import { FriendDiagPage } from "./pages/FriendDiagPage";
import { MyTypePage } from "./pages/MyTypePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TodayPage } from "./pages/TodayPage";
import { vars } from "./styles/theme.css";

export function App() {
  const liff = useLiff();

  if (!liff.isReady) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100dvh",
        }}
      >
        <p>読み込み中...</p>
      </div>
    );
  }

  if (liff.error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100dvh",
        }}
      >
        <div style={{ textAlign: "center", padding: "16px" }}>
          <h1 style={{ fontSize: "18px", marginBottom: "8px" }}>初期化エラー</h1>
          <p style={{ color: vars.color.textTertiary }}>{liff.error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="*"
        element={
          <CharacterThemeProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<TodayPage />} />
                <Route path="/mytype" element={<MyTypePage />} />
                <Route path="/friend" element={<FriendDiagPage />} />
                {/*
                  v0.6: 月間ページは今日のジャーナルへ集約した。
                  ルート自体は残してリダイレクトする(古いリッチメニューや
                  ブックマークが /monthly を指している端末でリンク切れにしないため)。
                */}
                <Route path="/monthly" element={<Navigate to="/" replace />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Layout>
          </CharacterThemeProvider>
        }
      />
    </Routes>
  );
}
