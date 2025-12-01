import { Minimize2, Maximize2 } from "lucide-react";
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

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`
        h-7 w-7 p-0 shrink-0
        ${variant === "individual" && !isMobile ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} 
        transition-opacity duration-200
        bg-background/80 hover:bg-accent/20
        border border-border
        rounded-md
        ${className}
      `}
      title={tooltips[variant]}
      aria-label={tooltips[variant]}
    >
      {isMinimized ? (
        <Maximize2 className="h-4 w-4 text-primary" />
      ) : (
        <Minimize2 className="h-4 w-4 text-primary" />
      )}
    </Button>
  );
};
