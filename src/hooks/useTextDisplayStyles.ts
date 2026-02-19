import { useMemo } from "react";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";
import { useDevice } from "@/contexts/DeviceContext";

export const useTextDisplayStyles = () => {
  const { settings } = useFontAndColorSettings();
  const { isMobile } = useDevice();

  return useMemo(() => {
    // Get font scale (default 1)
    const fontScale = settings.fontScale || 1;

    // Spacing values - responsive
    const spacingMap = {
      compact: isMobile ? "0.25rem" : "0.5rem",
      normal: isMobile ? "0.5rem" : "1rem",
      comfortable: isMobile ? "0.75rem" : "1.5rem",
      spacious: isMobile ? "1rem" : "2rem",
    };

    // Line height values
    const lineHeightMap = {
      tight: "1.3",
      normal: "1.5",
      relaxed: "1.7",
      loose: "2.0",
    };

    // Letter spacing values
    const letterSpacingMap = {
      tight: "-0.02em",
      normal: "0em",
      wide: "0.05em",
      wider: "0.1em",
    };

    // Content width values - responsive with max constraints
    const getMaxWidth = () => {
      if (isMobile) return "100%";
      
      switch (settings.contentWidth) {
        case "narrow": return "min(600px, 95vw)";
        case "normal": return "min(800px, 95vw)";
        case "wide": return "min(1000px, 95vw)";
        case "full": return "100%";
        default: return "min(800px, 95vw)";
      }
    };

    // Alignment values
    const alignmentMap = {
      right: "right",
      center: "center",
      left: "left",
    };

    // Padding for mobile
    const padding = isMobile ? "0.5rem" : "1rem";

    return {
      textAlign: alignmentMap[settings.textAlignment] as "right" | "center" | "left",
      gap: spacingMap[settings.contentSpacing],
      lineHeight: lineHeightMap[settings.lineHeight],
      letterSpacing: letterSpacingMap[settings.letterSpacing],
      maxWidth: getMaxWidth(),
      margin: settings.textAlignment === "center" ? "0 auto" : "0",
      padding,
      fontScale,
      isMobile,
    };
  }, [settings.fontScale, settings.textAlignment, settings.contentSpacing,
      settings.lineHeight, settings.letterSpacing, settings.contentWidth, isMobile]);
};
