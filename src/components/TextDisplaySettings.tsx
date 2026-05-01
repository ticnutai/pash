import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AlignRight, AlignCenter, AlignLeft, AlignJustify, Type, X, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";
import { useDevice } from "@/contexts/DeviceContext";

export type TextSettingsTab = "pasuk" | "titles" | "questions" | "commentary" | "siddur" | "tehillim";

const hebrewFonts = [
  { value: "David Libre", label: "דוד ליברה" },
  { value: "Frank Ruehl Libre", label: "פרנק רוהל" },
  { value: "Noto Serif Hebrew", label: "נוטו סריף" },
  { value: "Miriam Libre", label: "מרים ליברה" },
  { value: "Rubik", label: "רוביק" },
  { value: "Heebo", label: "היבו" },
  { value: "Alef", label: "אלף" },
  { value: "Varela Round", label: "וארלה ראונד" },
  { value: "Assistant", label: "אסיסטנט" },
  { value: "Secular One", label: "סקולר וואן" },
  { value: "Suez One", label: "סואץ וואן" },
  { value: "Arial", label: "אריאל" },
  { value: "Times New Roman", label: "טיימס ניו רומן" },
];

const alignmentValues = ["right", "center", "left", "justify"] as const;
const spacingValues   = ["compact", "normal", "comfortable", "spacious"] as const;
const lineHeightValues = ["tight", "normal", "relaxed", "loose"] as const;
const widthValues     = ["narrow", "normal", "wide", "full"] as const;

const spacingLabels: Record<string, string>    = { compact: "צפוף", normal: "רגיל", comfortable: "נוח", spacious: "מרווח" };
const lineHeightLabels: Record<string, string> = { tight: "צמוד", normal: "רגיל", relaxed: "רגוע", loose: "רפוי" };
const widthLabels: Record<string, string>      = { narrow: "צר", normal: "רגיל", wide: "רחב", full: "מלא" };
const alignmentLabels: Record<string, string>  = { right: "ימין", center: "מרכז", left: "שמאל", justify: "ישור" };

const lhToNum = (lh: string) =>
  lh === "tight" ? 1.3 : lh === "relaxed" ? 1.7 : lh === "loose" ? 2.0 : 1.5;

/* ─── SliderSection ──────────────────────────────────────── */
interface SliderSectionProps {
  label: string;
  valueBadge: string;
  value: number;
  onChange: (v: number) => void;
  min: number; max: number; step: number;
  marks?: string[];
  icon?: React.ReactNode;
}
const SliderSection = ({ label, valueBadge, value, onChange, min, max, step, marks, icon }: SliderSectionProps) => (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded">{valueBadge}</span>
      <Label className="text-sm font-semibold flex items-center gap-1">{label} {icon}</Label>
    </div>
    <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="w-full" />
    {marks && (
      <div className="flex justify-between text-xs text-muted-foreground">
        {marks.map((m, i) => <span key={i}>{m}</span>)}
      </div>
    )}
  </div>
);

/* ─── FontSelector ───────────────────────────────────────── */
const FontSelector = ({ label, value, onChange }: { label: string; value: string; onChange: (f: string) => void }) => (
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
      <SelectContent className="max-h-[260px] z-[10001]">
        {hebrewFonts.map((font) => (
          <SelectItem key={font.value} value={font.value} className="py-2">
            <div className="flex items-center gap-3 w-full">
              <span className="text-xs text-muted-foreground shrink-0">{font.label}</span>
              <span style={{ fontFamily: font.value, fontSize: '15px' }} className="text-foreground">
                בְּרֵאשִׁית בָּרָא
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

/* ─── SettingsControls ───────────────────────────────────── */
interface SettingsControlsProps {
  sizeValue: number;    onSizeChange: (v: number) => void;   sizeLabel: string;
  fontValue: string;    onFontChange: (f: string) => void;   fontLabel: string;
  boldValue: boolean;   onBoldChange: (b: boolean) => void;
  settings: ReturnType<typeof useFontAndColorSettings>["settings"];
  updateSettings: ReturnType<typeof useFontAndColorSettings>["updateSettings"];
}
const SettingsControls = ({
  sizeValue, onSizeChange, sizeLabel,
  fontValue, onFontChange, fontLabel,
  boldValue, onBoldChange,
  settings, updateSettings,
}: SettingsControlsProps) => {
  const currentWidthIdx      = widthValues.indexOf(settings.contentWidth);

  // Convert presets to numeric for continuous sliders
  const lhNum = settings.lineHeight === "custom"
    ? (settings.lineHeightCustom ?? 1.5)
    : settings.lineHeight === "tight" ? 1.3 : settings.lineHeight === "relaxed" ? 1.7 : settings.lineHeight === "loose" ? 2.0 : 1.5;

  const spacingNum = settings.contentSpacing === "custom"
    ? (settings.contentSpacingCustom ?? 1)
    : settings.contentSpacing === "compact" ? 0.5 : settings.contentSpacing === "comfortable" ? 1.5 : settings.contentSpacing === "spacious" ? 2.0 : 1.0;

  const lsNum = settings.letterSpacing === "custom"
    ? (settings.letterSpacingCustom ?? 0)
    : settings.letterSpacing === "tight" ? -0.02 : settings.letterSpacing === "wide" ? 0.05 : settings.letterSpacing === "wider" ? 0.1 : 0;

  return (
    <div className="space-y-4 py-1" dir="rtl">
      <FontSelector label={fontLabel} value={fontValue} onChange={onFontChange} />

      <div className="flex items-center justify-between">
        <Switch checked={boldValue} onCheckedChange={onBoldChange} />
        <Label className="text-sm font-semibold">טקסט מודגש</Label>
      </div>

      <Separator className="bg-accent/20" />

      <SliderSection
        label={sizeLabel} valueBadge={`${sizeValue}px`}
        value={sizeValue} onChange={onSizeChange}
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
              : align === "left"   ? <AlignLeft className="h-4 w-4" />
              : <AlignJustify className="h-4 w-4" />;
            return (
              <Button key={align} variant="ghost" size="sm"
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

      <SliderSection
        label="גובה שורה"
        valueBadge={lhNum.toFixed(2)}
        value={lhNum}
        onChange={(v) => updateSettings({ lineHeight: "custom", lineHeightCustom: parseFloat(v.toFixed(2)) })}
        min={1.0} max={2.5} step={0.05}
        marks={["1.0", "1.5", "2.0", "2.5"]}
      />

      <Separator className="bg-accent/20" />

      <SliderSection
        label="מרווח תוכן"
        valueBadge={`${spacingNum.toFixed(1)}rem`}
        value={spacingNum}
        onChange={(v) => updateSettings({ contentSpacing: "custom", contentSpacingCustom: parseFloat(v.toFixed(1)) })}
        min={0} max={3} step={0.1}
        marks={["0", "1", "2", "3"]}
      />

      <Separator className="bg-accent/20" />

      <SliderSection
        label="רוחב תוכן"
        valueBadge={widthLabels[settings.contentWidth]}
        value={currentWidthIdx >= 0 ? currentWidthIdx : 1}
        onChange={(v) => updateSettings({ contentWidth: widthValues[v] })}
        min={0} max={3} step={1}
        marks={["מלא", "רחב", "רגיל", "צר"]}
      />

      <Separator className="bg-accent/20" />

      <SliderSection
        label="מרווח בין אותיות"
        valueBadge={`${lsNum.toFixed(2)}em`}
        value={lsNum}
        onChange={(v) => updateSettings({ letterSpacing: "custom", letterSpacingCustom: parseFloat(v.toFixed(2)) })}
        min={-0.05} max={0.2} step={0.01}
        marks={["-0.05", "0", "0.1", "0.2"]}
      />

      <Separator className="bg-accent/20" />

      <SliderSection
        label="מרווח בין מילים"
        valueBadge={`${(settings.wordSpacing ?? 0).toFixed(2)}em`}
        value={settings.wordSpacing ?? 0}
        onChange={(v) => updateSettings({ wordSpacing: parseFloat(v.toFixed(2)) })}
        min={0} max={0.5} step={0.01}
        marks={["0", "0.25", "0.5"]}
      />
    </div>
  );
};

/* ─── Live preview strip ─────────────────────────────────── */
interface PreviewStripProps {
  text: string;
  font: string;
  size: number;
  bold: boolean;
  alignment: string;
  lineHeight: string;
  letterSpacing?: string;
  wordSpacing?: string;
}
const PreviewStrip = ({ text, font, size, bold, alignment, lineHeight, letterSpacing, wordSpacing }: PreviewStripProps) => (
  <div className="mx-3 mb-2 rounded-xl border-2 border-accent/30 bg-gradient-to-b from-muted/30 to-muted/10 flex-shrink-0 overflow-hidden">
    <div className="flex items-center justify-between px-3 pt-2 pb-1.5 border-b border-accent/15">
      <span className="text-[10px] text-muted-foreground font-medium">תצוגה מקדימה</span>
      <div className="flex items-center gap-1">
        <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        <span className="text-[10px] text-accent font-semibold">חיה</span>
      </div>
    </div>
    <div className="px-4 py-3 min-h-[72px] flex items-center">
      <p
        style={{
          fontFamily: font,
          fontSize: `${Math.min(size, 26)}px`,
          fontWeight: bold ? "bold" : "normal",
          textAlign: alignment as React.CSSProperties["textAlign"],
          lineHeight: lhToNum(lineHeight),
          letterSpacing: letterSpacing || "0em",
          wordSpacing: wordSpacing || "0em",
          direction: "rtl",
          width: "100%",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        }}
        className="text-foreground"
      >
        {text}
      </p>
    </div>
  </div>
);

/* ─── Per-tab preview text ──────────────────────────────── */
const TAB_PREVIEW_TEXT: Record<TextSettingsTab, string> = {
  pasuk:       "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ",
  titles:      "פרשת בראשית — פרק א׳",
  questions:   "מדוע נאמר 'בראשית' ולא 'בתחילה'?",
  commentary:  "אמר רבי יצחק: לא היה צריך להתחיל את התורה אלא מ'החודש הזה לכם'",
  siddur:      "בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם",
  tehillim:    "מִזְמוֹר לְדָוִד — יְיָ רֹעִי לֹא אֶחְסָר",
};

/* ─── Main component ─────────────────────────────────────── */
export const TextDisplaySettings = ({ initialTab = "pasuk" }: { initialTab?: TextSettingsTab }) => {
  const { settings, updateSettings } = useFontAndColorSettings();
  const { isMobile } = useDevice();
  const [open, setOpen]           = useState(false);
  const [activeTab, setActiveTab] = useState<TextSettingsTab>(initialTab);
  const [pos, setPos]             = useState<{ x: number; y: number } | null>(null);

  // Scoped settings helpers for siddur / tehillim
  const scopedSettings = (scope: "siddur" | "tehillim") => ({
    ...settings,
    textAlignment: scope === "siddur" ? settings.siddurTextAlignment  : settings.tehillimTextAlignment,
    lineHeight:    scope === "siddur" ? settings.siddurLineHeight      : settings.tehillimLineHeight,
    lineHeightCustom: scope === "siddur" ? settings.siddurLineHeightCustom : settings.tehillimLineHeightCustom,
    contentWidth:  scope === "siddur" ? settings.siddurContentWidth    : settings.tehillimContentWidth,
  });

  const scopedUpdater = (scope: "siddur" | "tehillim") => (patch: Partial<typeof settings>) => {
    const out: Partial<typeof settings> = {};
    if (patch.textAlignment) {
      if (scope === "siddur") out.siddurTextAlignment = patch.textAlignment;
      else out.tehillimTextAlignment = patch.textAlignment;
    }
    if (patch.lineHeight) {
      if (scope === "siddur") out.siddurLineHeight = patch.lineHeight;
      else out.tehillimLineHeight = patch.lineHeight;
    }
    if (typeof patch.lineHeightCustom === "number") {
      if (scope === "siddur") out.siddurLineHeightCustom = patch.lineHeightCustom;
      else out.tehillimLineHeightCustom = patch.lineHeightCustom;
    }
    if (patch.contentWidth) {
      if (scope === "siddur") out.siddurContentWidth = patch.contentWidth;
      else out.tehillimContentWidth = patch.contentWidth;
    }
    if (patch.contentSpacing) out.contentSpacing = patch.contentSpacing;
    if (typeof patch.contentSpacingCustom === "number") out.contentSpacingCustom = patch.contentSpacingCustom;
    updateSettings(out);
  };

  // Compute preview letter/word spacing
  const previewLetterSpacing = settings.letterSpacing === "custom"
    ? `${settings.letterSpacingCustom ?? 0}em`
    : settings.letterSpacing === "tight" ? "-0.02em"
    : settings.letterSpacing === "wide" ? "0.05em"
    : settings.letterSpacing === "wider" ? "0.1em"
    : "0em";
  const previewWordSpacing = `${settings.wordSpacing ?? 0}em`;

  // Derive preview props for the current active tab
  const getPreviewProps = (): PreviewStripProps => {
    const text = TAB_PREVIEW_TEXT[activeTab];
    const spacing = { letterSpacing: previewLetterSpacing, wordSpacing: previewWordSpacing };
    switch (activeTab) {
      case "pasuk":      return { text, font: settings.pasukFont,       size: settings.pasukSize,       bold: settings.pasukBold,       alignment: settings.textAlignment,         lineHeight: settings.lineHeight,          ...spacing };
      case "titles":     return { text, font: settings.titleFont,       size: settings.titleSize,       bold: settings.titleBold,       alignment: settings.textAlignment,         lineHeight: settings.lineHeight,          ...spacing };
      case "questions":  return { text, font: settings.questionFont,    size: settings.questionSize,    bold: settings.questionBold,    alignment: settings.textAlignment,         lineHeight: settings.lineHeight,          ...spacing };
      case "commentary": return { text, font: settings.commentaryFont,  size: settings.commentarySize,  bold: settings.commentaryBold,  alignment: settings.textAlignment,         lineHeight: settings.lineHeight,          ...spacing };
      case "siddur":     return { text, font: settings.siddurFont,      size: settings.siddurSize,      bold: settings.siddurBold,      alignment: settings.siddurTextAlignment,   lineHeight: settings.siddurLineHeight,    ...spacing };
      case "tehillim":   return { text, font: settings.tehillimFont,    size: settings.tehillimSize,    bold: settings.tehillimBold,    alignment: settings.tehillimTextAlignment, lineHeight: settings.tehillimLineHeight,  ...spacing };
    }
  };

  // Initialize position on first open
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      if (pos === null) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (isMobile) {
          setPos({ x: 8, y: Math.max(60, vh - 560) });
        } else {
          setPos({ x: vw - 420, y: 70 });
        }
      }
    }
  }, [open, initialTab]);

  // Drag logic
  const startDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button,select,input,[role='slider']")) return;
    e.preventDefault();
    const cx0 = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy0 = "touches" in e ? e.touches[0].clientY : e.clientY;
    const px0 = pos?.x ?? 0;
    const py0 = pos?.y ?? 0;

    const onMove = (me: MouseEvent | TouchEvent) => {
      const cx = "touches" in me ? (me as TouchEvent).touches[0].clientX : (me as MouseEvent).clientX;
      const cy = "touches" in me ? (me as TouchEvent).touches[0].clientY : (me as MouseEvent).clientY;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - 250, px0 + cx - cx0)),
        y: Math.max(56, Math.min(window.innerHeight - 80,  py0 + cy - cy0)),
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onUp);
  }, [pos]);

  const preview = getPreviewProps();

  const tabTriggerClass = "text-xs py-1.5 rounded-lg font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm transition-all";

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(v => !v)}
        className={`h-9 w-9 rounded-xl transition-all border ${
          open
            ? "bg-accent text-accent-foreground border-accent shadow-md"
            : "text-accent hover:text-accent hover:bg-accent/15 border-accent/30"
        }`}
        title="הגדרות תצוגת טקסט"
      >
        <Type className="h-5 w-5" strokeWidth={2.5} />
      </Button>

      {/* Floating panel rendered via portal so it's never blocked */}
      {open && pos !== null && createPortal(
        <div
          dir="rtl"
          style={{
            position: "fixed",
            left:  pos.x,
            top:   pos.y,
            width:    isMobile ? "calc(100vw - 16px)" : 390,
            minWidth: 280,
            minHeight: 420,
            maxWidth:  "95vw",
            maxHeight: "88vh",
            zIndex: 9999,
            resize: "both",
            overflow: "hidden",
          }}
          className="rounded-xl border-2 border-accent bg-card text-foreground shadow-2xl flex flex-col"
          data-layout="floating-text-settings"
        >
          {/* ── Drag handle / title bar ── */}
          <div
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            className="flex items-center justify-between px-3 py-2.5 bg-accent/10 border-b border-accent/20 flex-shrink-0 rounded-t-xl cursor-grab active:cursor-grabbing select-none"
          >
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-colors"
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-accent" />
              <span className="text-sm font-bold text-foreground">הגדרות תצוגה</span>
            </div>
            <GripHorizontal className="h-4 w-4 text-muted-foreground/40" />
          </div>

          {/* ── Tabs + preview + settings ── */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TextSettingsTab)}
            dir="rtl"
            className="flex flex-col flex-1 overflow-hidden"
          >
            {/* Tab list */}
            <div className="px-2 pt-2 flex-shrink-0">
              <TabsList className="w-full grid grid-cols-3 h-auto gap-0.5 bg-muted/50 p-1 rounded-xl border border-border/30">
                <TabsTrigger value="pasuk"      className={tabTriggerClass}>פסוקים</TabsTrigger>
                <TabsTrigger value="titles"     className={tabTriggerClass}>כותרות</TabsTrigger>
                <TabsTrigger value="questions"  className={tabTriggerClass}>שאלות</TabsTrigger>
                <TabsTrigger value="commentary" className={tabTriggerClass}>מפרשים</TabsTrigger>
                <TabsTrigger value="siddur"     className={tabTriggerClass}>תפילות</TabsTrigger>
                <TabsTrigger value="tehillim"   className={tabTriggerClass}>תהילים</TabsTrigger>
              </TabsList>
            </div>

            {/* ── Live preview — always visible, updates instantly ── */}
            <div className="pt-2 flex-shrink-0">
              <PreviewStrip {...preview} />
            </div>

            {/* ── Scrollable settings area ── */}
            <div className="flex-1 overflow-y-auto">
              <TabsContent value="pasuk" className="mt-0 px-3 pb-4">
                <SettingsControls
                  sizeValue={settings.pasukSize}     onSizeChange={(v) => updateSettings({ pasukSize: v })}     sizeLabel="גודל פסוקים"
                  fontValue={settings.pasukFont}     onFontChange={(f) => updateSettings({ pasukFont: f })}     fontLabel="גופן פסוקים"
                  boldValue={settings.pasukBold}     onBoldChange={(b) => updateSettings({ pasukBold: b })}
                  settings={settings} updateSettings={updateSettings}
                />
              </TabsContent>

              <TabsContent value="titles" className="mt-0 px-3 pb-4">
                <SettingsControls
                  sizeValue={settings.titleSize}     onSizeChange={(v) => updateSettings({ titleSize: v })}     sizeLabel="גודל כותרות"
                  fontValue={settings.titleFont}     onFontChange={(f) => updateSettings({ titleFont: f })}     fontLabel="גופן כותרות"
                  boldValue={settings.titleBold}     onBoldChange={(b) => updateSettings({ titleBold: b })}
                  settings={settings} updateSettings={updateSettings}
                />
              </TabsContent>

              <TabsContent value="questions" className="mt-0 px-3 pb-4">
                <SettingsControls
                  sizeValue={settings.questionSize}  onSizeChange={(v) => updateSettings({ questionSize: v })}  sizeLabel="גודל שאלות"
                  fontValue={settings.questionFont}  onFontChange={(f) => updateSettings({ questionFont: f })}  fontLabel="גופן שאלות"
                  boldValue={settings.questionBold}  onBoldChange={(b) => updateSettings({ questionBold: b })}
                  settings={settings} updateSettings={updateSettings}
                />
              </TabsContent>

              <TabsContent value="commentary" className="mt-0 px-3 pb-4">
                <SettingsControls
                  sizeValue={settings.commentarySize} onSizeChange={(v) => updateSettings({ commentarySize: v })} sizeLabel="גודל מפרשים"
                  fontValue={settings.commentaryFont} onFontChange={(f) => updateSettings({ commentaryFont: f })} fontLabel="גופן מפרשים"
                  boldValue={settings.commentaryBold} onBoldChange={(b) => updateSettings({ commentaryBold: b })}
                  settings={settings} updateSettings={updateSettings}
                />
              </TabsContent>

              <TabsContent value="siddur" className="mt-0 px-3 pb-4">
                <SettingsControls
                  sizeValue={settings.siddurSize}    onSizeChange={(v) => updateSettings({ siddurSize: v })}    sizeLabel="גודל תפילות"
                  fontValue={settings.siddurFont}    onFontChange={(f) => updateSettings({ siddurFont: f })}    fontLabel="גופן תפילות"
                  boldValue={settings.siddurBold}    onBoldChange={(b) => updateSettings({ siddurBold: b })}
                  settings={scopedSettings("siddur")} updateSettings={scopedUpdater("siddur")}
                />
              </TabsContent>

              <TabsContent value="tehillim" className="mt-0 px-3 pb-4">
                <SettingsControls
                  sizeValue={settings.tehillimSize}  onSizeChange={(v) => updateSettings({ tehillimSize: v })}  sizeLabel="גודל תהילים"
                  fontValue={settings.tehillimFont}  onFontChange={(f) => updateSettings({ tehillimFont: f })}  fontLabel="גופן תהילים"
                  boldValue={settings.tehillimBold}  onBoldChange={(b) => updateSettings({ tehillimBold: b })}
                  settings={scopedSettings("tehillim")} updateSettings={scopedUpdater("tehillim")}
                />
              </TabsContent>
            </div>
          </Tabs>

          {/* Resize hint corner */}
          <div className="absolute bottom-1 left-1 pointer-events-none opacity-25 select-none">
            <svg viewBox="0 0 10 10" className="w-3 h-3 text-muted-foreground">
              <line x1="2" y1="10" x2="10" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="6" y1="10" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

