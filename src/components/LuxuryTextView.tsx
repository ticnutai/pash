import { FlatPasuk } from "@/types/torah";
import { toHebrewNumber } from "@/utils/hebrewNumbers";
import { formatTorahText } from "@/utils/textUtils";
import { useTextDisplayStyles } from "@/hooks/useTextDisplayStyles";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";
import { useDevice } from "@/contexts/DeviceContext";

interface LuxuryTextViewProps {
  pesukim: FlatPasuk[];
}

export const LuxuryTextView = ({ pesukim }: LuxuryTextViewProps) => {
  const displayStyles = useTextDisplayStyles();
  const { settings } = useFontAndColorSettings();
  const { isMobile } = useDevice();

  if (pesukim.length === 0) {
    return (
      <div className="p-12 text-center animate-fade-in">
        <p className="text-lg text-muted-foreground">אין פסוקים להצגה</p>
      </div>
    );
  }

  // Group pesukim by perek
  const perekGroups: { perek: number; pesukim: FlatPasuk[] }[] = [];
  for (const pasuk of pesukim) {
    const last = perekGroups[perekGroups.length - 1];
    if (last && last.perek === pasuk.perek) {
      last.pesukim.push(pasuk);
    } else {
      perekGroups.push({ perek: pasuk.perek, pesukim: [pasuk] });
    }
  }

  const baseFontSize = settings.pasukSize || 22;
  const scale = displayStyles.fontScale;
  const effectiveSize = isMobile
    ? Math.min(baseFontSize * scale, 28)
    : baseFontSize * scale;

  return (
    <div
      className="w-full animate-fade-in"
      style={{
        maxWidth: displayStyles.maxWidth,
        margin: displayStyles.margin,
      }}
    >
      {/* Decorative top border */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[hsl(var(--accent))] to-transparent" />
        <span className="text-2xl" style={{ color: "#c8a04d" }}>✦</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[hsl(var(--accent))] to-transparent" />
      </div>

      <div
        className="px-4 sm:px-8 md:px-12 py-6"
        dir="rtl"
        style={{
          fontFamily: "'Noto Serif Hebrew', 'David Libre', 'Frank Ruhl Libre', serif",
          fontSize: `${effectiveSize}px`,
          color: "hsl(var(--foreground))",
          fontWeight: 400,
          lineHeight: isMobile ? "2.0" : "2.2",
          letterSpacing: "0.02em",
          textAlign: "justify",
        }}
      >
        {perekGroups.map((group) => (
          <div key={group.perek} className="mb-8 last:mb-0">
            {/* Perek header - ornate */}
            <div className="text-center mb-6 relative">
              <div className="flex items-center justify-center gap-3">
                <span style={{ color: "#c8a04d", fontSize: "0.7em" }}>❧</span>
                <span
                  className="font-bold tracking-wide"
                  style={{
                    color: "#c8a04d",
                    fontSize: `${Math.max(effectiveSize * 0.75, 14)}px`,
                    fontFamily: "'Noto Serif Hebrew', 'David Libre', serif",
                  }}
                >
                  פרק {toHebrewNumber(group.perek)}
                </span>
                <span style={{ color: "#c8a04d", fontSize: "0.7em", transform: "scaleX(-1)", display: "inline-block" }}>❧</span>
              </div>
              <div
                className="mx-auto mt-2"
                style={{
                  width: "60%",
                  height: "1px",
                  background: "linear-gradient(90deg, transparent, #c8a04d, transparent)",
                }}
              />
            </div>

            {/* Each verse on its own line, no empty lines between */}
            <div style={{ textAlign: "right" }}>
              {group.pesukim.map((pasuk) => (
                <p key={pasuk.id} style={{ margin: 0 }}>
                  <span
                    className="select-none"
                    style={{
                      color: "#c8a04d",
                      fontWeight: 700,
                      fontSize: `${effectiveSize * 0.85}px`,
                      fontFamily: "'Noto Serif Hebrew', 'David Libre', serif",
                      marginInlineEnd: "0.2em",
                      textShadow: "0 1px 2px rgba(200, 160, 77, 0.15)",
                    }}
                  >
                    {toHebrewNumber(pasuk.pasuk_num)}'
                  </span>
                  {formatTorahText(pasuk.text)}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Decorative bottom border */}
      <div className="flex items-center justify-center gap-3 mt-6">
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[hsl(var(--accent))] to-transparent" />
        <span className="text-2xl" style={{ color: "#c8a04d" }}>✦</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[hsl(var(--accent))] to-transparent" />
      </div>
    </div>
  );
};
