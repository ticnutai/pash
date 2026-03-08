import { AlignRight, AlignCenter, AlignLeft, AlignJustify, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";

const hebrewFonts = [
  { value: "David Libre", label: "דוד ליברה", sample: "אבגד" },
  { value: "Frank Ruehl Libre", label: "פרנק רוהל", sample: "אבגד" },
  { value: "Noto Serif Hebrew", label: "נוטו סריף", sample: "אבגד" },
  { value: "Miriam Libre", label: "מרים ליברה", sample: "אבגד" },
  { value: "Rubik", label: "רוביק", sample: "אבגד" },
  { value: "Heebo", label: "היבו", sample: "אבגד" },
  { value: "Alef", label: "אלף", sample: "אבגד" },
  { value: "Varela Round", label: "וארלה ראונד", sample: "אבגד" },
  { value: "Assistant", label: "אסיסטנט", sample: "אבגד" },
  { value: "Secular One", label: "סקולר וואן", sample: "אבגד" },
  { value: "Suez One", label: "סואץ וואן", sample: "אבגד" },
  { value: "Arial", label: "אריאל", sample: "אבגד" },
  { value: "Times New Roman", label: "טיימס ניו רומן", sample: "אבגד" },
];

const alignmentValues = ["right", "center", "left", "justify"] as const;
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
  right: "ימין", center: "מרכז", left: "שמאל", justify: "ישור",
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

interface FontSelectorProps {
  label: string;
  value: string;
  onChange: (font: string) => void;
}

const FontSelector = ({ label, value, onChange }: FontSelectorProps) => (
  <div className="space-y-2">
    <Label className="text-sm font-semibold">{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="text-right h-10">
        <SelectValue>
          <span style={{ fontFamily: value }} className="text-sm">
            {hebrewFonts.find(f => f.value === value)?.label || value}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {hebrewFonts.map((font) => (
          <SelectItem key={font.value} value={font.value} className="py-2">
            <div className="flex items-center gap-3 w-full">
              <span className="text-xs text-muted-foreground shrink-0">{font.label}</span>
              <span style={{ fontFamily: font.value, fontSize: '16px' }} className="text-foreground">
                {font.sample} — בראשית ברא
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

interface TabContentProps {
  sizeValue: number;
  onSizeChange: (v: number) => void;
  sizeLabel: string;
  fontValue: string;
  onFontChange: (font: string) => void;
  fontLabel: string;
  boldValue: boolean;
  onBoldChange: (bold: boolean) => void;
  settings: ReturnType<typeof useFontAndColorSettings>["settings"];
  updateSettings: ReturnType<typeof useFontAndColorSettings>["updateSettings"];
  previewText?: string;
}

const TabContent = ({ sizeValue, onSizeChange, sizeLabel, fontValue, onFontChange, fontLabel, boldValue, onBoldChange, settings, updateSettings, previewText }: TabContentProps) => {
  const currentSpacingIdx = spacingValues.indexOf(settings.contentSpacing as typeof spacingValues[number]);
  const currentLineHeightIdx = lineHeightValues.indexOf(settings.lineHeight as typeof lineHeightValues[number]);
  const currentWidthIdx = widthValues.indexOf(settings.contentWidth);

  return (
    <div className="space-y-4 py-1" dir="rtl">
      {/* Font selector */}
      <FontSelector label={fontLabel} value={fontValue} onChange={onFontChange} />

      <div className="flex items-center justify-between">
        <Switch checked={boldValue} onCheckedChange={onBoldChange} />
        <Label className="text-sm font-semibold">טקסט מודגש</Label>
      </div>

      <Separator className="bg-accent/20" />

      {/* Font size */}
      <SliderSection
        label={sizeLabel}
        valueBadge={`${sizeValue}px`}
        value={sizeValue}
        onChange={onSizeChange}
        min={8} max={36} step={1}
        marks={["36", "24", "8"]}
        icon={<Type className="h-3.5 w-3.5" />}
      />

      <Separator className="bg-accent/20" />

      {/* Alignment */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold block text-right">יישור טקסט</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {(["right", "center", "left", "justify"] as const).map((align) => {
            const icon = align === "right" ? <AlignRight className="h-4 w-4" />
              : align === "center" ? <AlignCenter className="h-4 w-4" />
              : align === "left" ? <AlignLeft className="h-4 w-4" />
              : <AlignJustify className="h-4 w-4" />;
            return (
              <Button
                key={align}
                variant="ghost"
                size="sm"
                onClick={() => updateSettings({ textAlignment: align })}
                className={`flex flex-col items-center gap-0.5 h-auto py-2 rounded-lg border transition-colors ${
                  settings.textAlignment === align
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border/40 text-muted-foreground hover:border-accent/50 hover:text-accent"
                }`}
                title={alignmentLabels[align]}
              >
                {icon}
                <span className="text-[10px]">{alignmentLabels[align]}</span>
              </Button>
            );
          })}
        </div>
      </div>

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
          <div className="rounded-lg bg-muted/20 p-3 border border-accent/10">
            <Label className="text-xs text-muted-foreground mb-2 block">תצוגה מקדימה</Label>
            <p
              style={{
                fontFamily: fontValue,
                fontSize: `${Math.min(sizeValue, 24)}px`,
                fontWeight: boldValue ? "bold" : "normal",
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
          <TabsList className="w-full grid grid-cols-3 h-auto gap-1 bg-muted/40 p-1 rounded-xl">
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
            <TabsTrigger value="siddur" className="text-xs sm:text-sm py-2 rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              תפילות
            </TabsTrigger>
            <TabsTrigger value="tehillim" className="text-xs sm:text-sm py-2 rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              תהילים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pasuk" className="mt-3">
            <TabContent
              sizeValue={settings.pasukSize}
              onSizeChange={(v) => updateSettings({ pasukSize: v })}
              sizeLabel="גודל פסוקים"
              fontValue={settings.pasukFont}
              onFontChange={(f) => updateSettings({ pasukFont: f })}
              fontLabel="גופן פסוקים"
              boldValue={settings.pasukBold}
              onBoldChange={(b) => updateSettings({ pasukBold: b })}
              settings={settings}
              updateSettings={updateSettings}
              previewText="בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ"
            />
          </TabsContent>

          <TabsContent value="titles" className="mt-3">
            <TabContent
              sizeValue={settings.titleSize}
              onSizeChange={(v) => updateSettings({ titleSize: v })}
              sizeLabel="גודל כותרות"
              fontValue={settings.titleFont}
              onFontChange={(f) => updateSettings({ titleFont: f })}
              fontLabel="גופן כותרות"
              boldValue={settings.titleBold}
              onBoldChange={(b) => updateSettings({ titleBold: b })}
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
              fontValue={settings.questionFont}
              onFontChange={(f) => updateSettings({ questionFont: f })}
              fontLabel="גופן שאלות"
              boldValue={settings.questionBold}
              onBoldChange={(b) => updateSettings({ questionBold: b })}
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
              fontValue={settings.commentaryFont}
              onFontChange={(f) => updateSettings({ commentaryFont: f })}
              fontLabel="גופן מפרשים"
              boldValue={settings.commentaryBold}
              onBoldChange={(b) => updateSettings({ commentaryBold: b })}
              settings={settings}
              updateSettings={updateSettings}
              previewText="אמר רבי יצחק: לא היה צריך להתחיל את התורה אלא מ'החודש הזה לכם'"
            />
          </TabsContent>

          <TabsContent value="siddur" className="mt-3">
            <TabContent
              sizeValue={settings.siddurSize}
              onSizeChange={(v) => updateSettings({ siddurSize: v })}
              sizeLabel="גודל תפילות"
              fontValue={settings.siddurFont}
              onFontChange={(f) => updateSettings({ siddurFont: f })}
              fontLabel="גופן תפילות"
              boldValue={settings.siddurBold}
              onBoldChange={(b) => updateSettings({ siddurBold: b })}
              settings={settings}
              updateSettings={updateSettings}
              previewText="בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם"
            />
          </TabsContent>

          <TabsContent value="tehillim" className="mt-3">
            <TabContent
              sizeValue={settings.tehillimSize}
              onSizeChange={(v) => updateSettings({ tehillimSize: v })}
              sizeLabel="גודל תהילים"
              fontValue={settings.tehillimFont}
              onFontChange={(f) => updateSettings({ tehillimFont: f })}
              fontLabel="גופן תהילים"
              boldValue={settings.tehillimBold}
              onBoldChange={(b) => updateSettings({ tehillimBold: b })}
              settings={settings}
              updateSettings={updateSettings}
              previewText="מִזְמוֹר לְדָוִד — יְיָ רֹעִי לֹא אֶחְסָר"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
