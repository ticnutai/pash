import { useEffect, useRef } from "react";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";

interface UsePinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  step?: number;
}

export const usePinchZoom = (options: UsePinchZoomOptions = {}) => {
  const { minScale = 0.5, maxScale = 2.5, step = 0.1 } = options;
  const { settings, updateSettings } = useFontAndColorSettings();
  const initialDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);

  useEffect(() => {
    let touchStartDistance = 0;
    let touchStartScale = 1;

    const getTouchDistance = (touches: TouchList): number => {
      const touch1 = touches[0];
      const touch2 = touches[1];
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        touchStartDistance = getTouchDistance(e.touches);
        touchStartScale = settings.fontScale || 1;
        initialDistanceRef.current = touchStartDistance;
        initialScaleRef.current = touchStartScale;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);
        const scaleChange = currentDistance / touchStartDistance;
        let newScale = touchStartScale * scaleChange;

        // Clamp scale between min and max
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        
        // Round to nearest step
        newScale = Math.round(newScale / step) * step;

        if (newScale !== settings.fontScale) {
          updateSettings({ fontScale: newScale });
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchStartDistance = 0;
        touchStartScale = 1;
      }
    };

    // Add event listeners
    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [settings.fontScale, updateSettings, minScale, maxScale, step]);

  return {
    scale: settings.fontScale || 1,
    resetScale: () => updateSettings({ fontScale: 1 }),
  };
};
