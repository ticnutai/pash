import { AlignRight, AlignCenter, AlignLeft, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";

export const TextDisplaySettings = () => {
  const { settings, updateSettings } = useFontAndColorSettings();

  const alignmentValues = ["right", "center", "left"] as const;
  const spacingValues = ["compact", "normal", "comfortable", "spacious"] as const;
  const lineHeightValues = ["tight", "normal", "relaxed", "loose"] as const;
  const widthValues = ["narrow", "normal", "wide", "full"] as const;

  const spacingLabels: Record<string, string> = {
    compact: "צפוף", normal: "רגיל", comfortable: "נוח", spacious: "מרווח",
  };
  const lineHeightLabels: Record<string, string> = {
    tight: "צמוד", normal: "רגיל", relaxed: "רגוע", loose: "רפוי",
  };
  const widthLabels: Record<string, string> = {
    narrow: "צר", normal: "רגיל", wide: "רחב", full: "מלא",
  };
  const alignmentLabels: Record<string, string> = {
    right: "ימין", center: "מרכז", left: "שמאל",
  };

  const currentAlignmentIdx = alignmentValues.indexOf(settings.textAlignment);
  const currentSpacingIdx = spacingValues.indexOf(settings.contentSpacing as typeof spacingValues[number]);
  const currentLineHeightIdx = lineHeightValues.indexOf(settings.lineHeight as typeof lineHeightValues[number]);
  const currentWidthIdx = widthValues.indexOf(settings.contentWidth);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white hover:text-white hover:bg-white/10"
          title="הגדרות תצוגת טקסט"
        >
          <Type className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent
        dir="rtl"
        className="max-w-md w-[calc(100%-2rem)] border-2 border-accent bg-card text-foreground"
      >
        <DialogHeader>
          <DialogTitle className="text-right flex items-center justify-end gap-2 text-foreground">
            <span>הגדרות תצוגה</span>
            <Type className="h-5 w-5 text-accent" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2 text-right" dir="rtl">

          {/* === תצוגת טקסט === */}
          <div className="rounded-lg border border-accent/40 p-4 space-y-5">
            <h3 className="text-sm font-bold text-accent">תצוגת טקסט</h3>

            {/* יישור */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded">
                  {alignmentLabels[settings.textAlignment]}
                </span>
                <Label className="text-sm font-semibold flex items-center gap-1">
                  יישור טקסט
                  {settings.textAlignment === "right" && <AlignRight className="h-4 w-4" />}
                  {settings.textAlignment === "center" && <AlignCenter className="h-4 w-4" />}
                  {settings.textAlignment === "left" && <AlignLeft className="h-4 w-4" />}
                </Label>
              </div>
              <Slider
                value={[currentAlignmentIdx >= 0 ? currentAlignmentIdx : 0]}
                onValueChange={([value]) => updateSettings({ textAlignment: alignmentValues[value] })}
                min={0} max={2} step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>שמאל</span>
                <span>מרכז</span>
                <span>ימין</span>
              </div>
            </div>

            <Separator className="bg-accent/20" />

            {/* מרווח תוכן */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded">
                  {settings.contentSpacing === "custom"
                    ? `${settings.contentSpacingCustom?.toFixed(1)}rem`
                    : spacingLabels[settings.contentSpacing]}
                </span>
                <Label className="text-sm font-semibold">מרווח תוכן</Label>
              </div>
              <Slider
                value={[currentSpacingIdx >= 0 ? currentSpacingIdx : 1]}
                onValueChange={([value]) => updateSettings({ contentSpacing: spacingValues[value] })}
                min={0} max={3} step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>מרווח</span>
                <span>נוח</span>
                <span>רגיל</span>
                <span>צפוף</span>
              </div>
            </div>

            <Separator className="bg-accent/20" />

            {/* גובה שורה */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded">
                  {settings.lineHeight === "custom"
                    ? String(settings.lineHeightCustom?.toFixed(1))
                    : lineHeightLabels[settings.lineHeight]}
                </span>
                <Label className="text-sm font-semibold">גובה שורה</Label>
              </div>
              <Slider
                value={[currentLineHeightIdx >= 0 ? currentLineHeightIdx : 1]}
                onValueChange={([value]) => updateSettings({ lineHeight: lineHeightValues[value] })}
                min={0} max={3} step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>רפוי</span>
                <span>רגוע</span>
                <span>רגיל</span>
                <span>צמוד</span>
              </div>
            </div>

            <Separator className="bg-accent/20" />

            {/* רוחב תוכן */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded">
                  {widthLabels[settings.contentWidth]}
                </span>
                <Label className="text-sm font-semibold">רוחב תוכן</Label>
              </div>
              <Slider
                value={[currentWidthIdx >= 0 ? currentWidthIdx : 1]}
                onValueChange={([value]) => updateSettings({ contentWidth: widthValues[value] })}
                min={0} max={3} step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>מלא</span>
                <span>רחב</span>
                <span>רגיל</span>
                <span>צר</span>
              </div>
            </div>
          </div>

          {/* === גודל טקסט === */}
          <div className="rounded-lg border border-accent/40 p-4 space-y-5">
            <h3 className="text-sm font-bold text-accent">גודל טקסט</h3>

            {/* פסוקים */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded">
                  {settings.pasukSize}px
                </span>
                <Label className="text-sm font-semibold flex items-center gap-1">
                  פסוקים <Type className="h-3.5 w-3.5" />
                </Label>
              </div>
              <Slider
                value={[settings.pasukSize]}
                onValueChange={([value]) => updateSettings({ pasukSize: value })}
                min={12} max={36} step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>36</span>
                <span>24</span>
                <span>12</span>
              </div>
            </div>

            <Separator className="bg-accent/20" />

            {/* כותרות */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded">
                  {settings.titleSize}px
                </span>
                <Label className="text-sm font-semibold flex items-center gap-1">
                  כותרות <Type className="h-3.5 w-3.5" />
                </Label>
              </div>
              <Slider
                value={[settings.titleSize]}
                onValueChange={([value]) => updateSettings({ titleSize: value })}
                min={12} max={36} step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>36</span>
                <span>24</span>
                <span>12</span>
              </div>
            </div>

            <Separator className="bg-accent/20" />

            {/* שאלות */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded">
                  {settings.questionSize}px
                </span>
                <Label className="text-sm font-semibold flex items-center gap-1">
                  שאלות <Type className="h-3.5 w-3.5" />
                </Label>
              </div>
              <Slider
                value={[settings.questionSize]}
                onValueChange={([value]) => updateSettings({ questionSize: value })}
                min={12} max={36} step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>36</span>
                <span>24</span>
                <span>12</span>
              </div>
            </div>

            <Separator className="bg-accent/20" />

            {/* מפרשים */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded">
                  {settings.commentarySize}px
                </span>
                <Label className="text-sm font-semibold flex items-center gap-1">
                  מפרשים <Type className="h-3.5 w-3.5" />
                </Label>
              </div>
              <Slider
                value={[settings.commentarySize]}
                onValueChange={([value]) => updateSettings({ commentarySize: value })}
                min={12} max={36} step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>36</span>
                <span>24</span>
                <span>12</span>
              </div>
            </div>
          </div>

          {/* תצוגה מקדימה */}
          <div className="rounded-lg border border-accent/40 p-4 bg-muted/20 space-y-2">
            <Label className="text-xs text-muted-foreground">תצוגה מקדימה</Label>
            <p
              style={{
                fontFamily: settings.pasukFont,
                fontSize: `${Math.min(settings.pasukSize, 24)}px`,
                lineHeight: settings.lineHeight === "tight" ? "1.3"
                  : settings.lineHeight === "relaxed" ? "1.7"
                  : settings.lineHeight === "loose" ? "2.0"
                  : "1.5",
              }}
              className="text-right text-foreground"
            >
              בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
