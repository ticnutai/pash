import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Check, Copy, Edit2, Palette, Plus, Trash2, X } from "lucide-react";
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

function extractHexColor(value: string): string {
  const match = value.match(/#[0-9A-Fa-f]{3,8}/);
  return match?.[0] ?? "#C8A44D";
}

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

/* ─── Large annotated preview ─────────────────────────────── */
function LargePreview({ colors, highlightField }: { colors: OmerThemeColors; highlightField: keyof OmerThemeColors | null }) {
  const hl = (field: keyof OmerThemeColors) =>
    highlightField === field ? "ring-2 ring-blue-500 ring-offset-1" : "";

  return (
    <div
      className={cn("rounded-xl border-2 overflow-hidden transition-all", colors.dialogBg, colors.dialogBorder, hl("dialogBg"), highlightField === "dialogBorder" ? "ring-2 ring-blue-500 ring-offset-1" : "")}
      style={{ borderColor: colors.accentColor }}
    >
      {/* Header */}
      <div className={cn("px-3 py-2 border-b flex items-center justify-between", colors.header, hl("header"))} style={{ borderColor: colors.accentColor + "70" }}>
        <div className="flex gap-1">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: colors.accentColor, opacity: highlightField === "accentColor" ? 1 : 0.6 }} />
          <div className="h-4 w-4 rounded" style={{ backgroundColor: colors.accentColor, opacity: highlightField === "accentColor" ? 1 : 0.6 }} />
        </div>
        <span className={cn("text-sm font-bold", colors.textColor, hl("textColor"))}>לוח ספירת העומר</span>
      </div>

      {/* Board */}
      <div className={cn("p-3 space-y-2", colors.boardBg, hl("boardBg"))}>
        {/* Row of cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className={cn("p-2 rounded-lg border text-center", colors.today, hl("today"))}>
            <p className={cn("text-xs font-bold", colors.textColor)}>ג׳ לעומר</p>
            <p className={cn("text-[10px]", colors.textMuted, hl("textMuted"))}>חסד שבתפארת</p>
          </div>
          <div className={cn("p-2 rounded-lg border text-center", colors.card, hl("card"))}>
            <p className={cn("text-xs", colors.textColor, hl("textColor"))}>ב׳ לעומר</p>
            <p className={cn("text-[10px]", colors.textMuted)}>גבורה שבחסד</p>
          </div>
          <div className={cn("p-2 rounded-lg border text-center", colors.card)}>
            <p className={cn("text-xs", colors.textColor)}>א׳ לעומר</p>
            <p className={cn("text-[10px]", colors.textMuted)}>חסד שבחסד</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className={cn("p-2 rounded-lg border text-center", colors.card)}>
            <p className={cn("text-xs", colors.textColor)}>ו׳ לעומר</p>
            <p className={cn("text-[10px]", colors.textMuted)}>יסוד שבחסד</p>
          </div>
          <div className={cn("p-2 rounded-lg border text-center", colors.card)}>
            <p className={cn("text-xs", colors.textColor)}>ה׳ לעומר</p>
            <p className={cn("text-[10px]", colors.textMuted)}>הוד שבחסד</p>
          </div>
          <div className={cn("p-2 rounded-lg border text-center", colors.card)}>
            <p className={cn("text-xs", colors.textColor)}>ד׳ לעומר</p>
            <p className={cn("text-[10px]", colors.textMuted)}>נצח שבחסד</p>
          </div>
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
  const [colors, setColors] = useState<OmerThemeColors>({ ...theme.colors });
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

      {/* Side-by-side: preview right, fields left */}
      <div className="flex gap-4">
        {/* Right: sticky preview */}
        <div className="w-1/2 flex-shrink-0 sticky top-0 self-start space-y-2">
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

        {/* Left: scrollable color fields */}
        <div className="w-1/2 space-y-3 overflow-y-auto max-h-[65vh] pr-1 omer-scrollbar">
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
                  value={extractHexColor(colors[key])}
                  onChange={(e) => {
                    const hex = e.target.value;
                    const current = colors[key];
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
                  value={extractHexColor(colors[key])}
                  onChange={(e) => {
                    const hex = e.target.value;
                    const current = colors[key];
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
      <DialogContent className={cn("max-h-[90vh] p-0 overflow-hidden", isEditing ? "sm:max-w-[900px]" : "sm:max-w-[540px]")} dir="rtl">
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
                <div className="grid grid-cols-3 gap-2">
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
                  <div className="grid grid-cols-3 gap-2">
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
