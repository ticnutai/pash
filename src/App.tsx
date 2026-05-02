import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";

// Use HashRouter in Electron (file:// protocol) and BrowserRouter in web
const isElectron = navigator.userAgent.toLowerCase().includes('electron');
const Router = isElectron ? HashRouter : BrowserRouter;
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FontAndColorSettingsProvider } from "@/contexts/FontAndColorSettingsContext";
import { DisplayModeProvider } from "@/contexts/DisplayModeContext";
import { HighlightsProvider } from "@/contexts/HighlightsContext";
import { NotesProvider } from "@/contexts/NotesContext";
import { BookmarksProvider } from "@/contexts/BookmarksContext";
import { ContentProvider } from "@/contexts/ContentContext";
import { DeviceProvider } from "@/contexts/DeviceContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { PWAReloadPrompt } from "@/components/PWAReloadPrompt";
import { ReminderPopup } from "@/components/ReminderPopup";
import { OmerEntryPopup } from "@/components/OmerEntryPopup";
import { useNotifications } from "@/hooks/useNotifications";
import { MetaSyncInitializer } from "@/components/MetaSyncInitializer";

const DEV_CHAT_ENABLED_KEY = "dev-chat-widget-enabled";
const DEV_SCREENSHOT_ENABLED_KEY = "dev-screenshot-tool-enabled";
const DEV_FLOATING_ENABLED_KEY = "dev-floating-buttons-enabled";
const DEV_FEATURES_EVENT = "dev-features:changed";

const readDevFeatureFlag = (key: string, fallback: boolean) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
};

// Dev-only chat widget (lazy loaded, tree-shaken in production)
const DevChatWidget = import.meta.env.DEV
  ? lazy(() => import("@/components/DevChatWidget").then(m => ({ default: m.DevChatWidget })))
  : null;

// Dev-only screenshot tool (lazy loaded, tree-shaken in production)
const ScreenshotTool = import.meta.env.DEV
  ? lazy(() => import("@/components/ScreenshotTool").then(m => ({ default: m.ScreenshotTool })))
  : null;

// Lazy load ALL pages for optimal initial bundle size
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth").then(m => ({ default: m.Auth })));
const Commentaries = lazy(() => import("./pages/Commentaries").then(m => ({ default: m.Commentaries })));
const UserProfile = lazy(() => import("./pages/UserProfile").then(m => ({ default: m.UserProfile })));
const NotFound = lazy(() => import("./pages/NotFound"));
const LayoutEditor = lazy(() => import("./pages/LayoutEditor").then(m => ({ default: m.LayoutEditor })));
const Siddur = lazy(() => import("./pages/Siddur").then(m => ({ default: m.Siddur })));
const Omer = lazy(() => import("./pages/Omer"));
const AdminPermissions = lazy(() => import("./pages/AdminPermissions"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);
  if (isOnline) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-500 text-white text-sm py-1.5 px-4">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>אין חיבור לאינטרנט — עובד במצב לא מקוון</span>
    </div>
  );
}

const App = () => {
  const [showDevFloating, setShowDevFloating] = useState(() => readDevFeatureFlag(DEV_FLOATING_ENABLED_KEY, true));
  const [showDevChat, setShowDevChat] = useState(() => readDevFeatureFlag(DEV_CHAT_ENABLED_KEY, true));
  const [showScreenshotTool, setShowScreenshotTool] = useState(() => readDevFeatureFlag(DEV_SCREENSHOT_ENABLED_KEY, true));
  const { popupReminder, dismissPopup } = useNotifications();

  useEffect(() => {
    const syncDevFeatures = () => {
      setShowDevFloating(readDevFeatureFlag(DEV_FLOATING_ENABLED_KEY, true));
      setShowDevChat(readDevFeatureFlag(DEV_CHAT_ENABLED_KEY, true));
      setShowScreenshotTool(readDevFeatureFlag(DEV_SCREENSHOT_ENABLED_KEY, true));
    };

    window.addEventListener("storage", syncDevFeatures);
    window.addEventListener(DEV_FEATURES_EVENT, syncDevFeatures as EventListener);

    return () => {
      window.removeEventListener("storage", syncDevFeatures);
      window.removeEventListener(DEV_FEATURES_EVENT, syncDevFeatures as EventListener);
    };
  }, []);

  return (
    <ErrorBoundary fallbackTitle="שגיאה כללית באפליקציה">
    <AuthProvider>
      <MetaSyncInitializer />
      <DeviceProvider>
        <ThemeProvider>
          <FontAndColorSettingsProvider>
            <DisplayModeProvider>
              <HighlightsProvider>
                <NotesProvider>
                  <BookmarksProvider>
                    <ContentProvider>
                      <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <PWAReloadPrompt />
                      <OfflineBanner />
                      <ReminderPopup reminder={popupReminder} onDismiss={dismissPopup} />
                      {DevChatWidget && showDevFloating && showDevChat && <Suspense fallback={null}><DevChatWidget /></Suspense>}
                      {ScreenshotTool && showDevFloating && showScreenshotTool && <Suspense fallback={null}><ScreenshotTool /></Suspense>}
                      <Router
                        future={{
                          v7_startTransition: true,
                          v7_relativeSplatPath: true,
                        }}
                      >
                        <OmerEntryPopup />
                        <ErrorBoundary fallbackTitle="שגיאה בטעינת הדף">
                          <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                              <Route path="/" element={<Index />} />
                              <Route path="/auth" element={<Auth />} />
                              <Route path="/profile" element={<UserProfile />} />
                              <Route path="/commentaries/:seferId/:perek/:pasuk" element={<Commentaries />} />
                              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                              <Route path="/siddur" element={<Siddur />} />
                              <Route path="/omer" element={<Omer />} />
                              <Route path="/layout-editor" element={<LayoutEditor />} />
                              <Route path="/admin/permissions" element={<AdminPermissions />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </ErrorBoundary>
                      </Router>
                      </TooltipProvider>
                    </ContentProvider>
                  </BookmarksProvider>
                </NotesProvider>
              </HighlightsProvider>
            </DisplayModeProvider>
          </FontAndColorSettingsProvider>
        </ThemeProvider>
      </DeviceProvider>
    </AuthProvider>
  </ErrorBoundary>
  );
};

export default App;
