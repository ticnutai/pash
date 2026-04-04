import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Copy, Edit2, Palette, Plus, Trash2, X } from "lucide-react";
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

const COLOR_FIELDS: Array<{ key: keyof OmerThemeColors; label: string; isAccent?: boolean }> = [
  { key: "accentColor", label: "צבע מבטא", isAccent: true },
  { key: "boardBg", label: "רקע לוח" },
  { key: "dialogBg", label: "רקע דיאלוג" },
  { key: "dialogBorder", label: "גבול דיאלוג" },
  { key: "header", label: "רקע כותרת" },
  { key: "card", label: "סגנון כרטיס" },
  { key: "today", label: "סגנון היום" },
  { key: "textColor", label: "צבע טקסט" },
  { key: "textMuted", label: "צבע טקסט מעומעם" },
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
      {/* Color preview dots */}
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

function ThemeEditor({
  theme,
  onSave,
  onCancel,
}: {
  theme: OmerTheme;
  onSave: (name: string, colors: OmerThemeColors) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(theme.name);
  const [colors, setColors] = useState<OmerThemeColors>({ ...theme.colors });

  const updateColor = (key: keyof OmerThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel} className="gap-1 text-xs">
            <X className="h-3 w-3" />
            ביטול
          </Button>
          <Button size="sm" onClick={() => onSave(name, colors)} className="gap-1 text-xs">
            <Check className="h-3 w-3" />
            שמור
          </Button>
        </div>
        <h3 className="font-bold text-sm">עריכת ערכת נושא</h3>
      </div>

      <div>
        <Label className="text-xs">שם הערכה</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-right text-sm h-8 mt-1"
          dir="rtl"
        />
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-3">
        {COLOR_FIELDS.map(({ key, label, isAccent }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label}</Label>
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
                <Input
                  value={colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                  className="text-[11px] h-8 flex-1 font-mono"
                  dir="ltr"
                  placeholder="Tailwind class..."
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

      {/* Live preview */}
      <Separator />
      <div>
        <Label className="text-xs mb-2 block">תצוגה מקדימה</Label>
        <div className={cn("p-3 rounded-lg border-2", colors.boardBg)} style={{ borderColor: colors.accentColor }}>
          <div className="flex gap-2 justify-end">
            <div className={cn("rounded-md p-2 border text-xs text-center", colors.card)}>
              <span className={colors.textColor}>א׳ לעומר</span>
            </div>
            <div className={cn("rounded-md p-2 border text-xs text-center", colors.today)}>
              <span className={colors.textColor} style={{ fontWeight: "bold" }}>היום</span>
            </div>
            <div className={cn("rounded-md p-2 border text-xs text-center", colors.card)}>
              <span className={colors.textMuted}>ג׳ לעומר</span>
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

  const handleSave = (name: string, colors: OmerThemeColors) => {
    if (!editingId) return;
    const theme = allThemes.find((t) => t.id === editingId);
    if (!theme) return;

    if (theme.builtIn) {
      // Duplicate as custom then save
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
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] p-0 overflow-hidden" dir="rtl">
        <div className="bg-gradient-to-l from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-end gap-2 text-lg">
              <span>ערכות נושא לספירת העומר</span>
              <Palette className="h-5 w-5 text-amber-600" />
            </DialogTitle>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[70vh] p-4">
          {editingTheme ? (
            <ThemeEditor
              theme={editingTheme}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="space-y-4">
              {/* Add new button */}
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
