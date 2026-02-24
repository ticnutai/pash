import { useState, useRef, useCallback, useEffect } from "react";
import { Search, Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDevice } from "@/contexts/DeviceContext";
import { SearchDialog } from "@/components/SearchDialog";

interface FloatingActionButtonProps {
  onNavigateToPasuk?: (sefer: number, perek: number, pasuk: number) => void;
  onOpenQuickNav?: () => void;
}

export const FloatingActionButton = ({
  onNavigateToPasuk,
  onOpenQuickNav,
}: FloatingActionButtonProps) => {
  const { isMobile } = useDevice();
  const [expanded, setExpanded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Dragging state
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('fab_position');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: 16, y: typeof window !== 'undefined' ? window.innerHeight - 80 : 700 };
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

  const btnSize = isMobile ? "h-12 w-12" : "h-10 w-10";

  return (
    <>
      <div
        ref={fabRef}
        className="fixed z-50"
        style={{ left: position.x, top: position.y }}
      >
        {/* Expanded action buttons */}
        {expanded && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in">
            {/* Search button */}
            <Button
              size="icon"
              className={cn("rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground", btnSize)}
              onClick={() => { setSearchOpen(true); setExpanded(false); }}
              title="חיפוש בתורה"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Quick Navigation button */}
            {onOpenQuickNav && (
              <Button
                size="icon"
                className={cn("rounded-full shadow-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground", btnSize)}
                onClick={() => { onOpenQuickNav(); setExpanded(false); }}
                title="ניווט מהיר"
              >
                <Navigation className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}

        {/* Main FAB - Draggable */}
        <div
          className={cn(
            "rounded-full shadow-xl cursor-grab active:cursor-grabbing touch-manipulation select-none",
            "bg-accent text-accent-foreground border-2 border-accent flex items-center justify-center",
            "transition-transform duration-150",
            isDragging && "scale-110 opacity-80",
            isMobile ? "h-14 w-14" : "h-11 w-11"
          )}
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
    </>
  );
};
