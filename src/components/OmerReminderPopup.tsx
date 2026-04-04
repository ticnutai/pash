import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Sparkles, X } from "lucide-react";
import type { OmerReminder } from "@/hooks/useOmerReminders";

interface OmerReminderPopupProps {
  reminder: OmerReminder | null;
  onDismiss: () => void;
}

export function OmerReminderPopup({ reminder, onDismiss }: OmerReminderPopupProps) {
  if (!reminder) return null;

  // Split message into lines for beautiful display
  const lines = reminder.message.split("\n").filter(Boolean);

  return (
    <Dialog open={!!reminder} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-[460px] text-center p-0 overflow-hidden max-h-[90vh] overflow-y-auto" dir="rtl">
        {/* Decorative header gradient */}
        <div className="relative bg-gradient-to-b from-amber-100 via-amber-50 to-transparent dark:from-amber-900/30 dark:via-amber-900/10 dark:to-transparent pt-8 pb-4 px-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%221%22%20fill%3D%22%23DAA520%22%20opacity%3D%220.15%22/%3E%3C/svg%3E')] pointer-events-none" />
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-3 text-2xl font-bold">
              <Sparkles className="h-7 w-7 text-amber-500 animate-pulse" />
              <span className="bg-gradient-to-l from-amber-600 to-amber-800 bg-clip-text text-transparent dark:from-amber-300 dark:to-amber-500">
                ספירת העומר
              </span>
              <Sparkles className="h-7 w-7 text-amber-500 animate-pulse" />
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Candle icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/30 flex items-center justify-center shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30 ring-2 ring-amber-300/50 dark:ring-amber-600/30">
            <span className="text-4xl">🕯️</span>
          </div>

          {/* Blessing & count text */}
          <div className="space-y-3 text-right">
            {lines.map((line, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "text-lg font-bold leading-relaxed text-center px-2"  // Blessing
                    : i === 1
                    ? "text-base font-semibold text-amber-700 dark:text-amber-400 text-center" // Count
                    : "text-sm text-muted-foreground text-center" // Sefira / extra
                }
              >
                {line}
              </p>
            ))}
          </div>

          {/* Label */}
          <p className="text-xs text-muted-foreground font-medium">{reminder.label}</p>

          {/* Actions */}
          <div className="flex gap-3 justify-center pt-2">
            <Button onClick={onDismiss} variant="outline" className="gap-2 rounded-full px-5">
              <X className="h-4 w-4" />
              סגור
            </Button>
            <Button
              onClick={onDismiss}
              className="gap-2 rounded-full px-5 bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
            >
              <Bell className="h-4 w-4" />
              ספרתי!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
