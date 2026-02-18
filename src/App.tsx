import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PWAReloadPrompt } from "@/components/PWAReloadPrompt";

// Lazy load ALL pages for optimal initial bundle size
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth").then(m => ({ default: m.Auth })));
const Commentaries = lazy(() => import("./pages/Commentaries").then(m => ({ default: m.Commentaries })));
const UserProfile = lazy(() => import("./pages/UserProfile").then(m => ({ default: m.UserProfile })));
const NotFound = lazy(() => import("./pages/NotFound"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary fallbackTitle="שגיאה כללית באפליקציה">
    <AuthProvider>
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
                      <BrowserRouter>
                        <ErrorBoundary fallbackTitle="שגיאה בטעינת הדף">
                          <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                              <Route path="/" element={<Index />} />
                              <Route path="/auth" element={<Auth />} />
                              <Route path="/profile" element={<UserProfile />} />
                              <Route path="/commentaries/:seferId/:perek/:pasuk" element={<Commentaries />} />
                              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </ErrorBoundary>
                      </BrowserRouter>
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

export default App;
