import { useMemo } from "react";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";
import { useDevice } from "@/contexts/DeviceContext";

export type TextStyleTarget = "pasuk" | "title" | "question" | "commentary" | "siddur" | "tehillim";

export const useTextDisplayStyles = (target: TextStyleTarget = "pasuk") => {
  const { settings } = useFontAndColorSettings();
  const { isMobile } = useDevice();

  return useMemo(() => {
    // Get font scale (default 1)
    const fontScale = settings.fontScale || 1;

    // Per-tab values for alignment / letter spacing / word spacing
    const ta = (target === "title" ? settings.titleTextAlignment
              : target === "question" ? settings.questionTextAlignment
              : target === "commentary" ? settings.commentaryTextAlignment
              : target === "siddur" ? settings.siddurTextAlignment
              : target === "tehillim" ? settings.tehillimTextAlignment
              : settings.pasukTextAlignment) || settings.textAlignment;

    const lsKey = (target === "title" ? settings.titleLetterSpacing
                : target === "question" ? settings.questionLetterSpacing
                : target === "commentary" ? settings.commentaryLetterSpacing
                : target === "siddur" ? settings.siddurLetterSpacing
                : target === "tehillim" ? settings.tehillimLetterSpacing
                : settings.pasukLetterSpacing) || settings.letterSpacing;
    const lsCustom = (target === "title" ? settings.titleLetterSpacingCustom
                : target === "question" ? settings.questionLetterSpacingCustom
                : target === "commentary" ? settings.commentaryLetterSpacingCustom
                : target === "siddur" ? settings.siddurLetterSpacingCustom
                : target === "tehillim" ? settings.tehillimLetterSpacingCustom
                : settings.pasukLetterSpacingCustom) ?? settings.letterSpacingCustom ?? 0;
    const ws = (target === "title" ? settings.titleWordSpacing
              : target === "question" ? settings.questionWordSpacing
              : target === "commentary" ? settings.commentaryWordSpacing
              : target === "siddur" ? settings.siddurWordSpacing
              : target === "tehillim" ? settings.tehillimWordSpacing
              : settings.pasukWordSpacing) ?? settings.wordSpacing ?? 0;

    // Spacing values - responsive (supports custom)
    const spacingMap: Record<string, string> = {
      compact: isMobile ? "0.25rem" : "0.5rem",
      normal: isMobile ? "0.5rem" : "1rem",
      comfortable: isMobile ? "0.75rem" : "1.5rem",
      spacious: isMobile ? "1rem" : "2rem",
    };
    const gap = settings.contentSpacing === "custom"
      ? `${settings.contentSpacingCustom ?? 1}rem`
      : spacingMap[settings.contentSpacing] || spacingMap.normal;

    // Line height values (supports custom)
    const lineHeightMap: Record<string, string> = {
      tight: "1.3",
      normal: "1.5",
      relaxed: "1.7",
      loose: "2.0",
    };
    const lineHeight = settings.lineHeight === "custom"
      ? String(settings.lineHeightCustom ?? 1.5)
      : lineHeightMap[settings.lineHeight] || lineHeightMap.normal;

    // Letter spacing values (supports custom)
    const letterSpacingMap: Record<string, string> = {
      tight: "-0.02em",
      normal: "0em",
      wide: "0.05em",
      wider: "0.1em",
    };
    const letterSpacing = lsKey === "custom"
      ? `${lsCustom}em`
      : letterSpacingMap[lsKey] || letterSpacingMap.normal;

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
      justify: "justify",
    };

    // Padding for mobile
    const padding = isMobile ? "0.5rem" : "1rem";

    return {
      textAlign: alignmentMap[ta] as "right" | "center" | "left" | "justify",
      gap,
      lineHeight,
      letterSpacing,
      wordSpacing: `${ws}em`,
      maxWidth: getMaxWidth(),
      margin: ta === "center" ? "0 auto" : "0",
      padding,
      fontScale,
      isMobile,
    };
  }, [settings, target, isMobile]);
};
