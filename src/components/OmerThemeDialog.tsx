import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Check, Copy, Edit2, Palette, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OmerTheme, OmerThemeColors } from "@/hooks/useOmerThemes";

interface OmerThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allThemes: OmerTheme[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: (theme: { name: string; colors: OmerThemeColors }) => string | undefined;
  onUpdate: (id: string, partial: Partial<Pick<OmerTheme, "name" | "colors">>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => string | undefined;
}

const COLOR_FIELDS: Array<{ key: keyof OmerThemeColors; label: string; previewHint: string; isAccent?: boolean }> = [
  { key: "accentColor", label: "צבע מבטא", previewHint: "גבולות וקישוטים", isAccent: true },
  { key: "boardBg", label: "רקע לוח", previewHint: "הרקע הראשי" },
  { key: "dialogBg", label: "רקע דיאלוג", previewHint: "רקע החלון" },
  { key: "dialogBorder", label: "גבול דיאלוג", previewHint: "מסגרת החלון" },
  { key: "header", label: "רקע כותרת", previewHint: "פס עליון" },
  { key: "card", label: "סגנון כרטיס", previewHint: "תא רגיל" },
  { key: "today", label: "סגנון היום", previewHint: "תא היום הנוכחי" },
  { key: "textColor", label: "צבע טקסט", previewHint: "טקסט ראשי" },
  { key: "textMuted", label: "צבע טקסט מעומעם", previewHint: "טקסט משני" },
];

/* ─── Style extraction helpers ────────────────────────────── */

function extractHexColor(value: string): string {
  const match = value.match(/#[0-9A-Fa-f]{3,8}/);
  return match?.[0] ?? "#C8A44D";
}

/** Parse a Tailwind class string → inline backgroundColor */
function toBgStyle(cls: string): React.CSSProperties {
  if (!cls) return {};
  // Gradient
  const from = cls.match(/from-\[([^\]]+)\]/)?.[1];
  const to = cls.match(/to-\[([^\]]+)\]/)?.[1];
  const via = cls.match(/via-\[([^\]]+)\]/)?.[1];
  if (from && to) {
    const stops = via ? `${from}, ${via}, ${to}` : `${from}, ${to}`;
    return { background: `linear-gradient(to bottom, ${stops})` };
  }
  if (/\bbg-white\b/.test(cls)) return { backgroundColor: "#ffffff" };
  const bgHex = cls.match(/bg-\[([^\]]+)\]/)?.[1];
  if (bgHex) return { backgroundColor: bgHex };
  return {};
}

/** Parse a Tailwind class string → inline color */
function toTextStyle(cls: string): React.CSSProperties {
  const m = cls.match(/text-\[([^\]]+)\]/);
  if (!m) return {};
  const hex = m[1];
  const opMatch = cls.match(/text-\[[^\]]+\]\/(\d+)/);
  if (opMatch) return { color: hex, opacity: parseInt(opMatch[1]) / 100 };
  return { color: hex };
}

/** Parse a Tailwind class string → inline borderColor */
function toBorderHex(cls: string): string | undefined {
  const m = cls.match(/border-\[([^\]]+)\]/);
  if (!m) return undefined;
  return m[1].replace(/\/\d+$/, "");
}

const SHADOW_MAP: Record<string, string> = {
  none: "none",
  sm: "0 1px 3px rgba(0,0,0,0.12)",
  md: "0 2px 8px rgba(0,0,0,0.18)",
  lg: "0 4px 16px rgba(0,0,0,0.25)",
};

function PreviewSwatch({ theme, active, onClick }: { theme: OmerTheme; active: boolean; onClick: () => void }) {
  const accent = theme.colors.accentColor;
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all w-full min-h-[80px] group",
        active
          ? "border-primary ring-2 ring-primary/30 shadow-lg scale-[1.02]"
          : "border-muted hover:border-muted-foreground/40 hover:shadow-md"
      )}
    >
      {active && (
        <div className="absolute top-1.5 left-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
      <div className="flex gap-1">
        <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: accent }} />
        <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: extractHexColor(theme.colors.textColor) }} />
        <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: extractHexColor(theme.colors.card) }} />
      </div>
      <span className="text-xs font-semibold text-center leading-tight">{theme.name}</span>
      {!theme.builtIn && (
        <span className="text-[9px] text-muted-foreground">מותאם אישית</span>
      )}
    </button>
  );
}

/* ─── Large annotated preview (inline styles) ─────────────── */
function LargePreview({ colors, highlightField }: { colors: OmerThemeColors; highlightField: keyof OmerThemeColors | null }) {
  const ring = (field: keyof OmerThemeColors): React.CSSProperties =>
    highlightField === field ? { outline: "2px solid #3b82f6", outlineOffset: "1px" } : {};

  const br = colors.borderRadius ?? 8;
  const shadow = SHADOW_MAP[colors.cardShadow ?? "none"];
  const dialogBgStyle = toBgStyle(colors.dialogBg);
  const boardBgStyle = toBgStyle(colors.boardBg);
  const headerBgStyle = toBgStyle(colors.header);
  const cardBgStyle = toBgStyle(colors.card);
  const todayBgStyle = toBgStyle(colors.today);
  const textStyle = toTextStyle(colors.textColor);
  const mutedStyle = toTextStyle(colors.textMuted);
  const cardBorderHex = toBorderHex(colors.card) ?? colors.accentColor;
  const todayBorderHex = toBorderHex(colors.today) ?? colors.accentColor;

  return (
    <div
      style={{
        borderRadius: br + 4,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: colors.accentColor,
        overflow: "hidden",
        transition: "all 0.2s",
        ...dialogBgStyle,
        ...ring("dialogBg"),
        ...(highlightField === "dialogBorder" ? { outline: "2px solid #3b82f6", outlineOffset: "1px" } : {}),
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: `1px solid ${colors.accentColor}70`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          ...headerBgStyle,
          ...ring("header"),
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          <div style={{ height: 16, width: 16, borderRadius: 4, backgroundColor: colors.accentColor, opacity: highlightField === "accentColor" ? 1 : 0.6 }} />
          <div style={{ height: 16, width: 16, borderRadius: 4, backgroundColor: colors.accentColor, opacity: highlightField === "accentColor" ? 1 : 0.6 }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, ...textStyle, ...ring("textColor") }}>
          לוח ספירת העומר
        </span>
      </div>

      {/* Board */}
      <div style={{ padding: 12, ...boardBgStyle, ...ring("boardBg") }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {/* Today card */}
          <div style={{
            padding: 8, borderRadius: br, border: `2px solid ${todayBorderHex}`,
            textAlign: "center", boxShadow: `0 0 0 2px ${todayBorderHex}40, ${shadow}`,
            ...todayBgStyle, ...ring("today"),
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, ...textStyle }}>ג׳ לעומר</p>
            <p style={{ fontSize: 10, ...mutedStyle, ...ring("textMuted") }}>חסד שבתפארת</p>
          </div>
          {/* Regular cards */}
          {[
            { d: "ב׳ לעומר", s: "גבורה שבחסד" },
            { d: "א׳ לעומר", s: "חסד שבחסד" },
          ].map((c, i) => (
            <div key={i} style={{
              padding: 8, borderRadius: br, border: `1px solid ${cardBorderHex}`,
              textAlign: "center", boxShadow: shadow,
              ...cardBgStyle, ...ring("card"),
            }}>
              <p style={{ fontSize: 12, ...textStyle }}>{c.d}</p>
              <p style={{ fontSize: 10, ...mutedStyle }}>{c.s}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          {[
            { d: "ו׳ לעומר", s: "יסוד שבחסד" },
            { d: "ה׳ לעומר", s: "הוד שבחסד" },
            { d: "ד׳ לעומר", s: "נצח שבחסד" },
          ].map((c, i) => (
            <div key={i} style={{
              padding: 8, borderRadius: br, border: `1px solid ${cardBorderHex}`,
              textAlign: "center", boxShadow: shadow,
              ...cardBgStyle,
            }}>
              <p style={{ fontSize: 12, ...textStyle }}>{c.d}</p>
              <p style={{ fontSize: 10, ...mutedStyle }}>{c.s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Theme Editor ────────────────────────────────────────── */
function ThemeEditor({
  theme,
  isBuiltIn,
  onSave,
  onCancel,
}: {
  theme: OmerTheme;
  isBuiltIn: boolean;
  onSave: (name: string, colors: OmerThemeColors) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(isBuiltIn ? theme.name + " (מותאם)" : theme.name);
  const [colors, setColors] = useState<OmerThemeColors>({
    ...theme.colors,
    borderRadius: theme.colors.borderRadius ?? 8,
    cardShadow: theme.colors.cardShadow ?? "none",
  });
  const [highlightField, setHighlightField] = useState<keyof OmerThemeColors | null>(null);

  const updateColor = (key: keyof OmerThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-3" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel} className="gap-1 text-xs">
            <ArrowRight className="h-3 w-3" />
            חזור
          </Button>
          <Button size="sm" onClick={() => onSave(name, colors)} className="gap-1 text-xs bg-amber-500 hover:bg-amber-600 text-white">
            <Check className="h-3 w-3" />
            {isBuiltIn ? "שמור כערכה חדשה" : "שמור"}
          </Button>
        </div>
        <h3 className="font-bold text-sm">{isBuiltIn ? "עריכה (ישמור כעותק)" : "עריכת ערכת נושא"}</h3>
      </div>

      {/* Preview + fields: stacked on mobile, side-by-side on desktop */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Preview */}
        <div className="w-full sm:w-1/2 flex-shrink-0 sm:sticky sm:top-0 sm:self-start space-y-2">
          <Label className="text-xs mb-1.5 block font-semibold">
            תצוגה מקדימה — {highlightField ? COLOR_FIELDS.find(f => f.key === highlightField)?.previewHint ?? "" : "לחץ על שדה צבע"}
          </Label>
          <LargePreview colors={colors} highlightField={highlightField} />
          <div className="pt-2">
            <Label className="text-xs">שם הערכה</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-right text-sm h-8 mt-1"
              dir="rtl"
            />
          </div>
        </div>

        {/* Color fields */}
        <div className="w-full sm:w-1/2 space-y-3 sm:overflow-y-auto sm:max-h-[65vh] pr-1 omer-scrollbar">
          {COLOR_FIELDS.map(({ key, label, previewHint, isAccent }) => (
          <div
            key={key}
            className={cn(
              "space-y-1 p-2 rounded-lg transition-colors cursor-pointer -mx-2",
              highlightField === key ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-muted/50"
            )}
            onMouseEnter={() => setHighlightField(key)}
            onMouseLeave={() => setHighlightField(null)}
            onClick={() => setHighlightField(key)}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{previewHint}</span>
              <Label className="text-xs font-semibold">{label}</Label>
            </div>
            {isAccent ? (
              <div className="flex items-center gap-2">
                <Input
                  value={colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                  className="text-xs h-8 flex-1 font-mono"
                  dir="ltr"
                  placeholder="#C8A44D"
                />
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                  className="h-8 w-10 rounded cursor-pointer border"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={extractHexColor(String(colors[key]))}
                  onChange={(e) => {
                    const hex = e.target.value;
                    const current = String(colors[key]);
                    const existingHex = current.match(/#[0-9A-Fa-f]{3,8}/);
                    if (existingHex) {
                      updateColor(key, current.replace(existingHex[0], hex));
                    } else {
                      updateColor(key, key.startsWith("text") ? `text-[${hex}]` : `bg-[${hex}]`);
                    }
                  }}
                  className="text-xs h-8 w-24 font-mono"
                  dir="ltr"
                  placeholder="#000000"
                />
                <input
                  type="color"
                  value={extractHexColor(String(colors[key]))}
                  onChange={(e) => {
                    const hex = e.target.value;
                    const current = String(colors[key]);
                    const existingHex = current.match(/#[0-9A-Fa-f]{3,8}/);
                    if (existingHex) {
                      updateColor(key, current.replace(existingHex[0], hex));
                    } else {
                      updateColor(key, key.startsWith("text") ? `text-[${hex}]` : `bg-[${hex}]`);
                    }
                  }}
                  className="h-8 w-10 rounded cursor-pointer border"
                />
              </div>
            )}
          </div>
        ))}

          {/* ─── Style options ─── */}
          <Separator className="my-2" />
          <h4 className="text-xs font-bold text-right">אפשרויות עיצוב</h4>

          <div className="space-y-1 p-2 rounded-lg -mx-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{colors.borderRadius ?? 8}px</span>
              <Label className="text-xs font-semibold">עיגול פינות</Label>
            </div>
            <input
              type="range" min={0} max={24} step={1}
              value={colors.borderRadius ?? 8}
              onChange={(e) => setColors((prev) => ({ ...prev, borderRadius: Number(e.target.value) }))}
              className="w-full accent-amber-500 h-1.5" dir="ltr"
            />
          </div>

          <div className="space-y-1 p-2 rounded-lg -mx-2">
            <Label className="text-xs font-semibold block text-right mb-1">צל כרטיסים</Label>
            <div className="flex gap-1.5 justify-end flex-wrap">
              {(["none", "sm", "md", "lg"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setColors((prev) => ({ ...prev, cardShadow: v }))}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all",
                    (colors.cardShadow ?? "none") === v
                      ? "bg-amber-500 text-white border-amber-600"
                      : "border-muted hover:bg-muted/50"
                  )}
                >
                  {{ none: "ללא", sm: "קל", md: "בינוני", lg: "חזק" }[v]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OmerThemeDialog({
  open,
  onOpenChange,
  allThemes,
  activeId,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onDuplicate,
}: OmerThemeDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingTheme = editingId ? allThemes.find((t) => t.id === editingId) : null;
  const isEditing = !!editingTheme;

  const handleSave = (name: string, colors: OmerThemeColors) => {
    if (!editingId) return;
    const theme = allThemes.find((t) => t.id === editingId);
    if (!theme) return;

    if (theme.builtIn) {
      const newId = onAdd({ name, colors });
      if (newId) onSelect(newId);
    } else {
      onUpdate(editingId, { name, colors });
    }
    setEditingId(null);
  };

  const handleAddNew = () => {
    const base = allThemes.find((t) => t.id === activeId) ?? allThemes[0];
    const newId = onAdd({
      name: "ערכה מותאמת",
      colors: { ...base.colors },
    });
    if (newId) {
      setEditingId(newId);
      onSelect(newId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] w-[96vw] p-0 overflow-hidden", isEditing ? "sm:max-w-[900px]" : "sm:max-w-[540px]")} dir="rtl">
        <div className="bg-gradient-to-l from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-end gap-2 text-lg">
              <span>ערכות נושא לספירת העומר</span>
              <Palette className="h-5 w-5 text-amber-600" />
            </DialogTitle>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[78vh] p-4">
          {editingTheme ? (
            <ThemeEditor
              theme={editingTheme}
              isBuiltIn={editingTheme.builtIn}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed border-2 h-12 text-sm"
                onClick={handleAddNew}
              >
                <Plus className="h-4 w-4" />
                צור ערכת נושא חדשה
              </Button>

              {/* Built-in themes */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 text-right">ערכות מובנות</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allThemes.filter((t) => t.builtIn).map((theme) => (
                    <div key={theme.id} className="relative group">
                      <PreviewSwatch
                        theme={theme}
                        active={activeId === theme.id}
                        onClick={() => onSelect(theme.id)}
                      />
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingId(theme.id); }}
                          className="h-5 w-5 rounded bg-background/90 border flex items-center justify-center hover:bg-accent"
                          title="ערוך (נשמר כעותק)"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDuplicate(theme.id); }}
                          className="h-5 w-5 rounded bg-background/90 border flex items-center justify-center hover:bg-accent"
                          title="שכפל"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom themes */}
              {allThemes.some((t) => !t.builtIn) && (
                <div>
                  <Separator className="mb-3" />
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 text-right">ערכות מותאמות אישית</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allThemes.filter((t) => !t.builtIn).map((theme) => (
                      <div key={theme.id} className="relative group">
                        <PreviewSwatch
                          theme={theme}
                          active={activeId === theme.id}
                          onClick={() => onSelect(theme.id)}
                        />
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingId(theme.id); }}
                            className="h-5 w-5 rounded bg-background/90 border flex items-center justify-center hover:bg-accent"
                            title="ערוך"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDuplicate(theme.id); }}
                            className="h-5 w-5 rounded bg-background/90 border flex items-center justify-center hover:bg-accent"
                            title="שכפל"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemove(theme.id); }}
                            className="h-5 w-5 rounded bg-background/90 border flex items-center justify-center hover:bg-destructive/10 text-destructive"
                            title="מחק"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
