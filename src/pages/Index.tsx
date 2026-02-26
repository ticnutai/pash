import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from "react";
import { Book, Loader2, ChevronRight, ChevronLeft, User, BookOpen, CalendarCheck, CalendarOff } from "lucide-react";

import { Sefer, FlatPasuk } from "@/types/torah";
import { cn } from "@/lib/utils";
import { SeferSelector } from "@/components/SeferSelector";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { UserMenu } from "@/components/UserMenu";
import { SyncIndicator } from "@/components/SyncIndicator";
import { GlobalSearchTrigger } from "@/components/GlobalSearchTrigger";
import { InlineSearch } from "@/components/InlineSearch";
import { TextDisplaySettings } from "@/components/TextDisplaySettings";
import { DevicePreview } from "@/components/DevicePreview";
import { MinimizeButton } from "@/components/MinimizeButton";
import { PasukSimpleNavigator } from "@/components/PasukSimpleNavigator";
// ReadingProgress removed - replaced with nav buttons
import { useTheme } from "@/contexts/ThemeContext";
import { useDisplayMode, DisplayMode } from "@/contexts/DisplayModeContext";
import { useDevice } from "@/contexts/DeviceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { toHebrewNumber } from "@/utils/hebrewNumbers";
import { getCurrentWeeklyParsha, getCalendarPreference } from "@/utils/parshaUtils";
import { SeferSkeleton } from "@/components/SeferSkeleton";
import { SelectionProvider } from "@/contexts/SelectionContext";
import { MultiShareBar } from "@/components/MultiShareBar";
import { SelectionModeButton } from "@/components/SelectionModeButton";
import { yieldToMain } from "@/utils/asyncHelpers";
import { lazyLoadSefer, preloadNextSefer } from "@/utils/lazyLoadSefer";
import { usePinchZoom } from "@/hooks/usePinchZoom";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { SidePanelTrigger } from "@/components/SidePanelTrigger";
import { LayoutOverlay } from "@/components/LayoutOverlay";

// Lazy load heavy components - split by usage priority
// Critical components (loaded when mode is active)
const CompactPasukView = lazy(() => import("@/components/CompactPasukView").then(m => ({ default: m.CompactPasukView })));
const PaginatedPasukList = lazy(() => import("@/components/PaginatedPasukList").then(m => ({ default: m.PaginatedPasukList })));
const LuxuryTextView = lazy(() => import("@/components/LuxuryTextView").then(m => ({ default: m.LuxuryTextView })));
const ChumashView = lazy(() => import("@/components/ChumashView").then(m => ({ default: m.ChumashView })));
const SideContentPanel = lazy(() => import("@/components/SideContentPanel").then(m => ({ default: m.SideContentPanel })));

// Navigation components (loaded after initial render)
const QuickSelector = lazy(() => import("@/components/QuickSelector").then(m => ({ default: m.QuickSelector })));
const FloatingQuickSelector = lazy(() => import("@/components/FloatingQuickSelector").then(m => ({ default: m.FloatingQuickSelector })));
const FloatingActionButton = lazy(() => import("@/components/FloatingActionButton").then(m => ({ default: m.FloatingActionButton })));
const Settings = lazy(() => import("@/components/Settings").then(m => ({ default: m.Settings })));

const ComponentLoader = () => (
  <div className="flex flex-col items-center justify-center py-8 gap-3 animate-fade-in">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground animate-pulse">טוען תוכן...</p>
  </div>
);

const Index = () => {
  const { syncStatus } = useTheme();
  const { displaySettings } = useDisplayMode();
  const { isMobile } = useDevice();
  const [searchParams] = useSearchParams();
  const [selectedSefer, setSelectedSefer] = useState<number>(1);
  const displayMode: DisplayMode = displaySettings?.mode || 'full';
  const [seferData, setSeferData] = useState<Sefer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedParsha, setSelectedParsha] = useState<number | null>(null);
  const [selectedPerek, setSelectedPerek] = useState<number | null>(null);
  const [selectedPasuk, setSelectedPasuk] = useState<number | null>(null);
  const [currentPasukIndex, setCurrentPasukIndex] = useState(0);
  const [singlePasukMode, setSinglePasukMode] = useState(false);
  const [globalMinimize, setGlobalMinimize] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const weeklyParshaLoadedRef = useRef<number | false>(false); // stores the sefer id that was set by weekly parsha
  const pendingSearchNav = useRef<{ perek: number; pasuk: number } | null>(null); // pending navigation from search
  const gridRef = useRef<HTMLDivElement>(null);
  const [autoWeeklyParsha, setAutoWeeklyParsha] = useState(() => {
    try {
      const saved = localStorage.getItem('autoWeeklyParsha');
      return saved === null ? true : saved === 'true';
    } catch { return true; }
  });
  
  // Side content panel state (for Chumash view)
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [sidePanelMode, setSidePanelMode] = useState<"user" | "pasuk">("pasuk");
  const [sidePanelPasuk, setSidePanelPasuk] = useState<FlatPasuk | null>(null);
  const [chumashSelectedPasukId, setChumashSelectedPasukId] = useState<number | null>(null);
  
  // Enable pinch-to-zoom for dynamic font scaling
  usePinchZoom({ minScale: 0.5, maxScale: 2.5, step: 0.1 });
  
  
  // PRIORITY: Load weekly parsha FIRST - before sefer data loads
  useEffect(() => {
    if (initialLoadDone) return;
    
    const hasUrlParams = searchParams.get('sefer') || searchParams.get('perek') || searchParams.get('pasuk');
    if (hasUrlParams) {
      setInitialLoadDone(true);
      return;
    }

    // If auto weekly parsha is disabled, load saved state instead
    if (!autoWeeklyParsha) {
      const savedState = localStorage.getItem('lastReadingState');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (state.selectedSefer) setSelectedSefer(state.selectedSefer);
          if (state.selectedParsha) setSelectedParsha(state.selectedParsha);
          if (state.selectedPerek) setSelectedPerek(state.selectedPerek);
          if (state.selectedPasuk) setSelectedPasuk(state.selectedPasuk);
          if (state.singlePasukMode !== undefined) setSinglePasukMode(state.singlePasukMode);
        } catch { /* ignore */ }
      }
      setInitialLoadDone(true);
      return;
    }

    const isIsrael = getCalendarPreference();
    const weeklyParsha = getCurrentWeeklyParsha(isIsrael);

    if (weeklyParsha) {
      setSelectedSefer(weeklyParsha.sefer);
      setSelectedParsha(weeklyParsha.parshaId);
      setSelectedPerek(null);
      setSelectedPasuk(null);
      setSinglePasukMode(false);
      weeklyParshaLoadedRef.current = weeklyParsha.sefer;
      setInitialLoadDone(true);

      // Check if user was reading something different and offer to continue
      const savedState = localStorage.getItem('lastReadingState');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (state.selectedParsha && state.selectedParsha !== weeklyParsha.parshaId && state.selectedPerek) {
            const seferNames: Record<number, string> = { 1: "בראשית", 2: "שמות", 3: "ויקרא", 4: "במדבר", 5: "דברים" };
            const savedSeferName = seferNames[state.selectedSefer] || "";
            setTimeout(() => {
              toast("המשך מהמקום האחרון?", {
                description: `${savedSeferName} - פרק ${toHebrewNumber(state.selectedPerek)}${state.selectedPasuk ? ` פסוק ${toHebrewNumber(state.selectedPasuk)}` : ""}`,
                action: {
                  label: "המשך",
                  onClick: () => {
                    if (state.selectedSefer) setSelectedSefer(state.selectedSefer);
                    if (state.selectedParsha) setSelectedParsha(state.selectedParsha);
                    if (state.selectedPerek) setSelectedPerek(state.selectedPerek);
                    if (state.selectedPasuk) setSelectedPasuk(state.selectedPasuk);
                    if (state.singlePasukMode !== undefined) setSinglePasukMode(state.singlePasukMode);
                  },
                },
                duration: 8000,
              });
            }, 1500);
          }
        } catch { /* ignore */ }
      }
      return;
    }

    // If no weekly parsha (e.g., during certain holidays), try to load saved state
    const savedState = localStorage.getItem('lastReadingState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.selectedSefer) setSelectedSefer(state.selectedSefer);
        if (state.selectedParsha) setSelectedParsha(state.selectedParsha);
        if (state.selectedPerek) setSelectedPerek(state.selectedPerek);
        if (state.selectedPasuk) setSelectedPasuk(state.selectedPasuk);
        if (state.singlePasukMode !== undefined) setSinglePasukMode(state.singlePasukMode);
      } catch (error) {
        console.error('Error loading saved reading state:', error);
      }
    }
    setInitialLoadDone(true);
  }, [searchParams, initialLoadDone, autoWeeklyParsha]);

  // Save reading state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      selectedSefer,
      selectedParsha,
      selectedPerek,
      selectedPasuk,
      singlePasukMode,
      timestamp: Date.now()
    };
    localStorage.setItem('lastReadingState', JSON.stringify(stateToSave));
  }, [selectedSefer, selectedParsha, selectedPerek, selectedPasuk, singlePasukMode]);
  
  // Handle URL parameters for direct navigation
  useEffect(() => {
    const seferParam = searchParams.get('sefer');
    const perekParam = searchParams.get('perek');
    const pasukParam = searchParams.get('pasuk');
    const highlightParam = searchParams.get('highlight');

    if (seferParam) {
      const sefer = parseInt(seferParam);
      if (sefer >= 1 && sefer <= 5) {
        setSelectedSefer(sefer);
      }
    }

    if (perekParam && pasukParam) {
      const perek = parseInt(perekParam);
      const pasuk = parseInt(pasukParam);
      setSelectedPerek(perek);
      setSelectedPasuk(pasuk);
      setSinglePasukMode(true);
    }

    // Highlight shared text fragment after content loads
    if (highlightParam) {
      const attemptHighlight = (retries = 0) => {
        if (retries > 10) return;
        setTimeout(() => {
          // Find and highlight the text in the page
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let node: Text | null;
          while ((node = walker.nextNode() as Text | null)) {
            const idx = node.textContent?.indexOf(highlightParam) ?? -1;
            if (idx >= 0 && node.parentElement && !node.parentElement.closest('mark.shared-highlight')) {
              const range = document.createRange();
              range.setStart(node, idx);
              range.setEnd(node, idx + highlightParam.length);
              const mark = document.createElement('mark');
              mark.className = 'shared-highlight bg-primary/30 text-foreground rounded px-0.5 animate-pulse';
              range.surroundContents(mark);
              mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Remove animation after 3s
              setTimeout(() => mark.classList.remove('animate-pulse'), 3000);
              return;
            }
          }
          attemptHighlight(retries + 1);
        }, 500);
      };
      attemptHighlight();
    }
  }, [searchParams]);

  // Cache for loaded sefarim to avoid re-loading
  const seferCache = useMemo(() => new Map<number, Sefer>(), []);
  
  // Load sefer on demand (lazy loading) with non-blocking parsing
  useEffect(() => {
    let cancelled = false;
    
    const loadSefer = async () => {
      // Check cache first
      if (seferCache.has(selectedSefer)) {
        if (!cancelled) {
          setSeferData(seferCache.get(selectedSefer)!);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setLoadingProgress(0);
      try {
        setLoadingProgress(30);
        
        // Load sefer using dynamic import (better code splitting)
        const sefer = await lazyLoadSefer(selectedSefer);
        if (cancelled) return;
        
        setLoadingProgress(60);
        
        // Yield to main thread to prevent blocking
        await yieldToMain();
        if (cancelled) return;
        
        setLoadingProgress(80);
        
        // Cache the loaded sefer
        seferCache.set(selectedSefer, sefer);
        setSeferData(sefer);
        
        // Check if there's a pending search navigation for this sefer
        if (pendingSearchNav.current) {
          const nav = pendingSearchNav.current;
          pendingSearchNav.current = null;
          for (const parsha of sefer.parshiot) {
            if (parsha.perakim.some(p => p.perek_num === nav.perek)) {
              setSelectedParsha(parsha.parsha_id);
              break;
            }
          }
          setSelectedPerek(nav.perek);
          setSelectedPasuk(nav.pasuk);
          setSinglePasukMode(false);
          setCurrentPasukIndex(0);
        } else if (weeklyParshaLoadedRef.current === selectedSefer) {
          // This is the sefer loaded by weekly parsha - keep selections
          weeklyParshaLoadedRef.current = false;
        } else if (!weeklyParshaLoadedRef.current) {
          setSelectedParsha(null);
          setSelectedPerek(null);
          setSelectedPasuk(null);
        }
        // If weeklyParshaLoadedRef points to a different sefer, don't reset
        
        setLoadingProgress(100);
        setLoading(false);
        
        // Preload next sefer in background for smooth navigation
        preloadNextSefer(selectedSefer);
      } catch (err) {
        if (!cancelled) {
          console.error("Error loading sefer:", err);
          toast.error("שגיאה בטעינת החומש");
          setLoading(false);
        }
      }
    };

    loadSefer();
    
    return () => { cancelled = true; };
  }, [selectedSefer, seferCache]);
  // Flatten pesukim from nested structure with batching to prevent blocking
  const flattenedPesukim = useMemo(() => {
    if (!seferData) return [];
    
    const flat: FlatPasuk[] = [];
    let itemCount = 0;
    const BATCH_SIZE = 100;
    
    for (const parsha of seferData.parshiot) {
      for (const perek of parsha.perakim) {
        for (const pasuk of perek.pesukim) {
          flat.push({
            id: pasuk.id,
            sefer: seferData.sefer_id,
            sefer_name: seferData.sefer_name,
            perek: perek.perek_num,
            pasuk_num: pasuk.pasuk_num,
            text: pasuk.text,
            content: pasuk.content || [],
            parsha_id: parsha.parsha_id,
            parsha_name: parsha.parsha_name
          });
          
          itemCount++;
          // Note: Cannot use async in useMemo, but limiting array operations
          // This optimized structure reduces blocking
        }
      }
    }
    
    return flat;
  }, [seferData]);

  // Get current parsha name and navigation info
  const currentParshaName = useMemo(() => {
    if (!seferData || selectedParsha === null) return null;
    const parsha = seferData.parshiot.find(p => p.parsha_id === selectedParsha);
    return parsha?.parsha_name || null;
  }, [seferData, selectedParsha]);

  // Navigate to previous/next parsha
  const navigateToParsha = useCallback((direction: 'prev' | 'next') => {
    if (!seferData || selectedParsha === null) return;
    
    const currentIndex = seferData.parshiot.findIndex(p => p.parsha_id === selectedParsha);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= seferData.parshiot.length) return;
    
    const newParsha = seferData.parshiot[newIndex];
    setSelectedParsha(newParsha.parsha_id);
    setSelectedPerek(null);
    setSelectedPasuk(null);
    setSinglePasukMode(false);
  }, [seferData, selectedParsha]);

  // Check if can navigate prev/next
  const canNavigatePrev = useMemo(() => {
    if (!seferData || selectedParsha === null) return false;
    const currentIndex = seferData.parshiot.findIndex(p => p.parsha_id === selectedParsha);
    return currentIndex > 0;
  }, [seferData, selectedParsha]);

  const canNavigateNext = useMemo(() => {
    if (!seferData || selectedParsha === null) return false;
    const currentIndex = seferData.parshiot.findIndex(p => p.parsha_id === selectedParsha);
    return currentIndex < seferData.parshiot.length - 1;
  }, [seferData, selectedParsha]);

  // Keyboard shortcuts for navigation
  useKeyboardShortcuts({
    onNextParsha: useCallback(() => canNavigateNext && navigateToParsha('next'), [canNavigateNext, navigateToParsha]),
    onPrevParsha: useCallback(() => canNavigatePrev && navigateToParsha('prev'), [canNavigatePrev, navigateToParsha]),
  });

  // All pesukim in the selected parsha (for pasuk navigation)
  const parshaAllPesukim = useMemo(() => {
    if (selectedParsha === null) return [];
    return flattenedPesukim.filter(p => p.parsha_id === selectedParsha);
  }, [flattenedPesukim, selectedParsha]);

  const filteredPesukim = useMemo(() => {
    let pesukim = flattenedPesukim;

    // Filter by parsha
    if (selectedParsha !== null) {
      pesukim = pesukim.filter(p => p.parsha_id === selectedParsha);
    }

    // Filter by perek
    if (selectedPerek !== null) {
      pesukim = pesukim.filter(p => p.perek === selectedPerek);
    }

    // Don't filter by specific pasuk in these cases:
    // 1. When in single pasuk mode (allows navigation between pesukim)
    // 2. When in compact mode (we want to show multiple pesukim starting from selected)
    if (selectedPasuk !== null && !singlePasukMode && displayMode !== "compact") {
      pesukim = pesukim.filter(p => p.pasuk_num === selectedPasuk);
    }

    return pesukim;
  }, [flattenedPesukim, selectedParsha, selectedPerek, selectedPasuk, singlePasukMode, displayMode]);

  const displayedPesukim = useMemo(() => {
    if (singlePasukMode && filteredPesukim.length > 0) {
      return [filteredPesukim[currentPasukIndex]];
    }
    
    // In compact mode, show up to pasukCount starting from selectedPasuk (if any)
    if (displayMode === "compact") {
      const count = displaySettings?.pasukCount || 20;
      if (selectedPasuk !== null) {
        const startIndex = filteredPesukim.findIndex(p => p.pasuk_num === selectedPasuk);
        if (startIndex >= 0) {
          return filteredPesukim.slice(startIndex, startIndex + count);
        }
      }
      return filteredPesukim.slice(0, count);
    }
    
    // Default: show all
    return filteredPesukim;
  }, [filteredPesukim, singlePasukMode, currentPasukIndex, displayMode, displaySettings?.pasukCount, selectedPasuk]);

  const handleNavigate = useCallback((index: number) => {
    setCurrentPasukIndex(index);
  }, []);

  const handleQuickSelectorChange = useCallback(() => {
    setCurrentPasukIndex(0);
    setSinglePasukMode(false);
  }, []);

  const handleSeferSelect = useCallback((seferId: number) => {
    // Clear old data immediately to prevent showing stale parshiot
    if (seferId !== selectedSefer) {
      setSeferData(null);
    }
    setSelectedSefer(seferId);
    setSelectedParsha(null);
    setSelectedPerek(null);
    setSelectedPasuk(null);
    setSinglePasukMode(false);
    setCurrentPasukIndex(0);
  }, [selectedSefer]);

  const handleParshaSelect = useCallback((p: number | null) => {
    setSelectedParsha(p);
    setSelectedPerek(null);
    setSelectedPasuk(null);
    handleQuickSelectorChange();
  }, [handleQuickSelectorChange]);

  const handlePerekSelect = useCallback((p: number | null) => {
    setSelectedPerek(p);
    setSelectedPasuk(null);
    handleQuickSelectorChange();
  }, [handleQuickSelectorChange]);

  const handlePasukSelect = useCallback((p: number | null) => {
    if (p === null) {
      setSelectedPasuk(null);
      return;
    }

    // Never infer or change perek from pasuk selection.
    // If perek is not selected yet, keep state stable and just store the pasuk.
    if (selectedPerek === null) {
      setSelectedPasuk(p);
      return;
    }
    
    if (displayMode === "compact") {
      setSelectedPasuk(p);
      setSinglePasukMode(false);
    } else {
      const effectivePerek = selectedPerek;
      const perekPesukim = flattenedPesukim.filter(pasuk => 
        pasuk.perek === effectivePerek && 
        (selectedParsha === null || pasuk.parsha_id === selectedParsha)
      );
      const index = perekPesukim.findIndex(pasuk => pasuk.pasuk_num === p);
      setCurrentPasukIndex(index >= 0 ? index : 0);
      setSelectedPasuk(p);
      setSinglePasukMode(true);
    }
  }, [displayMode, flattenedPesukim, selectedPerek, selectedParsha]);
  
  const totalPesukimInPerek = useMemo(() => {
    if (!seferData || selectedPerek === null) return 0;
    // חיפוש בנתונים המקוריים, לא רק בפסוקים המסוננים
    for (const parsha of seferData.parshiot) {
      for (const perek of parsha.perakim) {
        if (perek.perek_num === selectedPerek) {
          return perek.pesukim.length;
        }
      }
    }
    return 0;
  }, [seferData, selectedPerek]);

  // Handler for ChumashView pasuk selection (opens side panel)
  const handleChumashPasukSelect = useCallback((_pasukId: number, pasuk: FlatPasuk) => {
    setChumashSelectedPasukId(pasuk.id);
    setSidePanelPasuk(pasuk);
    setSidePanelMode("pasuk");
    setSidePanelOpen(true);
  }, []);

  const toggleAutoWeeklyParsha = useCallback(() => {
    setAutoWeeklyParsha(prev => {
      const next = !prev;
      localStorage.setItem('autoWeeklyParsha', String(next));
      toast(next ? "פרשת השבוע תיטען אוטומטית" : "פרשת השבוע לא תיטען אוטומטית", { duration: 3000 });
      return next;
    });
  }, []);

  // Handle navigation from search results
  const handleSearchNavigate = useCallback((seferId: number, perek: number, pasuk: number) => {
    // Store pending navigation so loadSefer effect won't reset selections
    pendingSearchNav.current = { perek, pasuk };
    
    const applyNav = (data: Sefer) => {
      for (const parsha of data.parshiot) {
        if (parsha.perakim.some(p => p.perek_num === perek)) {
          setSelectedParsha(parsha.parsha_id);
          break;
        }
      }
      setSelectedPerek(perek);
      setSelectedPasuk(pasuk);
      setSinglePasukMode(false);
      setCurrentPasukIndex(0);
    };

    if (seferId === selectedSefer && seferData) {
      // Same sefer - apply immediately
      applyNav(seferData);
      pendingSearchNav.current = null;
    } else {
      // Different sefer - set sefer and let loadSefer handle the rest
      setSeferData(null);
      setSelectedSefer(seferId);
    }
  }, [seferCache, selectedSefer, seferData]);

  return (
    <SelectionProvider>
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      {/* Header - Fully Responsive */}
      <header data-layout="header" data-layout-label="הדר ראשי" className="sticky top-0 z-50 bg-sidebar shadow-lg">
        <div className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-sidebar sm:rounded-3xl">
          {/* Mobile Layout - Stack vertically */}
          <div className="flex flex-col gap-1 md:hidden">
            {/* Top row: Title + Book icon + Action buttons all in one line */}
            <div className="flex items-center justify-between gap-1 px-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <Book className="h-4 w-4 text-accent flex-shrink-0" />
                <h1 className="text-xs font-bold text-primary-foreground leading-tight truncate">
                  חמישה חומשי תורה
                </h1>
              </div>
              {/* Action buttons */}
              <div data-layout="header-actions-mobile" data-layout-label="כפתורי כותרת (מובייל)" className="flex items-center gap-0.5 flex-shrink-0">
                <span data-layout="btn-calendar" data-layout-label="📅 לוח שנה">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleAutoWeeklyParsha}
                  className={cn("h-8 w-8", autoWeeklyParsha ? "text-accent" : "text-muted-foreground")}
                  title={autoWeeklyParsha ? "פרשת השבוע נטענת אוטומטית — לחץ לביטול" : "פרשת השבוע לא נטענת אוטומטית — לחץ להפעלה"}
                >
                  {autoWeeklyParsha ? <CalendarCheck className="h-4 w-4" /> : <CalendarOff className="h-4 w-4" />}
                </Button>
                </span>
                <span data-layout="btn-sync" data-layout-label="🔄 סנכרון"><SyncIndicator status={syncStatus} /></span>
                <span data-layout="btn-text-settings" data-layout-label="✏️ הגדרות טקסט"><TextDisplaySettings /></span>
                <span data-layout="btn-selection" data-layout-label="☑️ מצב בחירה"><SelectionModeButton /></span>
                <span data-layout="btn-search" data-layout-label="🔍 חיפוש"><GlobalSearchTrigger onNavigateToPasuk={handleSearchNavigate} /></span>
                <span data-layout="btn-user" data-layout-label="👤 משתמש"><UserMenu /></span>
              </div>
            </div>
          </div>

          {/* Desktop/Tablet Layout - Original horizontal layout */}
          <div data-layout="header-actions-desktop" data-layout-label="כפתורי כותרת (דסקטופ)" className="hidden md:flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 order-1">
              <span data-layout="btn-calendar" data-layout-label="📅 לוח שנה">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleAutoWeeklyParsha}
                className={cn("h-9 w-9", autoWeeklyParsha ? "text-accent" : "text-muted-foreground")}
                title={autoWeeklyParsha ? "פרשת השבוע נטענת אוטומטית — לחץ לביטול" : "פרשת השבוע לא נטענת אוטומטית — לחץ להפעלה"}
              >
                {autoWeeklyParsha ? <CalendarCheck className="h-5 w-5" /> : <CalendarOff className="h-5 w-5" />}
              </Button>
              </span>
              <span data-layout="btn-sync" data-layout-label="🔄 סנכרון"><SyncIndicator status={syncStatus} /></span>
              {process.env.NODE_ENV === 'development' && <DevicePreview />}
              <span data-layout="btn-text-settings" data-layout-label="✏️ הגדרות טקסט"><TextDisplaySettings /></span>
              <span data-layout="btn-selection" data-layout-label="☑️ מצב בחירה"><SelectionModeButton /></span>
              <span data-layout="btn-search" data-layout-label="🔍 חיפוש"><GlobalSearchTrigger onNavigateToPasuk={handleSearchNavigate} /></span>
              <span data-layout="btn-user" data-layout-label="👤 משתמש"><UserMenu /></span>
            </div>
            <div className="flex items-center gap-3 order-2 lg:order-none flex-1 lg:flex-initial justify-center">
              <InlineSearch onNavigateToPasuk={handleSearchNavigate} />
              <h1 className="text-2xl lg:text-3xl font-bold text-primary-foreground text-center leading-tight">
                חמישה חומשי תורה - שאלות ופירושים
              </h1>
              <Book className="h-8 w-8 text-accent flex-shrink-0" />
            </div>
            <div className="hidden lg:block w-32" /> {/* Spacer for balance */}
          </div>
        </div>
      </header>

      {/* Floating Settings Button - rendered by Settings component */}
      <Suspense fallback={null}>
        {!(isMobile && sidePanelOpen) && <Settings />}
      </Suspense>

      {/* Layout editor overlay — Ctrl+Shift+L or floating button */}
      <LayoutOverlay />

      <div 
        className="container mx-auto px-3 sm:px-4 py-1 sm:py-2 space-y-1 sm:space-y-2 transition-[padding] duration-300 ease-in-out"
      >
        {/* Sefer / Parsha / Perek / Pasuk Selector */}
        <div data-layout="sefer-selector" data-layout-label="בורר חומש / פרשה / פסוק">
        <SeferSelector 
          sefer={seferData}
          selectedSefer={selectedSefer} 
          onSeferSelect={handleSeferSelect} 
          selectedParsha={selectedParsha}
          onParshaSelect={handleParshaSelect}
          selectedPerek={selectedPerek}
          onPerekSelect={handlePerekSelect}
          selectedPasuk={selectedPasuk}
          onPasukSelect={handlePasukSelect}
        />
        </div>

        {/* Side Panel Buttons + Parsha/Pasuk Nav - Desktop only, SAME ROW */}
        <div data-layout="desktop-controls" data-layout-label="שורת כלים" className="hidden md:flex justify-between items-center gap-2">
          {/* Left side: toolbar buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span data-layout="btn-view-mode" data-layout-label="👁️ מצב תצוגה"><ViewModeToggle seferId={selectedSefer} /></span>
            <span data-layout="btn-user-content" data-layout-label="📂 התוכן שלי">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSidePanelMode("user");
                setSidePanelOpen(!sidePanelOpen || sidePanelMode !== "user");
              }}
                      className={cn("", sidePanelOpen && sidePanelMode === "user" && "bg-accent/15 border-accent text-accent ring-1 ring-accent/30")}
                      title="התוכן שלי"
                    >
                      <User className={cn("h-4 w-4", sidePanelOpen && sidePanelMode === "user" && "text-accent")} />
            </Button>
            </span>
            {displayMode === "chumash" && (
              <span data-layout="btn-commentary" data-layout-label="📖 פירושים">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setSidePanelMode("pasuk");
                  setSidePanelOpen(!sidePanelOpen || sidePanelMode !== "pasuk");
                }}
                      className={cn("", sidePanelOpen && sidePanelMode === "pasuk" && "bg-accent/15 border-accent text-accent ring-1 ring-accent/30")}
                      title="פירושים"
                    >
                      <BookOpen className={cn("h-4 w-4", sidePanelOpen && sidePanelMode === "pasuk" && "text-accent")} />
              </Button>
              </span>
            )}
            {filteredPesukim.length > 0 && (
              <span data-layout="btn-minimize" data-layout-label="➖ מזער הכל">
              <MinimizeButton
                variant="global"
                isMinimized={globalMinimize}
                onClick={() => setGlobalMinimize(!globalMinimize)}
              />
              </span>
            )}
          </div>

          {/* Right side (RTL center): Parsha & Pasuk navigation */}
          {currentParshaName && filteredPesukim.length > 0 && (
            <div data-layout="parsha-pasuk-nav" data-layout-label="ניווט פרשה ופסוקים" className="flex items-center justify-center gap-6 flex-1" dir="rtl">
              {/* Parsha navigation */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateToParsha('prev')}
                  disabled={!canNavigatePrev}
                  className="h-8 w-8 p-0 hover:bg-primary/20 disabled:opacity-30 transition-colors"
                  title="פרשה קודמת"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-base sm:text-lg font-semibold text-primary whitespace-nowrap">
                    {currentParshaName}
                  </span>
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateToParsha('next')}
                  disabled={!canNavigateNext}
                  className="h-8 w-8 p-0 hover:bg-primary/20 disabled:opacity-30 transition-colors"
                  title="פרשה הבאה"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </div>

              {/* Pasuk navigation */}
              {parshaAllPesukim.length > 0 && (
                <PasukSimpleNavigator
                  pesukim={parshaAllPesukim}
                  currentPasukNum={selectedPasuk || filteredPesukim[0]?.pasuk_num || 1}
                  onNavigate={handlePasukSelect}
                />
              )}
            </div>
          )}
        </div>

        {/* Persistent Side Panel Trigger Arrow — hidden on mobile (mobile uses bottom sheet + User button) */}
        {!isMobile && (
          <SidePanelTrigger
            isOpen={sidePanelOpen}
            onClick={() => {
              if (sidePanelOpen) {
                setSidePanelOpen(false);
              } else {
                setSidePanelOpen(true);
              }
            }}
          />
        )}

        {/* Side Content Panel - moved into the grid below */}

        {loading ? (
          <SeferSkeleton />
        ) : (
          <>
            {/* Navigation bar moved above the grid */}

            {/* Mobile controls - ABOVE the grid */}
            {isMobile && (
              <div data-layout="mobile-controls" data-layout-label="בקרות מובייל" className="flex items-center gap-1.5 flex-wrap">
                {filteredPesukim.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPasuk(null);
                      setSelectedPerek(null);
                      setSelectedParsha(null);
                      setSinglePasukMode(false);
                    }}
                    className="gap-1.5 h-9"
                  >
                    <Book className="h-4 w-4" />
                    חומשים
                  </Button>
                )}
                <TextDisplaySettings />
                <ViewModeToggle seferId={selectedSefer} />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSidePanelMode("user");
                    setSidePanelOpen(!sidePanelOpen || sidePanelMode !== "user");
                  }}
                  className={cn("h-9 w-9", sidePanelOpen && sidePanelMode === "user" && "bg-accent/15 border-accent text-accent ring-1 ring-accent/30")}
                  title="התוכן שלי"
                >
                  <User className="h-4 w-4" />
                </Button>
                {filteredPesukim.length > 0 && (
                  <MinimizeButton
                    variant="global"
                    isMinimized={globalMinimize}
                    onClick={() => setGlobalMinimize(!globalMinimize)}
                  />
                )}
              </div>
            )}

            {/* Navigation buttons - parsha & pasuk - BELOW controls */}
            {currentParshaName && parshaAllPesukim.length > 0 && (
              <div data-layout="nav-buttons" data-layout-label="🔀 ניווט" className="flex items-center justify-center gap-3 py-3 px-2" dir="rtl">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateToParsha('prev')}
                  disabled={!canNavigatePrev}
                  className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 disabled:opacity-20 transition-colors flex-shrink-0"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <span className="text-sm font-bold text-primary truncate max-w-[120px] text-center" style={{ fontSize: currentParshaName.length > 8 ? '0.75rem' : '0.875rem' }}>
                  {currentParshaName}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateToParsha('next')}
                  disabled={!canNavigateNext}
                  className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 disabled:opacity-20 transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="h-5 w-px bg-border mx-1" />
                <PasukSimpleNavigator
                  pesukim={parshaAllPesukim}
                  currentPasukNum={selectedPasuk || filteredPesukim[0]?.pasuk_num || 1}
                  onNavigate={handlePasukSelect}
                />
              </div>
            )}

            <div className="relative" ref={gridRef}>
            <div className={cn(
              "grid gap-2 w-full max-w-full overflow-hidden items-start",
              sidePanelOpen && !isMobile
                ? "lg:grid-cols-[320px_1fr_320px]"
                : "lg:grid-cols-[320px_1fr]"
            )}>
              {/* Quick Selector Sidebar - Hide on mobile when content is showing */}
              {(!isMobile || filteredPesukim.length === 0) && (
                <div data-layout="quick-selector" data-layout-label="בחירה מהירה (סרגל צד)">
                <Suspense fallback={<ComponentLoader />}>
                  <QuickSelector
                    sefer={seferData}
                    selectedParsha={selectedParsha}
                    onParshaSelect={handleParshaSelect}
                    selectedPerek={selectedPerek}
                    onPerekSelect={handlePerekSelect}
                    totalPesukimInPerek={totalPesukimInPerek}
                    selectedPasuk={selectedPasuk}
                    onPasukSelect={handlePasukSelect}
                    onResetToSefer={() => {
                      setSelectedParsha(null);
                      setSelectedPerek(null);
                      setSelectedPasuk(null);
                      setSinglePasukMode(false);
                      setCurrentPasukIndex(0);
                    }}
                  />
                </Suspense>
                </div>
              )}

              {/* Main Content - Verse cards */}
              <div className="w-full min-w-0 overflow-hidden order-first lg:order-none" style={{ maxWidth: "100%" }}>
                {filteredPesukim.length === 0 ? (
                  <Card data-layout="verse-cards" data-layout-label="כרטיסי פסוקים" className="p-12 text-center animate-fade-in">
                    <p className="text-lg text-muted-foreground mb-2">
                      {selectedPasuk !== null && selectedPerek !== null
                        ? `אין תוכן זמין לפסוק ${toHebrewNumber(selectedPasuk)} בפרק ${toHebrewNumber(selectedPerek)}`
                        : selectedPerek !== null
                        ? `אין פסוקים עם תוכן בפרק ${toHebrewNumber(selectedPerek)}`
                        : selectedParsha !== null
                        ? "אין פסוקים עם תוכן בפרשה הנבחרת"
                        : "בחר חומש ופרשה להתחלה"}
                    </p>
                    {selectedPasuk !== null && (
                      <p className="text-sm text-muted-foreground">
                        בחר פסוק עם נקודה ירוקה לצפייה בשאלות ותשובות
                      </p>
                    )}
                  </Card>
                ) : (
                  <Suspense fallback={<ComponentLoader />}>
                    <div data-layout="verse-cards" data-layout-label="כרטיסי פסוקים" className="animate-fade-in"
                      key={`${selectedPerek}-${selectedParsha}-${displayMode}`}
                    >
                      {displayMode === "luxury" ? (
                        <LuxuryTextView pesukim={displayedPesukim} />
                      ) : displayMode === "chumash" ? (
                        <ChumashView 
                          pesukim={displayedPesukim} 
                          seferId={selectedSefer}
                          selectedPasukId={chumashSelectedPasukId}
                          onPasukSelect={handleChumashPasukSelect}
                        />
                      ) : displayMode === "compact" ? (
                        <CompactPasukView pesukim={displayedPesukim} seferId={selectedSefer} forceMinimized={globalMinimize} />
                      ) : (
                        <PaginatedPasukList pesukim={displayedPesukim} seferId={selectedSefer} forceMinimized={globalMinimize} />
                      )}
                    </div>
                  </Suspense>
                )}
              </div>

              {/* Side Content Panel - overlaid on left, aligned to grid top */}
              {!isMobile && (
                <Suspense fallback={null}>
                  <SideContentPanel
                    isOpen={sidePanelOpen}
                    onClose={() => setSidePanelOpen(false)}
                    mode={sidePanelMode}
                    onModeChange={setSidePanelMode}
                    selectedPasuk={sidePanelPasuk}
                    seferId={selectedSefer}
                    availablePesukim={displayedPesukim}
                    onPasukSelect={(pasuk) => {
                      setSidePanelPasuk(pasuk);
                      setChumashSelectedPasukId(pasuk.id);
                    }}
                    inGrid={true}
                  />
                </Suspense>
              )}
            </div>
            </div>

            {/* Side Content Panel - mobile (sheet) */}
            {isMobile && (
              <Suspense fallback={null}>
                <SideContentPanel
                  isOpen={sidePanelOpen}
                  onClose={() => setSidePanelOpen(false)}
                  mode={sidePanelMode}
                  onModeChange={setSidePanelMode}
                  selectedPasuk={sidePanelPasuk}
                  seferId={selectedSefer}
                  availablePesukim={displayedPesukim}
                  onPasukSelect={(pasuk) => {
                    setSidePanelPasuk(pasuk);
                    setChumashSelectedPasukId(pasuk.id);
                  }}
                />
              </Suspense>
            )}
          </>
        )}
      </div>

      {/* Floating Draggable Action Button (Search + Nav) */}
      <Suspense fallback={null}>
        <FloatingActionButton
          onNavigateToPasuk={handleSearchNavigate}
          currentSefer={selectedSefer}
          currentPerek={selectedPerek}
          currentPasuk={selectedPasuk}
        />
      </Suspense>

      {/* Floating multi-select share bar */}
      <MultiShareBar />

    </div>
    </SelectionProvider>
  );
};
export default Index;