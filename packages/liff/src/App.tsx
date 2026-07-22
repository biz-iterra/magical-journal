import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useLiff } from "./hooks/useLiff";
import { FriendDiagPage } from "./pages/FriendDiagPage";
import { MonthlyPage } from "./pages/MonthlyPage";
import { MyTypePage } from "./pages/MyTypePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TodayPage } from "./pages/TodayPage";

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
          <p style={{ color: "#666" }}>{liff.error.message}</p>
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
          <Layout>
            <Routes>
              <Route path="/" element={<TodayPage />} />
              <Route path="/mytype" element={<MyTypePage />} />
              <Route path="/friend" element={<FriendDiagPage />} />
              <Route path="/monthly" element={<MonthlyPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}
