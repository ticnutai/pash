import { FlatPasuk } from "@/types/torah";
import { Card } from "@/components/ui/card";
import { toHebrewNumber } from "@/utils/hebrewNumbers";
import { formatTorahText } from "@/utils/textUtils";
import { useTextDisplayStyles } from "@/hooks/useTextDisplayStyles";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";

interface ContinuousTextViewProps {
  pesukim: FlatPasuk[];
}

export const ContinuousTextView = ({ pesukim }: ContinuousTextViewProps) => {
  const displayStyles = useTextDisplayStyles();
  const { settings } = useFontAndColorSettings();

  if (pesukim.length === 0) {
    return (
      <Card className="p-12 text-center animate-fade-in">
        <p className="text-lg text-muted-foreground">אין פסוקים להצגה</p>
      </Card>
    );
  }

  // Group pesukim by perek for optional perek headers
  const perekGroups: { perek: number; pesukim: FlatPasuk[] }[] = [];
  for (const pasuk of pesukim) {
    const last = perekGroups[perekGroups.length - 1];
    if (last && last.perek === pasuk.perek) {
      last.pesukim.push(pasuk);
    } else {
      perekGroups.push({ perek: pasuk.perek, pesukim: [pasuk] });
    }
  }

  return (
    <Card
      className="overflow-hidden w-full animate-fade-in border-r-4 border-r-primary/30 shadow-md"
      style={{
        maxWidth: displayStyles.maxWidth,
        margin: displayStyles.margin,
      }}
    >
      <div
        className="p-4 sm:p-6 md:p-8"
        dir="rtl"
        style={{
          fontFamily: settings.pasukFont || "'Frank Ruhl Libre'",
          fontSize: `calc(${settings.pasukSize || 20}px * ${displayStyles.fontScale})`,
          color: settings.pasukColor,
          fontWeight: settings.pasukBold ? "bold" : "normal",
          lineHeight: displayStyles.lineHeight,
          letterSpacing: displayStyles.letterSpacing,
          textAlign: "justify",
        }}
      >
        {perekGroups.map((group) => (
          <div key={group.perek} className="mb-4 last:mb-0">
            {/* Perek header */}
            <div className="text-center mb-3">
              <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                פרק {toHebrewNumber(group.perek)}
              </span>
            </div>

            {/* Continuous flowing text */}
            <p style={{ textAlignLast: "right" }}>
              {group.pesukim.map((pasuk, i) => (
                <span key={pasuk.id}>
                  <span className="text-primary font-bold select-none mx-1">
                    {toHebrewNumber(pasuk.pasuk_num)}
                  </span>
                  {formatTorahText(pasuk.text)}
                  {i < group.pesukim.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};
