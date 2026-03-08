import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Check } from "lucide-react";
import { ALL_COMMENTATORS, CommentatorConfig, CommentaryMode } from "@/hooks/useCommentaries";

interface CommentaryPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configs: CommentatorConfig[];
  onSave: (configs: CommentatorConfig[]) => void;
}

const MODE_LABELS: Record<CommentaryMode, string> = {
  off: "כבוי",
  inline: "תמיד",
  click: "לחיצה",
};

const MODE_CYCLE: Record<CommentaryMode, CommentaryMode> = {
  off: "inline",
  inline: "click",
  click: "off",
};

export function CommentaryPickerDialog({
  open,
  onOpenChange,
  configs,
  onSave,
}: CommentaryPickerDialogProps) {
  // Local copy we edit before saving
  const [local, setLocal] = useState<CommentatorConfig[]>(() =>
    [...configs].sort((a, b) => a.order - b.order)
  );

  // Reset local state whenever the dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setLocal([...configs].sort((a, b) => a.order - b.order));
      }
      onOpenChange(isOpen);
    },
    [configs, onOpenChange]
  );

  const toggleMode = (id: string) => {
    setLocal((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, mode: MODE_CYCLE[c.mode] } : c
      )
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setLocal((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((c, i) => ({ ...c, order: i }));
    });
  };

  const moveDown = (index: number) => {
    setLocal((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((c, i) => ({ ...c, order: i }));
    });
  };

  const handleSave = () => {
    onSave(local.map((c, i) => ({ ...c, order: i })));
    onOpenChange(false);
  };

  const activeCount = local.filter((c) => c.mode !== "off").length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm w-full" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">בחירת מפרשים</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground text-right -mt-1 mb-2">
          לחץ על שם המפרש כדי לשנות מצב • גרור בחצים לשינוי סדר
        </p>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pb-1">
          {local.map((config, index) => {
            const isActive = config.mode !== "off";
            return (
              <div
                key={config.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors",
                  isActive
                    ? "border-[#c8a04d]/60 bg-[#c8a04d]/8"
                    : "border-border bg-muted/30"
                )}
              >
                {/* Order arrows */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === local.length - 1}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Order badge */}
                <span className="text-[10px] w-4 text-center text-muted-foreground font-mono shrink-0">
                  {isActive ? index + 1 : "–"}
                </span>

                {/* Commentator name — click to cycle mode */}
                <button
                  onClick={() => toggleMode(config.id)}
                  className="flex-1 text-right font-bold text-sm"
                  style={{ color: isActive ? "#c8a04d" : "hsl(var(--muted-foreground))" }}
                >
                  {config.hebrewName}
                </button>

                {/* Mode badge */}
                <button
                  onClick={() => toggleMode(config.id)}
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors shrink-0",
                    config.mode === "inline" &&
                      "bg-[#c8a04d]/20 border-[#c8a04d]/60 text-[#c8a04d]",
                    config.mode === "click" &&
                      "bg-blue-500/10 border-blue-500/40 text-blue-500",
                    config.mode === "off" &&
                      "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {MODE_LABELS[config.mode]}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {activeCount > 0 ? `${activeCount} מפרשים פעילים` : "כל המפרשים כבויים"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="gap-1.5 bg-[#c8a04d] hover:bg-[#b8903d] text-white border-0"
            >
              <Check className="h-3.5 w-3.5" />
              שמור
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
