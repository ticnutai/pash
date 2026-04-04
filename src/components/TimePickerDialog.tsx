import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hour: number;
  minute: number;
  onConfirm: (hour: number, minute: number) => void;
}

export function TimePickerDialog({ open, onOpenChange, hour, minute, onConfirm }: TimePickerDialogProps) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setH(hour); setM(minute); }
  }, [open, hour, minute]);

  // Scroll selected item into view on open
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      hourRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: "center" });
      minRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: "center" });
    }, 50);
    return () => clearTimeout(t);
  }, [open, h, m]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[320px] sm:w-[360px] p-0 gap-0" dir="rtl">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-center text-lg font-bold">בחר שעה</DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="text-center py-3" dir="ltr">
          <span className="text-4xl font-mono font-bold tracking-wider tabular-nums">
            {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
          </span>
        </div>

        {/* Scrollable columns */}
        <div className="flex gap-2 px-4 pb-2" dir="ltr">
          {/* Hours */}
          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground font-medium mb-1">שעה</p>
            <div
              ref={hourRef}
              className="h-[200px] overflow-y-auto rounded-lg border bg-muted/30 scrollbar-thin"
            >
              {hours.map((v) => (
                <button
                  key={v}
                  type="button"
                  data-selected={v === h}
                  onClick={() => setH(v)}
                  className={cn(
                    "w-full py-2 text-center text-base font-mono tabular-nums transition-colors",
                    v === h
                      ? "bg-amber-500 text-white font-bold"
                      : "hover:bg-accent"
                  )}
                >
                  {String(v).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

          {/* Minutes */}
          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground font-medium mb-1">דקה</p>
            <div
              ref={minRef}
              className="h-[200px] overflow-y-auto rounded-lg border bg-muted/30 scrollbar-thin"
            >
              {minutes.map((v) => (
                <button
                  key={v}
                  type="button"
                  data-selected={v === m}
                  onClick={() => setM(v)}
                  className={cn(
                    "w-full py-2 text-center text-base font-mono tabular-nums transition-colors",
                    v === m
                      ? "bg-amber-500 text-white font-bold"
                      : "hover:bg-accent"
                  )}
                >
                  {String(v).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 pt-2 border-t">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            ביטול
          </Button>
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => { onConfirm(h, m); onOpenChange(false); }}
          >
            אישור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
