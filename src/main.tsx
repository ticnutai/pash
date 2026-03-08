import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { torahDB } from "./utils/torahDB";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

// Init IndexedDB early for fast cache access
torahDB.init();

// Initialize Capacitor plugins on native platforms
if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#1e3a5f' }).catch(() => {});
  SplashScreen.hide().catch(() => {});
}

const updateBottomSystemBarClass = () => {
  const insetValue = getComputedStyle(document.documentElement)
    .getPropertyValue('--safe-area-inset-bottom')
    .trim();
  const bottomInset = Number.parseFloat(insetValue) || 0;
  document.body.classList.toggle('has-bottom-system-bar', bottomInset > 0);
};

window.addEventListener('safeAreaUpdated', updateBottomSystemBarClass as EventListener);
window.addEventListener('resize', updateBottomSystemBarClass);
window.addEventListener('orientationchange', updateBottomSystemBarClass);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateBottomSystemBarClass, { once: true });
} else {
  updateBottomSystemBarClass();
}

createRoot(document.getElementById("root")!).render(<App />);
