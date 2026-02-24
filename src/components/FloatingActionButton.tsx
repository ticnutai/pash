import { useState, useRef, useCallback, useEffect } from "react";
import { Search, Navigation, X, Bookmark, StickyNote, Share2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevice } from "@/contexts/DeviceContext";
import { SearchDialog } from "@/components/SearchDialog";
import { sharePasukLink } from "@/utils/shareUtils";

interface FloatingActionButtonProps {
  onNavigateToPasuk?: (sefer: number, perek: number, pasuk: number) => void;
  onOpenQuickNav?: () => void;
  currentSefer?: number;
  currentPerek?: number | null;
  currentPasuk?: number | null;
}

const FAB_ACTIONS = [
  { id: "search", icon: Search, label: "חיפוש", color: "bg-primary text-primary-foreground" },
  { id: "nav", icon: Navigation, label: "ניווט מהיר", color: "bg-secondary text-secondary-foreground" },
  { id: "bookmarks", icon: Bookmark, label: "סימניות", color: "bg-accent text-accent-foreground" },
  { id: "notes", icon: StickyNote, label: "הערות", color: "bg-muted text-muted-foreground" },
  { id: "share", icon: Share2, label: "שתף פסוק", color: "bg-primary text-primary-foreground" },
  { id: "settings", icon: Settings, label: "הגדרות", color: "bg-secondary text-secondary-foreground" },
] as const;

export const FloatingActionButton = ({
  onNavigateToPasuk,
  onOpenQuickNav,
  currentSefer,
  currentPerek,
  currentPasuk,
}: FloatingActionButtonProps) => {
  const { isMobile } = useDevice();
  const [expanded, setExpanded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);

  // Dragging state
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('fab_position');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof window !== 'undefined') {
          const maxX = window.innerWidth - 60;
          const maxY = window.innerHeight - 60;
          return { x: Math.min(Math.max(0, parsed.x), maxX), y: Math.min(Math.max(0, parsed.y), maxY) };
        }
        return parsed;
      }
    } catch {}
    return { x: 16, y: typeof window !== 'undefined' ? window.innerHeight - 120 : 600 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const hasMoved = useRef(false);
  const fabRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    hasMoved.current = false;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startX: position.x,
      startY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved.current = true;

    const newX = Math.max(0, Math.min(window.innerWidth - 56, dragStart.current.startX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, dragStart.current.startY + dy));
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem('fab_position', JSON.stringify(position));
      if (!hasMoved.current) {
        setExpanded(prev => !prev);
      }
    }
  }, [isDragging, position]);

  // Close expanded menu when clicking outside
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  // Ctrl+K opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleAction = useCallback((actionId: string) => {
    setExpanded(false);
    switch (actionId) {
      case "search":
        setSearchOpen(true);
        break;
      case "nav":
        onOpenQuickNav?.();
        break;
      case "bookmarks":
        setBookmarksOpen(true);
        break;
      case "notes":
        // Scroll to top to access notes in the current pasuk
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case "share":
        if (currentSefer && currentPerek && currentPasuk) {
          sharePasukLink(currentSefer, currentPerek, currentPasuk);
        } else {
          // Share app link
          if (navigator.share) {
            navigator.share({ title: "חמישה חומשי תורה", url: window.location.origin }).catch(() => {});
          } else {
            navigator.clipboard.writeText(window.location.href);
            import("sonner").then(({ toast }) => toast.success("הקישור הועתק!"));
          }
        }
        break;
      case "settings":
        // Click the settings button that's already rendered
        const settingsBtn = document.querySelector('[data-settings-trigger]') as HTMLElement;
        if (settingsBtn) settingsBtn.click();
        break;
    }
  }, [onOpenQuickNav, currentSefer, currentPerek, currentPasuk]);

  // Determine menu expansion direction based on position
  const isNearBottom = position.y > window.innerHeight / 2;
  const isNearRight = position.x > window.innerWidth / 2;

  const btnSize = isMobile ? "h-11 w-11" : "h-9 w-9";
  const mainSize = isMobile ? "h-14 w-14" : "h-11 w-11";
  const iconSize = isMobile ? "h-4.5 w-4.5" : "h-4 w-4";

  return (
    <>
      <div
        ref={fabRef}
        className="fixed z-[60]"
        style={{ left: position.x, top: position.y }}
      >
        {/* Expanded action buttons - arc layout */}
        {expanded && (
          <div className="absolute animate-fade-in" style={{
            [isNearBottom ? 'bottom' : 'top']: isMobile ? '60px' : '48px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <div className={cn(
              "flex flex-wrap items-center justify-center gap-2 p-2 rounded-2xl",
              "bg-popover/95 backdrop-blur-sm border border-border shadow-2xl",
              "max-w-[200px]"
            )}>
              {FAB_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    className={cn(
                      "rounded-full shadow-md flex items-center justify-center transition-all duration-200",
                      "hover:scale-110 active:scale-95",
                      btnSize,
                      action.color
                    )}
                    title={action.label}
                  >
                    <Icon className={iconSize} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main FAB - Draggable */}
        <div
          className={cn(
            "rounded-full shadow-xl cursor-grab active:cursor-grabbing select-none",
            "bg-accent text-accent-foreground border-2 border-accent flex items-center justify-center",
            "transition-transform duration-150",
            isDragging && "scale-110 opacity-80",
            mainSize
          )}
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {expanded ? (
            <X className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
          ) : (
            <Search className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
          )}
        </div>
      </div>

      {/* Search Dialog */}
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onNavigateToPasuk={onNavigateToPasuk}
      />

      {/* Bookmarks - trigger existing dialog */}
      {bookmarksOpen && <BookmarksTrigger onDone={() => setBookmarksOpen(false)} />}
    </>
  );
};

/** Finds and clicks the existing bookmarks trigger in the DOM */
function BookmarksTrigger({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const trigger = document.querySelector('[data-bookmarks-trigger]') as HTMLElement;
    if (trigger) trigger.click();
    onDone();
  }, [onDone]);
  return null;
}
