import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from "react";
import { Book, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { MobileTypographySheet } from "@/components/MobileTypographySheet";
import { Sefer, FlatPasuk } from "@/types/torah";
import { SeferSelector } from "@/components/SeferSelector";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { UserMenu } from "@/components/UserMenu";
import { SyncIndicator } from "@/components/SyncIndicator";
import { GlobalSearchTrigger } from "@/components/GlobalSearchTrigger";
import { TextDisplaySettings } from "@/components/TextDisplaySettings";
import { DevicePreview } from "@/components/DevicePreview";
import { MinimizeButton } from "@/components/MinimizeButton";
import { PasukSimpleNavigator } from "@/components/PasukSimpleNavigator";
import { ReadingProgress } from "@/components/ReadingProgress";
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
import { yieldToMain } from "@/utils/asyncHelpers";
import { lazyLoadSefer, preloadNextSefer } from "@/utils/lazyLoadSefer";
import { usePinchZoom } from "@/hooks/usePinchZoom";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// Lazy load heavy components - split by usage priority
// Critical components (loaded when mode is active)
const CompactPasukView = lazy(() => import("@/components/CompactPasukView").then(m => ({ default: m.CompactPasukView })));
const PaginatedPasukList = lazy(() => import("@/components/PaginatedPasukList").then(m => ({ default: m.PaginatedPasukList })));
const LuxuryTextView = lazy(() => import("@/components/LuxuryTextView").then(m => ({ default: m.LuxuryTextView })));

// Navigation components (loaded after initial render)
const QuickSelector = lazy(() => import("@/components/QuickSelector").then(m => ({ default: m.QuickSelector })));
const FloatingQuickSelector = lazy(() => import("@/components/FloatingQuickSelector").then(m => ({ default: m.FloatingQuickSelector })));
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
  const weeklyParshaLoadedRef = useRef(false);
  
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

    const isIsrael = getCalendarPreference();
    const weeklyParsha = getCurrentWeeklyParsha(isIsrael);

    if (weeklyParsha) {
      setSelectedSefer(weeklyParsha.sefer);
      setSelectedParsha(weeklyParsha.parshaId);
      setSelectedPerek(null); // Will be set by next effect
      setSelectedPasuk(null);
      setSinglePasukMode(false);
      weeklyParshaLoadedRef.current = true;
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
  }, [searchParams, initialLoadDone]);

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
  }, [searchParams]);

  // Cache for loaded sefarim to avoid re-loading
  const seferCache = useMemo(() => new Map<number, Sefer>(), []);
  
  // Load sefer on demand (lazy loading) with non-blocking parsing
  useEffect(() => {
    const loadSefer = async () => {
      // Check cache first
      if (seferCache.has(selectedSefer)) {
        setSeferData(seferCache.get(selectedSefer)!);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadingProgress(0);
      try {
        const seferNames: Record<number, string> = {
          1: "בראשית",
          2: "שמות", 
          3: "ויקרא",
          4: "במדבר",
          5: "דברים"
        };
        
        // Use lazy loading helper for better code splitting
        (async () => {
          try {
            setLoadingProgress(30);
            
            // Load sefer using dynamic import (better code splitting)
            const sefer = await lazyLoadSefer(selectedSefer);
            setLoadingProgress(60);
            
            // Yield to main thread to prevent blocking
            await yieldToMain();
            
            setLoadingProgress(80);
            
            // Cache the loaded sefer
            seferCache.set(selectedSefer, sefer);
            setSeferData(sefer);
            
            // Only reset selections if this isn't the weekly parsha initial load
            if (!weeklyParshaLoadedRef.current) {
              setSelectedParsha(null);
              setSelectedPerek(null);
              setSelectedPasuk(null);
            } else {
              // After first load with weekly parsha, reset the flag
              weeklyParshaLoadedRef.current = false;
            }
            
            setLoadingProgress(100);
            setLoading(false);
            
            // Preload next sefer in background for smooth navigation
            preloadNextSefer(selectedSefer);
          } catch (err) {
            console.error("Error loading sefer:", err);
            toast.error("שגיאה בטעינת החומש");
            setLoading(false);
          }
        })();
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("שגיאה בטעינת החומש");
        setLoading(false);
      }
    };

    loadSefer();
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

  // Auto-select first perek when parsha is selected
  useEffect(() => {
    if (selectedParsha !== null && selectedPerek === null && flattenedPesukim.length > 0) {
      const parshaPerakim = flattenedPesukim.filter(p => p.parsha_id === selectedParsha);
      if (parshaPerakim.length > 0) {
        const firstPerek = parshaPerakim[0].perek;
        setSelectedPerek(firstPerek);
      }
    }
  }, [selectedParsha, selectedPerek, flattenedPesukim]);

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
    setSelectedPerek(null); // Will be auto-selected by effect
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
    
    // Find the selected pasuk to get its perek
    const selectedPasukData = flattenedPesukim.find(pasuk => 
      pasuk.pasuk_num === p && 
      (selectedParsha === null || pasuk.parsha_id === selectedParsha)
    );
    
    // Update perek if the pasuk is from a different perek
    if (selectedPasukData && selectedPasukData.perek !== selectedPerek) {
      setSelectedPerek(selectedPasukData.perek);
    }
    
    if (displayMode === "compact") {
      setSelectedPasuk(p);
      setSinglePasukMode(false);
    } else {
      const perekPesukim = flattenedPesukim.filter(pasuk => 
        pasuk.perek === (selectedPasukData?.perek || selectedPerek) && 
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background pb-20 overflow-x-hidden">
      {/* Header - Fully Responsive */}
      <header className="sticky top-0 z-50 bg-gradient-to-l from-primary via-primary to-sidebar-background shadow-lg">
        <div className="w-full px-3 sm:px-4 py-3 sm:py-6 bg-blue-950 sm:rounded-3xl">
          {/* Mobile Layout - Stack vertically */}
          <div className="flex flex-col gap-2 md:hidden">
            {/* Top row: Title and Book icon */}
            <div className="flex items-center justify-center gap-2 px-2">
              <Book className="h-5 w-5 text-accent flex-shrink-0" />
              <h1 className="text-sm font-bold text-primary-foreground text-center leading-snug break-words max-w-[90%]">
                חמישה חומשי תורה - שאלות ופירושים
              </h1>
            </div>
            
            {/* Bottom row: Action buttons - single line */}
            <div className="flex items-center justify-center gap-1.5 px-2">
              <SyncIndicator status={syncStatus} />
              <TextDisplaySettings />
              <GlobalSearchTrigger />
              <UserMenu />
            </div>
          </div>

          {/* Desktop/Tablet Layout - Original horizontal layout */}
          <div className="hidden md:flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 order-1">
              <SyncIndicator status={syncStatus} />
              {process.env.NODE_ENV === 'development' && <DevicePreview />}
              <TextDisplaySettings />
              <GlobalSearchTrigger />
              <UserMenu />
            </div>
            <div className="flex items-center gap-3 order-2 lg:order-none flex-1 lg:flex-initial justify-center">
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
        <Settings />
      </Suspense>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Sefer / Parsha / Perek / Pasuk Selector */}
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

        {/* View Mode Toggle and Global Minimize - Below Sefarim (Desktop only) */}
        <div className="hidden md:flex justify-start items-center gap-2">
          <MobileTypographySheet />
          <ViewModeToggle seferId={selectedSefer} />
          {filteredPesukim.length > 0 && (
            <MinimizeButton
              variant="global"
              isMinimized={globalMinimize}
              onClick={() => setGlobalMinimize(!globalMinimize)}
            />
          )}
        </div>

        {loading ? (
          <SeferSkeleton />
        ) : (
          <div className="grid lg:grid-cols-[320px_1fr] gap-6 w-full max-w-full overflow-hidden">
            {/* Quick Selector Sidebar - Hide on mobile when content is showing */}
            {(!isMobile || filteredPesukim.length === 0) && (
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
                />
              </Suspense>
            )}

            {/* Main Content */}
            <div className="space-y-4 w-full min-w-0 overflow-hidden" style={{ maxWidth: "100%" }}>
              {/* Navigation bar - Pasuk on right, chapter/verse display in center, Parsha on left */}
              {currentParshaName && filteredPesukim.length > 0 && (
                <div className="w-full">
                  {/* Mobile layout: single clean row with pasuk nav and parsha name */}
                  <div className="flex md:hidden items-center justify-between gap-2 w-full">
                    {/* Pasuk navigation - right side, takes remaining space */}
                      {parshaAllPesukim.length > 0 && displayMode === "compact" && (
                      <div className="flex-1 min-w-0">
                        <PasukSimpleNavigator
                          pesukim={parshaAllPesukim}
                          currentPasukNum={selectedPasuk || filteredPesukim[0]?.pasuk_num || 1}
                          onNavigate={handlePasukSelect}
                        />
                      </div>
                    )}

                    {/* Parsha name & arrows - left side, fixed width to avoid wrapping */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigateToParsha('prev')}
                        disabled={!canNavigatePrev}
                        className="h-8 w-8 p-0 hover:bg-primary/20 disabled:opacity-30 transition-colors"
                        title="פרשה קודמת"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>

                      <span className="text-lg font-semibold text-primary truncate max-w-[8rem] text-center">
                        {currentParshaName}
                      </span>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigateToParsha('next')}
                        disabled={!canNavigateNext}
                        className="h-8 w-8 p-0 hover:bg-primary/20 disabled:opacity-30 transition-colors"
                        title="פרשה הבאה"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Desktop layout: original 3-part bar */}
                  <div className="hidden md:flex items-center justify-between gap-2 w-full">
                    {/* Pasuk navigation - right side */}
                      {parshaAllPesukim.length > 0 && displayMode === "compact" && (
                      <PasukSimpleNavigator
                        pesukim={parshaAllPesukim}
                        currentPasukNum={selectedPasuk || filteredPesukim[0]?.pasuk_num || 1}
                        onNavigate={handlePasukSelect}
                      />
                    )}

                    {/* Chapter and verse display - center */}
                    {selectedPerek && (selectedPasuk || filteredPesukim[0]) && (
                      <div className="text-center">
                        <span className="text-sm font-medium text-foreground">
                          פרק {toHebrewNumber(selectedPerek)} פסוק {toHebrewNumber(selectedPasuk || filteredPesukim[0]?.pasuk_num || 1)}
                        </span>
                      </div>
                    )}
                    
                    {/* Parsha navigation - left side */}
                    <div className="flex items-center justify-center gap-3 py-2 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateToParsha('prev')}
                        disabled={!canNavigatePrev}
                        className="h-8 w-8 p-0 hover:bg-primary/20 disabled:opacity-30 transition-colors"
                        title="פרשה קודמת"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-lg font-semibold text-primary">
                          {currentParshaName}
                        </span>
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateToParsha('next')}
                        disabled={!canNavigateNext}
                        className="h-8 w-8 p-0 hover:bg-primary/20 disabled:opacity-30 transition-colors"
                        title="פרשה הבאה"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reading progress bar */}
              {parshaAllPesukim.length > 0 && selectedPasuk !== null && (
                <ReadingProgress
                  totalPesukim={parshaAllPesukim.length}
                  currentPasukIndex={parshaAllPesukim.findIndex(p => p.pasuk_num === selectedPasuk && p.perek === selectedPerek)}
                  parshaName={currentParshaName}
                />
              )}
              
              {/* Mobile controls */}
              {isMobile && (
                <div className="flex items-center gap-2 flex-nowrap">
                  <MobileTypographySheet />
                  <ViewModeToggle seferId={selectedSefer} />
                </div>
              )}
              
              {filteredPesukim.length === 0 ? (
                <Card className="p-12 text-center animate-fade-in">
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
                  <div className="animate-fade-in"
                    key={`${selectedPerek}-${selectedParsha}-${displayMode}`}
                  >
                    {displayMode === "luxury" ? (
                      <LuxuryTextView pesukim={displayedPesukim} />
                    ) : displayMode === "compact" ? (
                      <CompactPasukView pesukim={displayedPesukim} seferId={selectedSefer} forceMinimized={globalMinimize} />
                    ) : (
                      <PaginatedPasukList pesukim={displayedPesukim} seferId={selectedSefer} forceMinimized={globalMinimize} />
                    )}
                  </div>
                </Suspense>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Quick Selector */}
      <Suspense fallback={null}>
        <FloatingQuickSelector
          sefer={seferData}
          selectedParsha={selectedParsha}
          onParshaSelect={handleParshaSelect}
          selectedPerek={selectedPerek}
          onPerekSelect={handlePerekSelect}
          totalPesukimInPerek={totalPesukimInPerek}
          selectedPasuk={selectedPasuk}
          onPasukSelect={handlePasukSelect}
        />
      </Suspense>
    </div>
  );
};
export default Index;