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
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed left-0 z-[35] flex items-center justify-center",
        "w-7 h-14 rounded-r-lg",
        "bg-accent/90 text-accent-foreground shadow-lg border border-l-0 border-accent",
        "hover:bg-accent hover:w-8 transition-all duration-200",
        "backdrop-blur-sm"
      )}
      style={{
        // Align with the parshiot frame - matches the grid layout top position
        top: "calc(50vh - 28px)",
      }}
      title={isOpen ? "סגור פאנל" : "פתח פירושים / התוכן שלי"}
      aria-label={isOpen ? "סגור פאנל" : "פתח פאנל צידי"}
    >
      {isOpen ? (
        <ChevronLeft className="h-5 w-5" />
      ) : (
        <ChevronRight className="h-5 w-5" />
      )}
    </button>
  );
};
