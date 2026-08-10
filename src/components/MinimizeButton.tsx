import { Expand, Shrink } from "lucide-react";
import { useTextDisplayStyles } from "@/hooks/useTextDisplayStyles";
import { Button } from "./ui/button";

interface MinimizeButtonProps {
  isMinimized: boolean;
  onClick: () => void;
  className?: string;
  variant?: "global" | "individual";
}

export const MinimizeButton = ({ 
  isMinimized, 
  onClick, 
  className = "",
  variant = "individual" 
}: MinimizeButtonProps) => {
  const { isMobile } = useTextDisplayStyles();
  
  const tooltips = {
    global: isMinimized ? "הרחב את כל הפסוקים" : "מזער את כל הפסוקים",
    individual: isMinimized ? "הרחב פסוק" : "מזער פסוק"
  };
  const isGlobal = variant === "global";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`
        ${isGlobal ? 'h-10 w-10 rounded-xl shadow-sm' : 'h-7 w-7 rounded-md'} p-0 shrink-0
        ${variant === "individual" && !isMobile ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} 
        transition-all duration-200
        ${isGlobal && !isMinimized
          ? 'border-primary/60 bg-primary/10 text-primary ring-2 ring-primary/15 hover:bg-primary/20'
          : 'border-border bg-background/90 text-primary hover:border-primary/40 hover:bg-accent/20'}
        border
        ${className}
      `}
      title={tooltips[variant]}
      aria-label={tooltips[variant]}
      aria-pressed={!isMinimized}
    >
      {isMinimized ? (
        <Expand className={isGlobal ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2.4} />
      ) : (
        <Shrink className={isGlobal ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2.4} />
      )}
    </Button>
  );
};
