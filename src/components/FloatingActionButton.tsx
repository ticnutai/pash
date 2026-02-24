import { useState, useRef, useCallback, useEffect } from "react";
import { Search, Navigation, X, Bookmark, StickyNote, Share2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevice } from "@/contexts/DeviceContext";
import { SearchDialog } from "@/components/SearchDialog";
import { sharePasukLink } from "@/utils/shareUtils";
import { Input } from "@/components/ui/input";

interface FloatingActionButtonProps {
  onNavigateToPasuk?: (sefer: number, perek: number, pasuk: number) => void;
  onOpenQuickNav?: () => void;
  currentSefer?: number;
  currentPerek?: number | null;
  currentPasuk?: number | null;
}

const FAB_ACTIONS = [
  { id: "search", icon: Search, label: "חיפוש" },
  { id: "nav", icon: Navigation, label: "ניווט מהיר" },
  { id: "bookmarks", icon: Bookmark, label: "סימניות" },
  { id: "notes", icon: StickyNote, label: "הערות" },
  { id: "share", icon: Share2, label: "שתף פסוק" },
  { id: "settings", icon: Settings, label: "הגדרות" },
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
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Focus search input when expanded
  useEffect(() => {
    if (expanded) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery("");
    }
  }, [expanded]);

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
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case "share":
        if (currentSefer && currentPerek && currentPasuk) {
          sharePasukLink(currentSefer, currentPerek, currentPasuk);
        } else {
          if (navigator.share) {
            navigator.share({ title: "חמישה חומשי תורה", url: window.location.origin }).catch(() => {});
          } else {
            navigator.clipboard.writeText(window.location.href);
            import("sonner").then(({ toast }) => toast.success("הקישור הועתק!"));
          }
        }
        break;
      case "settings":
        const settingsBtn = document.querySelector('[data-settings-trigger]') as HTMLElement;
        if (settingsBtn) settingsBtn.click();
        break;
    }
  }, [onOpenQuickNav, currentSefer, currentPerek, currentPasuk]);

  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      setExpanded(false);
      setSearchOpen(true);
      // Pass query via a brief delay so dialog mounts first
      setTimeout(() => {
        const input = document.querySelector('[data-search-dialog-input]') as HTMLInputElement;
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          nativeInputValueSetter?.call(input, searchQuery.trim());
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 200);
    }
  }, [searchQuery]);

  // Determine menu expansion direction based on position
  const isNearBottom = position.y > window.innerHeight / 2;

  const mainSize = isMobile ? "h-14 w-14" : "h-11 w-11";

  return (
    <>
      <div
        ref={fabRef}
        className="fixed z-[60]"
        style={{ left: position.x, top: position.y }}
      >
        {/* Expanded panel: icons row + search input */}
        {expanded && (
          <div 
            className="absolute animate-fade-in"
            style={{
              [isNearBottom ? 'bottom' : 'top']: isMobile ? '60px' : '48px',
              // Keep menu inside viewport: if FAB is near left edge, open to the right; otherwise open to the left
              ...(position.x < 230 ? { left: 0 } : { right: 0 }),
            }}
          >
            <div className={cn(
              "flex flex-col items-stretch gap-2 p-2.5 rounded-2xl",
              "bg-popover/95 backdrop-blur-md border border-border shadow-2xl",
              "w-[220px]"
            )}>
              {/* Action icons row */}
              <div className="flex items-center justify-center gap-1.5">
                {FAB_ACTIONS.filter(a => a.id !== "search").map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.id)}
                      className={cn(
                        "rounded-full flex items-center justify-center transition-all duration-200",
                        "hover:scale-110 active:scale-95",
                        "h-9 w-9 bg-muted/60 text-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      title={action.label}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative" dir="rtl">
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchSubmit();
                  }}
                  placeholder="חיפוש בתורה..."
                  className="h-9 text-sm pr-9 rounded-xl bg-background/80"
                />
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
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
