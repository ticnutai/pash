import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const FIRST_VISIT_KEY = "first-time-tooltips-shown";

/** Check if first-time tooltips have already been dismissed */
export const hasSeenFirstTimeTooltips = (storageKey = FIRST_VISIT_KEY): boolean => {
  try {
    return localStorage.getItem(storageKey) === "true";
  } catch {
    return false;
  }
};

/** Mark first-time tooltips as seen */
export const dismissFirstTimeTooltips = (storageKey = FIRST_VISIT_KEY) => {
  try {
    localStorage.setItem(storageKey, "true");
  } catch {}
};

/** Reset tooltips (for testing) */
export const resetFirstTimeTooltips = (storageKey = FIRST_VISIT_KEY) => {
  try {
    localStorage.removeItem(storageKey);
  } catch {}
};

interface FirstTimeTooltipProps {
  label: string;
  children: React.ReactNode;
  /** Delay before showing (stagger effect) */
  delay?: number;
  /** Position of the label */
  position?: "top" | "bottom";
  /** Custom localStorage key (allows separate tooltip groups) */
  storageKey?: string;
}

export function FirstTimeTooltip({
  label,
  children,
  delay = 0,
  position = "bottom",
  storageKey = FIRST_VISIT_KEY,
}: FirstTimeTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => hasSeenFirstTimeTooltips(storageKey));

  useEffect(() => {
    if (dismissed) return;

    const showDelay = 1200 + delay;
    const timer = setTimeout(() => setVisible(true), showDelay);

    // Auto-dismiss after 10 seconds from showing (visible for at least ~7s)
    const autoDismiss = setTimeout(() => {
      setVisible(false);
      dismissFirstTimeTooltips(storageKey);
      setDismissed(true);
    }, showDelay + 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoDismiss);
    };
  }, [dismissed, delay, storageKey]);

  // Separate dismiss-on-tap: only after tooltip is visible, with a grace period
  useEffect(() => {
    if (!visible || dismissed) return;

    const graceTimer = setTimeout(() => {
      const handleDismiss = () => {
        setVisible(false);
        dismissFirstTimeTooltips(storageKey);
        setDismissed(true);
      };
      window.addEventListener("pointerdown", handleDismiss, { once: true });
      return () => window.removeEventListener("pointerdown", handleDismiss);
    }, 7000);

    return () => {
      clearTimeout(graceTimer);
    };
  }, [visible, dismissed, storageKey]);

  return (
    <div className="relative">
      {children}
      {visible && !dismissed && (
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 z-[100] pointer-events-none",
            position === "bottom" ? "top-full mt-1" : "bottom-full mb-1"
          )}
          style={{
            animation: "tooltip-fade-in 0.4s ease-out forwards",
          }}
        >
          <style>{`
            @keyframes tooltip-fade-in {
              from { opacity: 0; transform: translateY(${position === "bottom" ? "-4px" : "4px"}); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes tooltip-pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
          `}</style>
          <div className="relative">
            {/* Arrow */}
            <div
              className={cn(
                "absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-accent",
                position === "bottom" ? "-top-1" : "-bottom-1"
              )}
            />
            {/* Label bubble */}
            <div
              className="bg-accent text-accent-foreground text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-lg"
              style={{ animation: "tooltip-pulse 2s ease-in-out infinite" }}
            >
              {label}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
