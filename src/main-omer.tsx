import { createRoot } from "react-dom/client";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import OmerPage from "./pages/Omer";
import "./index.css";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: "#1a1a2e" }).catch(() => {});
  SplashScreen.hide().catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallbackTitle="שגיאה בטעינת הדף">
    <AuthProvider>
      <OmerPage />
    </AuthProvider>
  </ErrorBoundary>
);
