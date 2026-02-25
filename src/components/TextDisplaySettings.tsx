import { AlignRight, AlignCenter, AlignLeft, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";

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

interface SliderSectionProps {
  label: string;
  valueBadge: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  marks?: string[];
  icon?: React.ReactNode;
}

const SliderSection = ({ label, valueBadge, value, onChange, min, max, step, marks, icon }: SliderSectionProps) => (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded">
        {valueBadge}
      </span>
      <Label className="text-sm font-semibold flex items-center gap-1">
        {label} {icon}
      </Label>
    </div>
    <Slider
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min} max={max} step={step}
      className="w-full"
    />
    {marks && (
      <div className="flex justify-between text-xs text-muted-foreground">
        {marks.map((m, i) => <span key={i}>{m}</span>)}
      </div>
    )}
  </div>
);

interface TabContentProps {
  sizeValue: number;
  onSizeChange: (v: number) => void;
  sizeLabel: string;
  settings: ReturnType<typeof useFontAndColorSettings>["settings"];
  updateSettings: ReturnType<typeof useFontAndColorSettings>["updateSettings"];
  previewText?: string;
  previewFont?: string;
}

const TabContent = ({ sizeValue, onSizeChange, sizeLabel, settings, updateSettings, previewText, previewFont }: TabContentProps) => {
  const currentAlignmentIdx = alignmentValues.indexOf(settings.textAlignment);
  const currentSpacingIdx = spacingValues.indexOf(settings.contentSpacing as typeof spacingValues[number]);
  const currentLineHeightIdx = lineHeightValues.indexOf(settings.lineHeight as typeof lineHeightValues[number]);
  const currentWidthIdx = widthValues.indexOf(settings.contentWidth);

  return (
    <div className="space-y-4 py-1" dir="rtl">
      {/* Font size */}
      <SliderSection
        label={sizeLabel}
        valueBadge={`${sizeValue}px`}
        value={sizeValue}
        onChange={onSizeChange}
        min={12} max={36} step={1}
        marks={["36", "24", "12"]}
        icon={<Type className="h-3.5 w-3.5" />}
      />

      <Separator className="bg-accent/20" />

      {/* Alignment */}
      <SliderSection
        label="יישור טקסט"
        valueBadge={alignmentLabels[settings.textAlignment]}
        value={currentAlignmentIdx >= 0 ? currentAlignmentIdx : 0}
        onChange={(v) => updateSettings({ textAlignment: alignmentValues[v] })}
        min={0} max={2} step={1}
        marks={["שמאל", "מרכז", "ימין"]}
        icon={
          settings.textAlignment === "right" ? <AlignRight className="h-4 w-4" /> :
          settings.textAlignment === "center" ? <AlignCenter className="h-4 w-4" /> :
          <AlignLeft className="h-4 w-4" />
        }
      />

      <Separator className="bg-accent/20" />

      {/* Line height */}
      <SliderSection
        label="גובה שורה"
        valueBadge={settings.lineHeight === "custom"
          ? String(settings.lineHeightCustom?.toFixed(1))
          : lineHeightLabels[settings.lineHeight]}
        value={currentLineHeightIdx >= 0 ? currentLineHeightIdx : 1}
        onChange={(v) => updateSettings({ lineHeight: lineHeightValues[v] })}
        min={0} max={3} step={1}
        marks={["רפוי", "רגוע", "רגיל", "צמוד"]}
      />

      <Separator className="bg-accent/20" />

      {/* Content spacing */}
      <SliderSection
        label="מרווח תוכן"
        valueBadge={settings.contentSpacing === "custom"
          ? `${settings.contentSpacingCustom?.toFixed(1)}rem`
          : spacingLabels[settings.contentSpacing]}
        value={currentSpacingIdx >= 0 ? currentSpacingIdx : 1}
        onChange={(v) => updateSettings({ contentSpacing: spacingValues[v] })}
        min={0} max={3} step={1}
        marks={["מרווח", "נוח", "רגיל", "צפוף"]}
      />

      <Separator className="bg-accent/20" />

      {/* Content width */}
      <SliderSection
        label="רוחב תוכן"
        valueBadge={widthLabels[settings.contentWidth]}
        value={currentWidthIdx >= 0 ? currentWidthIdx : 1}
        onChange={(v) => updateSettings({ contentWidth: widthValues[v] })}
        min={0} max={3} step={1}
        marks={["מלא", "רחב", "רגיל", "צר"]}
      />

      {/* Preview */}
      {previewText && (
        <>
          <Separator className="bg-accent/20" />
          <div className="rounded-lg bg-muted/20 p-3">
            <Label className="text-xs text-muted-foreground mb-1 block">תצוגה מקדימה</Label>
            <p
              style={{
                fontFamily: previewFont || settings.pasukFont,
                fontSize: `${Math.min(sizeValue, 24)}px`,
                lineHeight: settings.lineHeight === "tight" ? "1.3"
                  : settings.lineHeight === "relaxed" ? "1.7"
                  : settings.lineHeight === "loose" ? "2.0"
                  : "1.5",
              }}
              className="text-right text-foreground"
            >
              {previewText}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export const TextDisplaySettings = () => {
  const { settings, updateSettings } = useFontAndColorSettings();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 sm:h-11 sm:w-11 text-accent hover:text-accent hover:bg-accent/15 border border-accent/30 rounded-xl"
          title="הגדרות תצוגת טקסט"
        >
          <Type className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
        </Button>
      </DialogTrigger>
      <DialogContent
        dir="rtl"
        data-layout="dialog-text-display" data-layout-label="📦 דיאלוג: הגדרות תצוגה"
        className="max-w-md w-[calc(100%-2rem)] border-2 border-accent bg-card text-foreground max-h-[85vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-right flex items-center justify-end gap-2 text-foreground">
            <span>הגדרות תצוגה</span>
            <Type className="h-5 w-5 text-accent" />
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pasuk" dir="rtl" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-auto gap-1 bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="pasuk" className="text-xs sm:text-sm py-2 rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              פסוקים
            </TabsTrigger>
            <TabsTrigger value="titles" className="text-xs sm:text-sm py-2 rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              כותרות
            </TabsTrigger>
            <TabsTrigger value="questions" className="text-xs sm:text-sm py-2 rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              שאלות
            </TabsTrigger>
            <TabsTrigger value="commentary" className="text-xs sm:text-sm py-2 rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              מפרשים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pasuk" className="mt-3">
            <TabContent
              sizeValue={settings.pasukSize}
              onSizeChange={(v) => updateSettings({ pasukSize: v })}
              sizeLabel="גודל פסוקים"
              settings={settings}
              updateSettings={updateSettings}
              previewText="בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ"
              previewFont={settings.pasukFont}
            />
          </TabsContent>

          <TabsContent value="titles" className="mt-3">
            <TabContent
              sizeValue={settings.titleSize}
              onSizeChange={(v) => updateSettings({ titleSize: v })}
              sizeLabel="גודל כותרות"
              settings={settings}
              updateSettings={updateSettings}
              previewText="פרשת בראשית — פרק א׳"
            />
          </TabsContent>

          <TabsContent value="questions" className="mt-3">
            <TabContent
              sizeValue={settings.questionSize}
              onSizeChange={(v) => updateSettings({ questionSize: v })}
              sizeLabel="גודל שאלות"
              settings={settings}
              updateSettings={updateSettings}
              previewText="מדוע נאמר 'בראשית' ולא 'בתחילה'?"
            />
          </TabsContent>

          <TabsContent value="commentary" className="mt-3">
            <TabContent
              sizeValue={settings.commentarySize}
              onSizeChange={(v) => updateSettings({ commentarySize: v })}
              sizeLabel="גודל מפרשים"
              settings={settings}
              updateSettings={updateSettings}
              previewText="אמר רבי יצחק: לא היה צריך להתחיל את התורה אלא מ'החודש הזה לכם'"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
