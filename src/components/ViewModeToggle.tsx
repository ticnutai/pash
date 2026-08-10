import { Button } from "@/components/ui/button";
import { useDisplayMode } from "@/contexts/DisplayModeContext";

interface ViewModeToggleProps {
  seferId: number;
}

export const ViewModeToggle = ({ seferId: _seferId }: ViewModeToggleProps) => {
  const { displaySettings, updateDisplaySettings } = useDisplayMode();
  const safeSettings = displaySettings || { mode: 'compact' as const, pasukCount: 10 };

  return (
    <div className="inline-flex items-center" dir="rtl">
      <div className="inline-flex items-center gap-2 rounded-2xl border border-accent/35 bg-card/95 p-1.5 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => updateDisplaySettings({ mode: "compact" })}
          aria-label="שאלות ומפרשים"
          aria-pressed={safeSettings.mode === "compact"}
          title="שאלות ומפרשים"
          className={`h-9 whitespace-nowrap rounded-xl border px-2.5 text-[11px] font-bold leading-none shadow-sm transition-all sm:px-3.5 sm:text-xs ${
            safeSettings.mode === "compact"
              ? "border-accent bg-accent text-accent-foreground shadow-md hover:bg-accent/90"
              : "border-border/70 bg-background/80 text-primary hover:border-accent/50 hover:bg-accent/10"
          }`}
        >
          שאלות ומפרשים
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => updateDisplaySettings({ mode: "luxury" })}
          aria-label="חומש ומפרשים"
          aria-pressed={safeSettings.mode === "luxury"}
          title="חומש ומפרשים"
          className={`h-9 whitespace-nowrap rounded-xl border px-2.5 text-[11px] font-bold leading-none shadow-sm transition-all sm:px-3.5 sm:text-xs ${
            safeSettings.mode === "luxury"
              ? "border-accent bg-accent text-accent-foreground shadow-md hover:bg-accent/90"
              : "border-border/70 bg-background/80 text-primary hover:border-accent/50 hover:bg-accent/10"
          }`}
        >
          חומש ומפרשים
        </Button>
      </div>

    </div>
  );
};
