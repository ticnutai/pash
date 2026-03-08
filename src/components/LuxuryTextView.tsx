import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { FlatPasuk } from "@/types/torah";
import { toHebrewNumber } from "@/utils/hebrewNumbers";
import { formatTorahText } from "@/utils/textUtils";
import { useTextDisplayStyles } from "@/hooks/useTextDisplayStyles";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useBookmarks } from "@/contexts/BookmarksContext";
import { sharePasukWhatsApp, sharePasukEmail, sharePasukLink } from "@/utils/shareUtils";
import { useRashi, RashiMap } from "@/hooks/useRashi";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Settings2, X, ChevronDown, Share2, Mail, Link2, Eye, MoreHorizontal, BookOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ─── Template definitions ────────────────────────────────────────────────────

type TemplateId = "classic" | "minimal" | "scroll" | "fragment";

interface Template {
  id: TemplateId;
  name: string;
  description: string;
  containerClass: string;
  innerClass: string;
  fontFamily: string;
  lineHeight: string;
  textAlign: "justify" | "right" | "center";
  perekStyle: "ornate" | "simple" | "underline" | "badge";
  pasukNumColor: string;
  background: string;
}

const TEMPLATES: Template[] = [
  {
    id: "classic",
    name: "קלאסי",
    description: "מהודר עם קישוטי זהב",
    containerClass: "bg-card border border-accent/30 rounded-xl shadow-xl",
    innerClass: "px-3 sm:px-10 py-6",
    fontFamily: "'Noto Serif Hebrew', 'David Libre', serif",
    lineHeight: "2.2",
    textAlign: "justify",
    perekStyle: "ornate",
    pasukNumColor: "#c8a04d",
    background: "transparent",
  },
  {
    id: "minimal",
    name: "נקי",
    description: "פשוט ומינימליסטי",
    containerClass: "border-0 shadow-none",
    innerClass: "px-2 sm:px-8 py-5",
    fontFamily: "'Noto Serif Hebrew', sans-serif",
    lineHeight: "2.0",
    textAlign: "right",
    perekStyle: "simple",
    pasukNumColor: "hsl(var(--muted-foreground))",
    background: "transparent",
  },
  {
    id: "scroll",
    name: "גלילה",
    description: "כמו ספר תורה מסורתי",
    containerClass: "bg-[hsl(var(--secondary)/0.3)] border-2 border-accent/50 rounded-lg shadow-2xl",
    innerClass: "px-3 sm:px-12 py-7",
    fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
    lineHeight: "2.4",
    textAlign: "justify",
    perekStyle: "underline",
    pasukNumColor: "#8b5e3c",
    background: "transparent",
  },
  {
    id: "fragment",
    name: "כרטיסיות",
    description: "כל פרק בכרטיסיה נפרדת",
    containerClass: "space-y-4",
    innerClass: "px-2 sm:px-6 py-5",
    fontFamily: "'Noto Serif Hebrew', 'David Libre', serif",
    lineHeight: "2.0",
    textAlign: "right",
    perekStyle: "badge",
    pasukNumColor: "hsl(var(--primary))",
    background: "hsl(var(--card))",
  },
];

// ─── Perek Header ─────────────────────────────────────────────────────────────

const PerekHeader = ({ perek, style }: { perek: number; style: Template["perekStyle"] }) => {
  const label = `פרק ${toHebrewNumber(perek)}`;

  if (style === "ornate") {
    return (
      <div className="text-center mb-6 relative">
        <div className="flex items-center justify-center gap-3">
          <span style={{ color: "#c8a04d", fontSize: "0.7em" }}>❧</span>
          <span className="font-bold tracking-wide text-[#c8a04d]" style={{ fontSize: "0.8em", fontFamily: "inherit" }}>{label}</span>
          <span style={{ color: "#c8a04d", fontSize: "0.7em", transform: "scaleX(-1)", display: "inline-block" }}>❧</span>
        </div>
        <div className="mx-auto mt-2" style={{ width: "50%", height: "1px", background: "linear-gradient(90deg, transparent, #c8a04d, transparent)" }} />
      </div>
    );
  }
  if (style === "simple") {
    return (
      <div className="mb-4 text-center">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
    );
  }
  if (style === "underline") {
    return (
      <div className="mb-6 text-center border-b border-accent/40 pb-2">
        <span className="text-base font-bold text-accent">{label}</span>
      </div>
    );
  }
  // badge
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex-1 h-px bg-border" />
      <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
};

// ─── Pasuk Row ────────────────────────────────────────────────────────────────

type RashiMode = "off" | "inline" | "click";

const RashiBlock = ({ text, fontSize }: { text: string; fontSize: number }) => (
  <div
    dir="rtl"
    className="mt-3 mb-1 border-r-2 border-[#c8a04d]/60 pr-3 animate-fade-in"
    style={{ fontSize: `${Math.max(fontSize - 4, 13)}px`, lineHeight: 1.8 }}
  >
    <span
      className="inline-block text-[10px] font-bold tracking-widest text-[#c8a04d] mb-1 ml-2"
      style={{ fontFamily: "serif" }}
    >
      רש״י:
    </span>
    <span className="text-foreground/80">{text}</span>
  </div>
);

const PasukRow = ({
  pasuk,
  numColor,
  fontSize,
  isBookmarked,
  onToggleBookmark,
  seferId,
  templateId,
  rashiText,
  rashiMode,
  isMobile,
}: {
  pasuk: FlatPasuk;
  numColor: string;
  fontSize: number;
  isBookmarked: boolean;
  onToggleBookmark: (pasuk: FlatPasuk) => void;
  seferId: number;
  templateId: TemplateId;
  rashiText?: string;
  rashiMode: RashiMode;
  isMobile: boolean;
}) => {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [rashiOpen, setRashiOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = () => {
    if (actionsOpen) { setActionsOpen(false); return; }
    longPressTimer.current = setTimeout(() => { setActionsOpen(true); }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const isOrnate = templateId === "classic" || templateId === "scroll";
  const isMinimal = templateId === "minimal";
  const hasRashi = !!rashiText;
  const showRashiInline = rashiMode === "inline" && hasRashi;
  const showRashiToggle = rashiMode === "click" && hasRashi;
  const pasukMarker = toHebrewNumber(pasuk.pasuk_num).replace(/[׳״]/g, "");

  return (
    <div
      className={cn(
        "relative group transition-all",
        !isMinimal && "rounded-xl px-3 py-2",
        isOrnate && "bg-gradient-to-l from-accent/5 via-transparent to-accent/5 border border-accent/15",
      )}
      style={{ margin: "0 0 0.65em", minHeight: "1.6em" }}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchEnd={isMobile ? cancelLongPress : undefined}
      onTouchMove={isMobile ? cancelLongPress : undefined}
    >
      {/* Mobile long-press action overlay */}
      {isMobile && actionsOpen && (
        <div className="absolute top-0 left-0 z-50 flex items-center gap-1 bg-background border border-border rounded-lg shadow-lg p-1" dir="ltr">
          <button
            onTouchEnd={(e) => { e.stopPropagation(); onToggleBookmark(pasuk); setActionsOpen(false); }}
            className={cn("p-1.5 rounded transition-colors", isBookmarked ? "text-accent" : "text-muted-foreground")}
            title={isBookmarked ? "הסר סימניה" : "הוסף סימניה"}
          >
            {isBookmarked ? <BookmarkCheck className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
          </button>
          <button
            onTouchEnd={(e) => { e.stopPropagation(); sharePasukWhatsApp({ seferId, perek: pasuk.perek, pasukNum: pasuk.pasuk_num, pasukText: formatTorahText(pasuk.text), content: pasuk.content || [] }); setActionsOpen(false); }}
            className="p-1.5 rounded text-muted-foreground"
            title="שתף"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onTouchEnd={(e) => { e.stopPropagation(); sharePasukEmail({ seferId, perek: pasuk.perek, pasukNum: pasuk.pasuk_num, pasukText: formatTorahText(pasuk.text), content: pasuk.content || [] }); setActionsOpen(false); }}
            className="p-1.5 rounded text-muted-foreground"
            title="שתף במייל"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            onTouchEnd={(e) => { e.stopPropagation(); sharePasukLink(seferId, pasuk.perek, pasuk.pasuk_num, formatTorahText(pasuk.text)); setActionsOpen(false); }}
            className="p-1.5 rounded text-muted-foreground"
            title="שתף קישור"
          >
            <Link2 className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Action buttons - desktop only */}
      {!isMobile && <div className="mb-2 w-full flex justify-start" dir="ltr">
        <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
          <PopoverTrigger asChild>
            <button
              className="h-8 w-8 rounded-full border border-border/60 bg-background/90 shadow-sm flex items-center justify-center text-muted-foreground hover:text-accent transition-colors"
              title="פעולות פסוק"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="bottom" className="w-auto p-1.5" dir="ltr">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  onToggleBookmark(pasuk);
                  setActionsOpen(false);
                }}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  isBookmarked ? "text-accent" : "text-muted-foreground hover:text-accent"
                )}
                title={isBookmarked ? "הסר סימניה" : "הוסף סימניה"}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-4 w-4 fill-current" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => {
                  sharePasukWhatsApp({
                    seferId,
                    perek: pasuk.perek,
                    pasukNum: pasuk.pasuk_num,
                    pasukText: formatTorahText(pasuk.text),
                    content: pasuk.content || [],
                  });
                  setActionsOpen(false);
                }}
                className="p-1.5 rounded text-muted-foreground hover:text-accent transition-colors"
                title="שתף"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  sharePasukEmail({
                    seferId,
                    perek: pasuk.perek,
                    pasukNum: pasuk.pasuk_num,
                    pasukText: formatTorahText(pasuk.text),
                    content: pasuk.content || [],
                  });
                  setActionsOpen(false);
                }}
                className="p-1.5 rounded text-muted-foreground hover:text-accent transition-colors"
                title="שתף במייל"
              >
                <Mail className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  sharePasukLink(seferId, pasuk.perek, pasuk.pasuk_num, formatTorahText(pasuk.text));
                  setActionsOpen(false);
                }}
                className="p-1.5 rounded text-muted-foreground hover:text-accent transition-colors"
                title="שתף קישור"
              >
                <Link2 className="h-4 w-4" />
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>}

      <p className="m-0" dir="rtl">
        {/* Pasuk number */}
        <span
          className={cn(
            "select-none inline-flex items-center justify-center",
            isMinimal ? "" : "rounded-full px-1.5 border"
          )}
          style={{
            color: numColor,
            fontWeight: 700,
            fontSize: `${fontSize * 0.68}px`,
            marginInlineEnd: "0.45em",
            marginInlineStart: "0.15em",
            minWidth: isMinimal ? "auto" : "1.75em",
            lineHeight: 1.2,
            borderColor: isMinimal ? "transparent" : `${numColor}55`,
            background: isOrnate ? `${numColor}14` : "transparent",
          }}
        >
          {pasukMarker}&lrm;
        </span>

        {/* Text */}
        {formatTorahText(pasuk.text)}

        {/* Rashi click-toggle icon */}
        {showRashiToggle && (
          <button
            onClick={() => setRashiOpen((p) => !p)}
            className={cn(
              "inline-flex items-center justify-center rounded px-1 py-0.5 mx-1 text-[10px] font-bold border transition-colors align-middle",
              rashiOpen
                ? "bg-[#c8a04d]/20 border-[#c8a04d] text-[#c8a04d]"
                : "border-[#c8a04d]/40 text-[#c8a04d]/70 hover:border-[#c8a04d] hover:text-[#c8a04d]"
            )}
            title={rashiOpen ? "הסתר רש״י" : "הצג רש״י"}
          >
            ר״ש
          </button>
        )}
      </p>

      {/* Rashi block — inline mode */}
      {showRashiInline && <RashiBlock text={rashiText!} fontSize={fontSize} />}

      {/* Rashi block — click mode */}
      {showRashiToggle && rashiOpen && <RashiBlock text={rashiText!} fontSize={fontSize} />}
    </div>
  );
};

// ─── Settings Panel ──────────────────────────────────────────────────────────

interface SettingsPanelProps {
  template: TemplateId;
  onTemplateChange: (t: TemplateId) => void;
  fontSize: number;
  onFontSizeChange: (v: number) => void;
  lineHeightOverride: number;
  onLineHeightChange: (v: number) => void;
  onClose: () => void;
}

const SettingsPanel = ({
  template,
  onTemplateChange,
  fontSize,
  onFontSizeChange,
  lineHeightOverride,
  onLineHeightChange,
  onClose,
}: SettingsPanelProps) => (
  <div
    dir="rtl"
    className="bg-card border border-accent/40 rounded-xl shadow-2xl p-5 mb-6 animate-fade-in"
  >
    <div className="flex items-center justify-between mb-5">
      <h3 className="font-bold text-base text-foreground">הגדרות תצוגת שמו"ת</h3>
      <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 rounded-full">
        <X className="h-4 w-4" />
      </Button>
    </div>

    {/* Templates */}
    <div className="mb-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">תבנית עיצוב</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onTemplateChange(t.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-right",
              template === t.id
                ? "border-accent bg-accent/10 shadow-md"
                : "border-border hover:border-accent/50 hover:bg-muted/50"
            )}
          >
            <span className="font-bold text-sm text-foreground">{t.name}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{t.description}</span>
          </button>
        ))}
      </div>
    </div>

    {/* Font size */}
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">גודל גופן</p>
        <span className="text-xs text-accent font-bold">{fontSize}px</span>
      </div>
      <Slider
        dir="rtl"
        min={14}
        max={36}
        step={1}
        value={[fontSize]}
        onValueChange={(v) => onFontSizeChange(v[0])}
        className="[&_.relative]:bg-accent/20 [&_[role=slider]]:border-accent [&_[role=slider]]:bg-accent"
      />
    </div>

    {/* Line height */}
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">מרווח שורות</p>
        <span className="text-xs text-accent font-bold">{lineHeightOverride.toFixed(1)}</span>
      </div>
      <Slider
        dir="rtl"
        min={1.4}
        max={3.5}
        step={0.1}
        value={[lineHeightOverride]}
        onValueChange={(v) => onLineHeightChange(v[0])}
        className="[&_.relative]:bg-accent/20 [&_[role=slider]]:border-accent [&_[role=slider]]:bg-accent"
      />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface LuxuryTextViewProps {
  pesukim: FlatPasuk[];
}

export const LuxuryTextView = ({ pesukim }: LuxuryTextViewProps) => {
  const displayStyles = useTextDisplayStyles();
  const { settings } = useFontAndColorSettings();
  const { isMobile } = useDevice();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const [templateId, setTemplateId] = useState<TemplateId>("classic");
  const [showSettings, setShowSettings] = useState(false);
  const [fontSizeOverride, setFontSizeOverride] = useState<number | null>(null);
  const [lineHeightOverride, setLineHeightOverride] = useState<number | null>(null);
  const [rashiMode, setRashiMode] = useState<RashiMode>(() => {
    try {
      const saved = localStorage.getItem("rashiMode");
      return (saved === "inline" || saved === "click" || saved === "off") ? saved : "inline";
    } catch {
      return "inline";
    }
  });
  const [displayedCount, setDisplayedCount] = useState(10);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadMoreStep = Math.max(6, displayStyles.isMobile ? 6 : 12);
  const displayedPesukim = useMemo(() => pesukim.slice(0, displayedCount), [pesukim, displayedCount]);
  const hasMore = displayedCount < pesukim.length;
  const loadMore = useCallback(() => {
    setDisplayedCount((prev) => Math.min(prev + loadMoreStep, pesukim.length));
  }, [loadMoreStep, pesukim.length]);
  const { rashiMap, loading: rashiLoading } = useRashi(displayedPesukim, rashiMode !== "off");

  const cycleRashiMode = useCallback(() => {
    setRashiMode((prev) => {
      const next: RashiMode = prev === "off" ? "inline" : prev === "inline" ? "click" : "off";
      const labels: Record<RashiMode, string> = { off: "רש״י כבוי", inline: "רש״י מוצג תמיד", click: "רש״י בלחיצה" };      try { localStorage.setItem("rashiMode", next); } catch {}      toast.success(labels[next]);
      return next;
    });
  }, []);

  const template = TEMPLATES.find((t) => t.id === templateId)!;

  const cycleTemplate = useCallback(() => {
    const currentIndex = TEMPLATES.findIndex((t) => t.id === templateId);
    const nextIndex = (currentIndex + 1) % TEMPLATES.length;
    const next = TEMPLATES[nextIndex];
    setTemplateId(next.id);
    setLineHeightOverride(null);
    toast.success(`עיצוב שמו"ת: ${next.name}`);
  }, [templateId]);

  const baseFontSize = settings.pasukSize || 22;
  const scale = displayStyles.fontScale;
  const rawSize = fontSizeOverride ?? (isMobile ? Math.min(baseFontSize * scale, 28) : baseFontSize * scale);
  const effectiveSize = Math.round(rawSize);
  const effectiveLineHeight = lineHeightOverride ?? parseFloat(template.lineHeight);

  // Group only visible verses to keep this mode lightweight on mobile.
  useEffect(() => {
    setDisplayedCount(Math.min(10, pesukim.length));
  }, [pesukim]);

  useEffect(() => {
    if (!hasMore) return;
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "280px",
        threshold: 0.01,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore, displayedCount]);
  const perekGroups: { perek: number; pesukim: FlatPasuk[] }[] = [];
  for (const pasuk of displayedPesukim) {
    const last = perekGroups[perekGroups.length - 1];
    if (last && last.perek === pasuk.perek) {
      last.pesukim.push(pasuk);
    } else {
      perekGroups.push({ perek: pasuk.perek, pesukim: [pasuk] });
    }
  }

  const handleToggleBookmark = useCallback(
    async (pasuk: FlatPasuk) => {
      const pasukId = `${pasuk.sefer}-${pasuk.perek}-${pasuk.pasuk_num}`;
      await toggleBookmark(pasukId, pasuk.text);
    },
    [toggleBookmark]
  );

  if (pesukim.length === 0) {
    return (
      <div className="p-12 text-center animate-fade-in">
        <p className="text-lg text-muted-foreground">אין פסוקים להצגה</p>
      </div>
    );
  }

  // Fragment template renders each perek as its own card
  const isFragmentMode = templateId === "fragment";

  return (
    <div
      className="w-full animate-fade-in"
      style={{ maxWidth: "100%", margin: "0" }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 px-1" dir="rtl">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={cycleTemplate}
            className="h-9 w-9 border-accent/50"
            title='החלף עיצוב שמו"ת'
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant={showSettings ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSettings((p) => !p)}
            className={cn(
              "gap-2 border-accent/50 text-sm font-semibold",
              showSettings && "bg-accent text-accent-foreground"
            )}
          >
            <Settings2 className="h-4 w-4" />
            הגדרות
            <ChevronDown className={cn("h-3 w-3 transition-transform", showSettings && "rotate-180")} />
          </Button>
          {/* Rashi toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={cycleRashiMode}
            className={cn(
              "gap-1.5 border-accent/50 font-bold text-xs",
              rashiMode !== "off" && "bg-[#c8a04d]/15 border-[#c8a04d] text-[#c8a04d]"
            )}
            title={rashiMode === "off" ? "הצג רש״י" : rashiMode === "inline" ? "עבור למצב לחיצה" : "כבה רש״י"}
          >
            {rashiLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <BookOpen className="h-3.5 w-3.5" />
            )}
            רש״י
            {rashiMode !== "off" && (
              <span className="text-[10px] opacity-70">
                {rashiMode === "inline" ? "(תמיד)" : "(לחיצה)"}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          template={templateId}
          onTemplateChange={(t) => {
            setTemplateId(t);
            setLineHeightOverride(null); // reset line height when changing template
          }}
          fontSize={effectiveSize}
          onFontSizeChange={setFontSizeOverride}
          lineHeightOverride={effectiveLineHeight}
          onLineHeightChange={setLineHeightOverride}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Decorative top border (non-fragment modes) */}
      {!isFragmentMode && (
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[hsl(var(--accent))] to-transparent" />
          <span className="text-2xl" style={{ color: "#c8a04d" }}>✦</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[hsl(var(--accent))] to-transparent" />
        </div>
      )}

      {/* Content */}
      {isFragmentMode ? (
        <div className="space-y-4">
          {perekGroups.map((group) => (
            <div
              key={group.perek}
              className="rounded-xl border border-border/60 shadow-md overflow-hidden"
              style={{ background: template.background }}
            >
              <div className={template.innerClass}>
                <PerekHeader perek={group.perek} style={template.perekStyle} />
                <div
                  dir="rtl"
                  style={{
                    fontFamily: settings.pasukFont || template.fontFamily,
                    fontSize: `${effectiveSize}px`,
                    lineHeight: `${effectiveLineHeight}`,
                    textAlign: template.textAlign,
                    paddingInlineStart: displayStyles.isMobile ? "0.15rem" : "1.1rem",
                  }}
                >
                  {group.pesukim.map((pasuk) => {
                    const pasukId = `${pasuk.sefer}-${pasuk.perek}-${pasuk.pasuk_num}`;
                    return (
                      <PasukRow
                        key={pasuk.id}
                        pasuk={pasuk}
                        numColor={template.pasukNumColor}
                        fontSize={effectiveSize}
                        isBookmarked={isBookmarked(pasukId)}
                        onToggleBookmark={handleToggleBookmark}
                        seferId={pasuk.sefer}
                        templateId={template.id}
                        rashiText={rashiMap.get(pasukId)}
                        rashiMode={rashiMode}
                        isMobile={isMobile}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={template.containerClass}>
          <div
            className={template.innerClass}
            dir="rtl"
            style={{
              fontFamily: settings.pasukFont || template.fontFamily,
              fontSize: `${effectiveSize}px`,
              color: "hsl(var(--foreground))",
              lineHeight: `${effectiveLineHeight}`,
              textAlign: template.textAlign,
            }}
          >
            {perekGroups.map((group) => (
              <div key={group.perek} className="mb-8 last:mb-0">
                <PerekHeader perek={group.perek} style={template.perekStyle} />
                <div style={{ paddingInlineStart: displayStyles.isMobile ? "0.15rem" : "1.1rem" }}>
                  {group.pesukim.map((pasuk) => {
                    const pasukId = `${pasuk.sefer}-${pasuk.perek}-${pasuk.pasuk_num}`;
                    return (
                      <PasukRow
                        key={pasuk.id}
                        pasuk={pasuk}
                        numColor={template.pasukNumColor}
                        fontSize={effectiveSize}
                        isBookmarked={isBookmarked(pasukId)}
                        onToggleBookmark={handleToggleBookmark}
                        seferId={pasuk.sefer}
                        templateId={template.id}
                        rashiText={rashiMap.get(pasukId)}
                        rashiMode={rashiMode}
                        isMobile={isMobile}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decorative bottom border (non-fragment modes) */}
      {!isFragmentMode && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[hsl(var(--accent))] to-transparent" />
          <span className="text-2xl" style={{ color: "#c8a04d" }}>✦</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[hsl(var(--accent))] to-transparent" />
        </div>
      )}

      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center mt-5">
          <Button
            variant="outline"
            onClick={loadMore}
            className="border-accent/50"
          >
            טען עוד פסוקים
          </Button>
        </div>
      )}
    </div>
  );
};
