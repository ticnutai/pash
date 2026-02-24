import { useEffect, useState, useRef } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidePanelTriggerProps {
  isOpen: boolean;
  onClick: () => void;
}

/**
 * Persistent arrow icon on the left side of the screen that opens/closes the SideContentPanel.
 * Vertically aligned with the parshiot (QuickSelector) frame.
 */
export const SidePanelTrigger = ({ isOpen, onClick }: SidePanelTriggerProps) => {
  const [topOffset, setTopOffset] = useState<number | null>(null);

  useEffect(() => {
    const findQuickSelector = () => {
      // Find the QuickSelector card element to align with its top
      const qs = document.querySelector('[data-quick-selector]');
      if (qs) {
        const rect = qs.getBoundingClientRect();
        setTopOffset(rect.top + window.scrollY);
      }
    };

    // Try immediately and after a delay (for lazy-loaded components)
    findQuickSelector();
    const timer = setTimeout(findQuickSelector, 500);
    const timer2 = setTimeout(findQuickSelector, 1500);

    window.addEventListener('resize', findQuickSelector);
    window.addEventListener('scroll', findQuickSelector);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('resize', findQuickSelector);
      window.removeEventListener('scroll', findQuickSelector);
    };
  }, []);

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed left-0 z-[35] flex items-center justify-center",
        "w-6 h-12 rounded-r-lg",
        "bg-accent/90 text-accent-foreground shadow-md border border-l-0 border-accent/50",
        "hover:bg-accent hover:w-7 transition-all duration-200",
        "backdrop-blur-sm"
      )}
      style={{
        top: topOffset ? `${topOffset}px` : "calc(50vh - 24px)",
      }}
      title={isOpen ? "סגור פאנל" : "פתח פירושים / התוכן שלי"}
      aria-label={isOpen ? "סגור פאנל" : "פתח פאנל צידי"}
    >
      {isOpen ? (
        <ChevronLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </button>
  );
};
