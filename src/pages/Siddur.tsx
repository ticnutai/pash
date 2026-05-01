import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { TextDisplaySettings } from "@/components/TextDisplaySettings";
import { OmerBoardDialog } from "@/components/OmerBoardDialog";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";
import { ArrowLeft, ChevronDown, ChevronUp, BookMarked, Loader2, BookOpen, ExternalLink, LayoutList, AlignJustify, ScrollText, Layers, Sunrise, Sun, Moon, Sparkles, Flame, Star, Leaf, Heart, Book, type LucideProps } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSiddurCategories, useSiddurSections, useTehillimData } from "@/hooks/useSiddurData";

/* ─── Types ─────────────────────────────────────────────── */
type SiddurSection   = { title: string; lines: string[] };
type SiddurCategory  = { name: string; sections: SiddurSection[]; total_lines: number };
type SiddurData      = Record<string, SiddurCategory>;
type TehillimChapter = { chapter: number; title: string; lines: string[] };
type TehillimMap     = Record<string, TehillimChapter>;
type DisplayStyle    = "classic" | "ornate";

const SiddurDisplayStyleContext = createContext<{
  displayStyle: DisplayStyle;
  setDisplayStyle: (style: DisplayStyle) => void;
} | null>(null);

const useSiddurDisplayStyle = () => {
  const ctx = useContext(SiddurDisplayStyleContext);
  return ctx ?? { displayStyle: "classic" as DisplayStyle, setDisplayStyle: () => {} };
};

/* ─── Nusach list ────────────────────────────────────────── */
const NUSACHOT = [
  { id: "sefard",          label: "ספרד",           fullName: "נוסח ספרד"           },
  { id: "ashkenaz",        label: "אשכנז",          fullName: "נוסח אשכנז"          },
  { id: "edot_hamizrach",  label: "עדות המזרח",     fullName: "נוסח עדות המזרח"     },
  { id: "chabad",          label: "חב\"ד",           fullName: "נוסח חב\"ד"           },
];

/* ─── Category display order & metadata ─────────────────── */
const CATEGORIES_ORDER = [
  "shacharit", "mincha", "arvit",
  "shabbat_kabbalat", "shabbat_arvit", "shabbat_shacharit",
  "shabbat_musaf",    "shabbat_mincha",
  "brachot", "other",
];
/* Tabs that are always shown regardless of nusach data */
const STATIC_TABS = [
  { id: "tehillim", name: "תהילים"       },
  { id: "kria",     name: "קריאה בתורה" },
];
const NUSACH_INDEP = new Set(["tehillim", "kria"]);

function readingGutter(width: "narrow" | "normal" | "wide" | "full"): string {
  if (width === "narrow") return "clamp(18px, 5.5vw, 32px)";
  if (width === "wide") return "clamp(10px, 3.3vw, 18px)";
  if (width === "full") return "clamp(6px, 2.2vw, 12px)";
  return "clamp(14px, 4.2vw, 24px)";
}

/* ─── Hebrew numeral helper (1–150) ───────────────────────── */
function heNum(n: number): string {
  const ones = ["","א","ב","ג","ד","ה","ו","ז","ח","ט"];
  const tens = ["","י","כ","ל","מ","נ","ס","ע","פ","צ"];
  const h   = n >= 100 ? "ק" : "";
  const rem = n % 100;
  if (rem === 15) return h + "ט\u05F4ו";
  if (rem === 16) return h + "ט\u05F4ז";
  return h + (tens[Math.floor(rem / 10)] || "") + (ones[rem % 10] || "");
}

/* ─── HTML line cleaner ──────────────────────────────────── */
function sanitizeHebrewMarkup(html: string): string {
  return html
    .normalize("NFKC")
    .replace(/<\s*big\s*>/gi, "<b>")
    .replace(/<\s*\/\s*big\s*>/gi, "</b>")
    .replace(/<\s*big\s*\/\s*>/gi, "")
    .replace(/<\s*br\s*\/??\s*>/gi, "\n")
    // Keep only supported inline tags to avoid raw tag names in the UI.
    .replace(/<\/?(?!b\b|small\b)[a-z0-9:-]+[^>]*>/gi, "");
}

function cleanLine(html: string): string {
  return sanitizeHebrewMarkup(html)
    .replace(/<[^>]*>/g, "")
    .replace(/&thinsp;/g, "\u2009")
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\{[פסנ]\}/g, "")
    .trim();
}

/* ─── Siddur line classification ───────────────────────────
   Three types:
   "heading"     — <b>short-title</b>  e.g. <b>קדושה</b>
   "instruction" — <small>...</small>  rubric / stage-direction
   "prayer"      — regular / bold-first-word prayer text
──────────────────────────────────────────────────────────── */
const NIKUD_RE   = /[\u05B0-\u05C7\u05F0-\u05F4\uFB1D-\uFB4E]/g;
const TAAMIM_RE  = /[\u0591-\u05AF]/g;
const NIKUD_STRIP = /[\u05B0-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]/g;

function stripText(text: string, showNikud: boolean, showTaamim: boolean): string {
  // Normalize Hebrew presentation forms (e.g. שׁ) to standard letters + marks.
  // This keeps glyph metrics consistent across words in the same font.
  let t = text.normalize("NFKC");
  if (!showTaamim) t = t.replace(TAAMIM_RE, "");
  if (!showNikud)  t = t.replace(NIKUD_STRIP, "");
  return t;
}

function classifyLine(html: string): "heading" | "instruction" | "prayer" {
  const t = html.trim();
  if (t.startsWith("<small>")) return "instruction";
  const m = t.match(/^<b>([^<]+)<\/b>$/);
  if (m && m[1].replace(NIKUD_RE, "").replace(/\s/g, "").length <= 20) return "heading";
  return "prayer";
}

/* Parses <b> and inline <small> tags inside a prayer line into React nodes */
function renderLineContent(html: string): React.ReactNode {
  const h = sanitizeHebrewMarkup(html)
    .replace(/&thinsp;/g, "\u2009")
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\{[פסנ]\}/g, "");
  const parts: React.ReactNode[] = [];
  const re = /<(b|small)>([\s\S]*?)<\/(b|small)>/g;
  let last = 0, key = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(h)) !== null) {
    if (match.index > last) parts.push(h.slice(last, match.index));
    if (match[1] === "b") {
      parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{match[2]}</strong>);
    } else {
      parts.push(
        <span key={key++} style={{ fontSize: "0.77em", opacity: 0.65, fontStyle: "italic" }}>
          {match[2]}
        </span>
      );
    }
    last = re.lastIndex;
  }
  if (last < h.length) parts.push(h.slice(last));
  return parts.length === 0 ? "" : parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

/* Maps lineHeight setting token → CSS value (generous for nikud) */
function lineHeightCSS(lh: string, custom?: number): string {
  if (lh === "tight")    return "1.6";
  if (lh === "normal")   return "2.0";
  if (lh === "relaxed")  return "2.4";
  if (lh === "loose")    return "2.8";
  if (lh === "custom" && custom) return String(custom);
  return "2.0";
}

function withNikudTypography(fontFamily: string, lineHeight: string, showNikud: boolean): React.CSSProperties {
  if (!showNikud) return { fontFamily, lineHeight };
  const parsed = Number(lineHeight);
  const stableLineHeight = Number.isFinite(parsed) ? String(Math.max(parsed, 2.2)) : lineHeight;
  return {
    // Prefer Hebrew fonts with strong niqqud/mark anchoring when nikud is visible.
    fontFamily: `'Noto Serif Hebrew', 'Noto Sans Hebrew', 'David Libre', ${fontFamily}, serif`,
    lineHeight: stableLineHeight,
    fontFeatureSettings: '"mark" 1, "mkmk" 1',
    textRendering: 'optimizeLegibility',
  };
}
/* ─── Gold decoration helpers ───────────────────────────── */
const GOLD = "#c8a04d";
const CAT_ICON: Record<string, React.ComponentType<LucideProps>> = {
  shacharit:         Sunrise,
  mincha:            Sun,
  arvit:             Moon,
  shabbat_kabbalat:  Sparkles,
  shabbat_arvit:     Flame,
  shabbat_shacharit: Star,
  shabbat_musaf:     BookOpen,
  shabbat_mincha:    Leaf,
  brachot:           Heart,
  other:             ScrollText,
  tehillim:          BookMarked,
  kria:              Book,
};
const CatIcon = ({ id }: { id: string }) => {
  const Icon = CAT_ICON[id];
  return Icon ? <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: GOLD }} /> : null;
};
const Divider = () => (
  <div className="my-1 mx-auto" style={{
    width: "60%", height: "1px",
    background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`
  }} />
);
const OrnamentTitle = ({ text, fontSize }: { text: string; fontSize?: number }) => (
  <div className="flex items-center justify-center gap-2 my-2">
    <span style={{ color: GOLD, fontSize: "0.9em" }}>❧</span>
    <span className="font-bold tracking-wide" style={{ color: GOLD, fontFamily: "'Noto Serif Hebrew', 'David Libre', serif", fontSize: fontSize ? `${fontSize}px` : "0.9em" }}>
      {text}
    </span>
    <span style={{ color: GOLD, fontSize: "0.9em", transform: "scaleX(-1)", display: "inline-block" }}>❧</span>
  </div>
);

/* ─── SiddurLine — renders one siddur line with semantic styling ─── */
type SiddurLineSettings = { siddurFont: string; siddurSize: number; siddurBold: boolean; textAlignment: string; lineHeight: string; lineHeightCustom: number; showNikud: boolean; showTaamim: boolean };

const SiddurLine = ({ html, s }: { html: string; s: SiddurLineSettings }) => {
  html = stripText(html, s.showNikud, s.showTaamim);
  const type = classifyLine(html);
  const lh = lineHeightCSS(s.lineHeight, s.lineHeightCustom);
  const nikudStyle = withNikudTypography(s.siddurFont, lh, s.showNikud);

  if (type === "heading") {
    return (
      <div className="flex items-center gap-2 mt-3 mb-0.5" style={{ direction: "rtl" }}>
        <span className="inline-block h-3 w-0.5 rounded-full flex-shrink-0" style={{ background: GOLD, opacity: 0.7 }} />
        <span style={{
          ...nikudStyle,
          fontSize: `${Math.round(s.siddurSize * 0.82)}px`,
          fontWeight: 700,
          color: GOLD,
          letterSpacing: "0.04em",
        }}>
          {renderLineContent(html)}
        </span>
      </div>
    );
  }

  if (type === "instruction") {
    return (
      <p className="text-foreground/60" style={{
        ...nikudStyle,
        fontSize: `${Math.round(s.siddurSize * 0.72)}px`,
        fontStyle: "italic",
        textAlign: s.textAlignment as React.CSSProperties["textAlign"],
        direction: "rtl",
        opacity: 0.7,
      }}>
        {renderLineContent(html)}
      </p>
    );
  }

  return (
    <p className="text-foreground" style={{
      ...nikudStyle,
      fontSize: `${s.siddurSize}px`,
      fontWeight: s.siddurBold ? 700 : 400,
      textAlign: s.textAlignment as React.CSSProperties["textAlign"],
      direction: "rtl",
    }}>
      {renderLineContent(html)}
    </p>
  );
};

/* ─── SectionCard ────────────────────────────────────────── */
const SectionCard = ({ section, initialOpen = false }: { section: SiddurSection; initialOpen?: boolean }) => {
  const [open, setOpen] = useState(initialOpen);
  const { settings: siddurSettings } = useFontAndColorSettings();
  const { displayStyle } = useSiddurDisplayStyle();
  const ornate = displayStyle === "ornate";
  const gutter = readingGutter(siddurSettings.siddurContentWidth);
  const lineSettings: SiddurLineSettings = {
    ...siddurSettings,
    textAlignment: siddurSettings.siddurTextAlignment,
    lineHeight: siddurSettings.siddurLineHeight,
    lineHeightCustom: siddurSettings.siddurLineHeightCustom,
  };

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden mb-2" style={{
      background: ornate ? "linear-gradient(180deg, #fffdfa 0%, #fffaf0 100%)" : "hsl(var(--card))",
      borderColor: ornate ? `${GOLD}44` : undefined,
      boxShadow: ornate ? `0 4px 16px ${GOLD}1f, inset 0 1px 0 #ffffff` : "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      {/* Section header / toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-right transition-colors hover:bg-accent/10 focus:outline-none"
        style={{ direction: "rtl" }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-4 rounded-full" style={{ background: GOLD, opacity: 0.7 }} />
          <span
            className="text-foreground"
            style={{
              fontFamily: siddurSettings.siddurFont,
              fontSize: `${siddurSettings.siddurSize}px`,
              fontWeight: siddurSettings.siddurBold ? 700 : 600,
            }}
          >
            {section.title}
          </span>
        </div>
        <span className="text-muted-foreground ml-2">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Prayer lines */}
      {open && (
        <div
          className="pb-4 pt-2 space-y-1.5 animate-fade-in border-t border-border/40"
          style={{ direction: "rtl", paddingInline: gutter }}
        >
          {section.lines.map((line, i) => (
            <SiddurLine key={i} html={line} s={lineSettings} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── ContinuousReader ───────────────────────────────────── */
const ContinuousReader = ({ sections }: { sections: SiddurSection[] }) => {
  const [visibleCount, setVisibleCount] = useState(8);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { settings: siddurSettings } = useFontAndColorSettings();
  const gutter = readingGutter(siddurSettings.siddurContentWidth);
  const lineSettings: SiddurLineSettings = {
    ...siddurSettings,
    textAlignment: siddurSettings.siddurTextAlignment,
    lineHeight: siddurSettings.siddurLineHeight,
    lineHeightCustom: siddurSettings.siddurLineHeightCustom,
  };

  // Reset when sections array changes (e.g. tab switch)
  useEffect(() => { setVisibleCount(8); }, [sections]);

  useEffect(() => {
    if (visibleCount >= sections.length) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(v => Math.min(v + 8, sections.length)); },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, sections.length]);

  return (
    <div className="space-y-6 pb-8" dir="rtl">
      {sections.slice(0, visibleCount).map((sec, i) => (
        <div key={i}>
          <h3
            className="mb-1 flex items-center gap-2"
            style={{
              color: GOLD,
              fontFamily: siddurSettings.siddurFont,
              fontSize: `${siddurSettings.siddurSize}px`,
              fontWeight: siddurSettings.siddurBold ? 700 : 600,
            }}
          >
            <span className="inline-block w-1.5 h-4 rounded-full flex-shrink-0" style={{ background: GOLD, opacity: 0.7 }} />
            {sec.title}
          </h3>
          <Divider />
          <div
            className="space-y-1.5 mt-2 rounded-xl border border-border/40 bg-card/60 py-3"
            style={{ paddingInline: gutter }}
          >
            {sec.lines.map((line, j) => (
              <SiddurLine key={j} html={line} s={lineSettings} />
            ))}
          </div>
        </div>
      ))}
      {visibleCount < sections.length && (
        <div ref={sentinelRef} className="flex justify-center items-center py-4 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: GOLD }} />
          <span className="text-sm" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
            טוען {sections.length - visibleCount} סעיפים נוספים...
          </span>
        </div>
      )}
    </div>
  );
};

/* ─── CategoryPane ───────────────────────────────────────── */
const CategoryPane = ({
  nusach,
  catId,
  viewMode,
}: {
  nusach: string;
  catId: string;
  viewMode: "accordion" | "continuous";
}) => {
  const { sections, catName, loading, error } = useSiddurSections(nusach, catId);
  const { settings: siddurSettings } = useFontAndColorSettings();

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: GOLD }} />
        <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
          טוען סידור...
        </p>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4" dir="rtl">
        <div className="rounded-xl p-6 text-center max-w-sm border border-border" style={{ background: "hsl(var(--card))" }}>
          <span className="text-3xl mb-3 block">📖</span>
          <p className="font-semibold text-foreground mb-2" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
            הסידור עדיין בהורדה
          </p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );

  if (!sections || !sections.length)
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground" dir="rtl">
        <BookMarked className="h-10 w-10 opacity-30" />
        <p className="text-sm">אין תוכן זמין כרגע</p>
      </div>
    );

  return (
    <div className="pb-8">
      <OrnamentTitle text={catName} fontSize={siddurSettings.siddurSize} />
      <Divider />
      <div className="mt-4">
        {viewMode === "continuous"
          ? <ContinuousReader sections={sections} />
          : (
            <div className="space-y-1">
              {sections.map((sec, i) => (
                <SectionCard key={`${sec.title}-${i}`} section={sec} initialOpen={i === 0} />
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
};

/* ─── CategorySectionsBlock (used by FullContinuousPane) ─── */
const SERIF = "'Noto Serif Hebrew', 'David Libre', serif";

const CategorySectionsBlock = ({ nusach, cat }: { nusach: string; cat: { id: string; name: string } }) => {
  const { sections, loading } = useSiddurSections(nusach, cat.id);
  const { settings: siddurSettings } = useFontAndColorSettings();
  const gutter = readingGutter(siddurSettings.siddurContentWidth);
  const lineSettings: SiddurLineSettings = {
    ...siddurSettings,
    textAlignment: siddurSettings.siddurTextAlignment,
    lineHeight: siddurSettings.siddurLineHeight,
    lineHeightCustom: siddurSettings.siddurLineHeightCustom,
  };
  if (loading)
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  if (!sections?.length) return null;
  return (
    <div className="mb-10">
      <OrnamentTitle text={cat.name} fontSize={siddurSettings.siddurSize} />
      <Divider />
      <div className="mt-4 space-y-6">
        {sections.map((sec, i) => (
          <div key={i}>
            <h3
              className="mb-1 flex items-center gap-2"
              style={{
                color: GOLD,
                fontFamily: siddurSettings.siddurFont,
                fontSize: `${siddurSettings.siddurSize}px`,
                fontWeight: siddurSettings.siddurBold ? 700 : 600,
              }}
            >
              <span className="inline-block w-1.5 h-4 rounded-full flex-shrink-0" style={{ background: GOLD, opacity: 0.7 }} />
              {sec.title}
            </h3>
            <div
              className="space-y-1.5 mt-2 rounded-xl border border-border/40 bg-card/60 py-3"
              style={{ paddingInline: gutter }}
            >
              {sec.lines.map((line, j) => (
                <SiddurLine key={j} html={line} s={lineSettings} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── FullContinuousPane ─────────────────────────────────── */
// Renders ALL categories in a single infinite scroll, loading one category at a time
const FullContinuousPane = ({ nusach }: { nusach: string }) => {
  const { categories, loading: catsLoading } = useSiddurCategories(nusach);
  const [visibleCount, setVisibleCount] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setVisibleCount(1); }, [nusach]);

  useEffect(() => {
    if (visibleCount >= categories.length) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(v => Math.min(v + 1, categories.length)); },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, categories.length]);

  if (catsLoading)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: GOLD }} />
        <p className="text-sm text-muted-foreground" style={{ fontFamily: SERIF }}>טוען סידור...</p>
      </div>
    );

  return (
    <div className="pb-8" dir="rtl">
      {categories.slice(0, visibleCount).map(cat => (
        <CategorySectionsBlock key={cat.id} nusach={nusach} cat={cat} />
      ))}
      {visibleCount < categories.length && (
        <div ref={sentinelRef} className="flex justify-center items-center py-6 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: GOLD }} />
          <span className="text-sm" style={{ fontFamily: SERIF }}>
            טוען {categories[visibleCount]?.name}...
          </span>
        </div>
      )}
    </div>
  );
};

/* ─── TextFiltersBar (nikud / taamim toggles) ───────────── */
const TextFiltersBar = ({ scope }: { scope: "siddur" | "tehillim" }) => {
  const { settings, updateSettings } = useFontAndColorSettings();
  const { displayStyle, setDisplayStyle } = useSiddurDisplayStyle();
  const showNikud  = settings.showNikud  ?? true;
  const showTaamim = settings.showTaamim ?? true;
  const widthOrder: Array<"narrow" | "normal" | "wide" | "full"> = ["narrow", "normal", "wide", "full"];
  const widthLabels: Record<"narrow" | "normal" | "wide" | "full", string> = {
    narrow: "צר",
    normal: "רגיל",
    wide: "רחב",
    full: "מלא",
  };
  const scopedWidth = scope === "tehillim" ? settings.tehillimContentWidth : settings.siddurContentWidth;
  const scopedNextWidth = widthOrder[(widthOrder.indexOf(scopedWidth) + 1) % widthOrder.length];

  const pill = (active: boolean, onClick: () => void, label: string, example: string) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all select-none"
      style={{
        background: active ? GOLD : "hsl(var(--muted))",
        color:      active ? "hsl(var(--sidebar-background))" : "hsl(var(--muted-foreground))",
        boxShadow:  active ? `0 2px 8px ${GOLD}44` : "none",
        fontFamily: "'Noto Serif Hebrew', serif",
        opacity:    active ? 1 : 0.6,
      }}
    >
      <span style={{ fontSize: "0.85em", opacity: active ? 1 : 0.5 }}>{example}</span>
      {label}
    </button>
  );

  return (
    <div className="flex justify-center gap-2 mb-3">
      {pill(showNikud,  () => updateSettings({ showNikud:  !showNikud  }), "ניקוד",  "בָּ")}
      {pill(showTaamim, () => updateSettings({ showTaamim: !showTaamim }), "טעמים", "֑")}
      {pill(true, () => updateSettings(scope === "tehillim" ? { tehillimContentWidth: scopedNextWidth } : { siddurContentWidth: scopedNextWidth }), `שוליים: ${widthLabels[scopedWidth]}`, "↔")}
      {pill(displayStyle === "ornate", () => setDisplayStyle(displayStyle === "ornate" ? "classic" : "ornate"), "תצוגה מפוארת", "✦")}
    </div>
  );
};

/* ─── TehillimPane ───────────────────────────────────────── */
const TEHILLIM_DAILY: Record<number, number>   = { 0: 24, 1: 48, 2: 82, 3: 94, 4: 81, 5: 93, 6: 92 };
const TEHILLIM_DAY_HEB: Record<number, string> = { 0: "ראשון", 1: "שני", 2: "שלישי", 3: "רביעי", 4: "חמישי", 5: "שישי", 6: "שבת" };

const TehillimPane = () => {
  const { tehillim, loading } = useTehillimData();
  const { displayStyle } = useSiddurDisplayStyle();
  const ornate = displayStyle === "ornate";
  const [chapter, setChapter] = useState(1);
  const [pasuk,   setPasuk]   = useState<number | null>(null);  // 1-based
  const [level,   setLevel]   = useState<"chapter" | "text">("chapter");
  const [mode,    setMode]    = useState<"select" | "daily" | "continuous">(
    () => (localStorage.getItem("tehillim-view-mode") as "select" | "daily" | "continuous") ?? "select"
  );
  const { settings: tehillimSettings } = useFontAndColorSettings();
  const textRef               = useRef<HTMLDivElement>(null);
  const continuousSentinelRef = useRef<HTMLDivElement>(null);
  const verseRefs             = useRef<(HTMLParagraphElement | null)[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);

  const handleChapterSelect = (ch: number) => {
    setChapter(ch);
    setPasuk(null);
    verseRefs.current = [];
    setLevel("text");
    setTimeout(() => textRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handlePasukSelect = (idx: number) => {
    setPasuk(idx + 1);
    setTimeout(() => verseRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  useEffect(() => { setVisibleCount(5); }, [mode]);
  useEffect(() => { setLevel("chapter"); setPasuk(null); }, [mode]);

  useEffect(() => {
    if (mode !== "continuous" || !tehillim) return;
    const entries = Object.keys(tehillim).length;
    if (visibleCount >= entries) return;
    const el = continuousSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(v => Math.min(v + 5, entries)); },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [mode, visibleCount, tehillim]);

  const setModeWithSave = (m: "select" | "daily" | "continuous") => {
    localStorage.setItem("tehillim-view-mode", m);
    setMode(m);
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: GOLD }} />
        <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
          טוען תהילים...
        </p>
      </div>
    );

  if (!tehillim)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground" dir="rtl">
        <BookOpen className="h-10 w-10 opacity-30" />
        <p className="text-sm">תהילים עדיין בהורדה — נסה לרענן</p>
      </div>
    );

  const allChapters  = Array.from({ length: 150 }, (_, i) => tehillim[String(i + 1)]).filter(Boolean);
  const current      = tehillim[String(chapter)];
  const dayOfWeek    = new Date().getDay();
  const todayChapter = TEHILLIM_DAILY[dayOfWeek];
  const todayDayName = TEHILLIM_DAY_HEB[dayOfWeek];
  const dailyCurrent = tehillim[String(todayChapter)];

  const textStyle: React.CSSProperties = {
    fontFamily: tehillimSettings.tehillimFont,
    fontSize:   `${tehillimSettings.tehillimSize}px`,
    fontWeight: tehillimSettings.tehillimBold ? 700 : 400,
    textAlign:  tehillimSettings.tehillimTextAlignment as React.CSSProperties["textAlign"],
    lineHeight: lineHeightCSS(tehillimSettings.tehillimLineHeight, tehillimSettings.tehillimLineHeightCustom),
  };

  const showNikud  = tehillimSettings.showNikud  ?? true;
  const showTaamim = tehillimSettings.showTaamim ?? true;
  const gutter = readingGutter(tehillimSettings.tehillimContentWidth);
  const nikudTextStyle = withNikudTypography(
    tehillimSettings.tehillimFont,
    lineHeightCSS(tehillimSettings.tehillimLineHeight, tehillimSettings.tehillimLineHeightCustom),
    showNikud
  );

  const verseNumStyle: React.CSSProperties = {
    color: GOLD, fontSize: "0.7em", opacity: 0.9,
    fontFamily: "'Noto Serif Hebrew', serif",
    minWidth: "1.4em", verticalAlign: "super", lineHeight: 1,
    display: "inline-block", marginLeft: "0.3em",
  };

  const renderVerseCard = (lines: string[], highlightPasuk: number | null, trackRefs = false) => (
    <div className="rounded-xl border border-border/50 py-5 space-y-3" style={{
      background: ornate ? "linear-gradient(180deg, #fffdfa 0%, #fff8eb 100%)" : "hsl(var(--card))",
      borderColor: ornate ? `${GOLD}44` : undefined,
      boxShadow: ornate ? `0 6px 18px ${GOLD}1f` : undefined,
      paddingInline: gutter,
    }}>
      {lines.map((line, i) => (
        <p
          key={i}
          ref={trackRefs ? (el => { verseRefs.current[i] = el; }) : undefined}
          className="leading-relaxed text-foreground transition-all rounded-lg"
          style={{
            ...textStyle,
            ...nikudTextStyle,
            background:  highlightPasuk === i + 1 ? `${GOLD}18` : "transparent",
            padding:     highlightPasuk === i + 1 ? "2px 6px" : "0",
            borderRight: highlightPasuk === i + 1 ? `3px solid ${GOLD}` : "3px solid transparent",
          }}
        >
          <span style={verseNumStyle}>{heNum(i + 1)}</span>
          {stripText(cleanLine(line), showNikud, showTaamim)}
        </p>
      ))}
    </div>
  );

  return (
    <div className="pb-10 px-1" dir="rtl">
      <OrnamentTitle text="תהילים" fontSize={tehillimSettings.tehillimSize} />
      <Divider />

      {/* ── Mode toggle — 3 pills ── */}
      <div className="flex justify-center mb-4">
        <div
          className="flex gap-1 rounded-full p-1"
          style={{ background: "hsl(var(--muted))", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}
        >
          {([
            { id: "select"     as const, icon: <BookOpen   className="h-3.5 w-3.5" />, label: "בחר פרק"     },
            { id: "daily"      as const, icon: <Star       className="h-3.5 w-3.5" />, label: "מזמור היום"  },
            { id: "continuous" as const, icon: <ScrollText className="h-3.5 w-3.5" />, label: "קריאה רציפה" },
          ]).map(m => (
            <button
              key={m.id}
              onClick={() => setModeWithSave(m.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: mode === m.id ? GOLD : "transparent",
                color:      mode === m.id ? "hsl(var(--sidebar-background))" : "hsl(var(--muted-foreground))",
                boxShadow:  mode === m.id ? `0 2px 8px ${GOLD}55` : "none",
                fontFamily: "'Noto Serif Hebrew', 'David Libre', serif",
              }}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ SELECT mode ═══ */}
      {mode === "select" && (
        <>
          {level === "chapter" && (
            <>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground">מזמור היום:</span>
                <button
                  onClick={() => handleChapterSelect(todayChapter)}
                  className="text-xs font-bold px-2 py-0.5 rounded-full transition-all"
                  style={{ background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}55` }}
                >
                  פרק {heNum(todayChapter)} ({todayChapter})
                </button>
              </div>

              <div className="grid gap-1 mb-4 justify-items-center grid-cols-10 sm:grid-cols-[repeat(15,minmax(0,1fr))]">
                {Array.from({ length: 150 }, (_, i) => i + 1).map(ch => (
                  <button
                    key={ch}
                    onClick={() => handleChapterSelect(ch)}
                    title={`פרק ${ch}`}
                    className="w-full aspect-square flex items-center justify-center rounded text-[10px] sm:text-xs font-medium transition-all leading-none"
                    style={
                      ch === chapter
                        ? { background: GOLD, color: "hsl(var(--sidebar-background))", boxShadow: `0 0 0 2px ${GOLD}` }
                        : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                    }
                  >
                    {heNum(ch)}
                  </button>
                ))}
              </div>
            </>
          )}

          {level === "text" && current && (
            <div key={chapter} className="animate-fade-in">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs mb-3 flex-wrap" dir="ltr">
                <button
                  onClick={() => { setLevel("chapter"); setPasuk(null); }}
                  className="font-medium hover:underline transition-colors"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  תהילים
                </button>
                <span className="opacity-40 text-foreground">›</span>
                <span className="font-semibold" style={{ color: GOLD }}>
                  {`פרק ${heNum(chapter)} (${chapter})`}
                </span>
                {pasuk && (
                  <>
                    <span className="opacity-40 text-foreground">›</span>
                    <span className="font-semibold" style={{ color: GOLD }}>פסוק {heNum(pasuk)}</span>
                  </>
                )}
              </div>

              {/* Verse picker row */}
              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden mb-3" style={{ scrollbarWidth: "none" }}>
                <div className="flex gap-1 min-w-max pb-1">
                  {current.lines.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePasukSelect(i)}
                      className="min-w-[30px] h-7 px-1 rounded-md text-[10px] font-bold transition-all"
                      style={{
                        background: pasuk === i + 1 ? GOLD : "hsl(var(--muted))",
                        color:      pasuk === i + 1 ? "hsl(var(--sidebar-background))" : "hsl(var(--muted-foreground))",
                        boxShadow:  pasuk === i + 1 ? `0 2px 6px ${GOLD}55` : "none",
                        fontFamily: "'Noto Serif Hebrew', serif",
                      }}
                    >
                      {heNum(i + 1)}
                    </button>
                  ))}
                </div>
              </div>

              <OrnamentTitle text={`פרק ${heNum(chapter)} — ${current.title || "תהלים"}`} fontSize={tehillimSettings.tehillimSize} />
              <div ref={textRef}>
                {renderVerseCard(current.lines, pasuk, true)}
              </div>

              <div className="flex justify-between items-center mt-4 gap-2">
                <button
                  onClick={() => chapter > 1 && handleChapterSelect(chapter - 1)}
                  disabled={chapter <= 1}
                  className="text-xs px-3 py-1.5 rounded-full disabled:opacity-30 transition-all"
                  style={{ background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}55` }}
                >
                  פרק קודם «
                </button>
                <button
                  onClick={() => setLevel("chapter")}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
                >
                  כל הפרקים
                </button>
                <button
                  onClick={() => chapter < 150 && handleChapterSelect(chapter + 1)}
                  disabled={chapter >= 150}
                  className="text-xs px-3 py-1.5 rounded-full disabled:opacity-30 transition-all"
                  style={{ background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}55` }}
                >
                  » פרק הבא
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ DAILY mode ═══ */}
      {mode === "daily" && dailyCurrent && (
        <div className="animate-fade-in">
          <div
            className="flex items-center justify-center gap-2 mb-4 py-2.5 rounded-xl"
            style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}30` }}
          >
            <Star className="h-4 w-4 flex-shrink-0" style={{ color: GOLD }} />
            <span
              className="text-sm font-semibold"
              style={{ color: GOLD, fontFamily: "'Noto Serif Hebrew', serif" }}
            >
              {`מזמור של יום ${todayDayName} — פרק ${heNum(todayChapter)}`}
            </span>
          </div>
          <OrnamentTitle text={`פרק ${heNum(todayChapter)} — ${dailyCurrent.title || "תהלים"}`} fontSize={tehillimSettings.tehillimSize} />
          {renderVerseCard(dailyCurrent.lines, null, false)}
        </div>
      )}

      {/* ═══ CONTINUOUS mode ═══ */}
      {mode === "continuous" && (
        <div className="space-y-8">
          {allChapters.slice(0, visibleCount).map(ch => (
            <div key={ch.chapter}>
              <h3
                className="mb-2 flex items-center gap-2"
                style={{
                  color:      GOLD,
                  fontFamily: tehillimSettings.tehillimFont,
                  fontSize:   `${tehillimSettings.tehillimSize}px`,
                  fontWeight: tehillimSettings.tehillimBold ? 700 : 600,
                }}
              >
                <span className="inline-block w-1.5 h-4 rounded-full flex-shrink-0" style={{ background: GOLD, opacity: 0.7 }} />
                {`פרק ${heNum(ch.chapter)}`}
                {ch.title && ch.title !== "תהילים" && (
                  <span style={{ fontSize: "0.7em", fontWeight: 400, opacity: 0.7 }}>— {ch.title}</span>
                )}
              </h3>
              <Divider />
              {renderVerseCard(ch.lines, null, false)}
            </div>
          ))}
          {visibleCount < allChapters.length && (
            <div ref={continuousSentinelRef} className="flex justify-center items-center py-6 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: GOLD }} />
              <span className="text-sm" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
                טוען פרקים נוספים...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── KriaPane ───────────────────────────────────────────── */
const KRIA_BLESSINGS: SiddurSection[] = [
  {
    title: "ברכה לפני הקריאה",
    lines: [
      "בָּרְכוּ אֶת יְיָ הַמְבֹרָךְ׃",
      "בָּרוּךְ יְיָ הַמְבֹרָךְ לְעוֹלָם וָעֶד׃",
      "בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם אֲשֶׁר בָּחַר בָּנוּ מִכָּל הָעַמִּים וְנָתַן לָנוּ אֶת תּוֹרָתוֹ׃ בָּרוּךְ אַתָּה יְיָ נוֹתֵן הַתּוֹרָה׃",
    ],
  },
  {
    title: "ברכה לאחר הקריאה",
    lines: [
      "בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם אֲשֶׁר נָתַן לָנוּ תּוֹרַת אֱמֶת וְחַיֵּי עוֹלָם נָטַע בְּתוֹכֵנוּ׃ בָּרוּךְ אַתָּה יְיָ נוֹתֵן הַתּוֹרָה׃",
    ],
  },
  {
    title: "ברכות ההפטרה (לפני)",
    lines: [
      "בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם אֲשֶׁר בָּחַר בִּנְבִיאִים טוֹבִים וְרָצָה בְדִבְרֵיהֶם הַנֶּאֱמָרִים בֶּאֱמֶת׃ בָּרוּךְ אַתָּה יְיָ הַבּוֹחֵר בַּתּוֹרָה וּבְמֹשֶׁה עַבְדּוֹ וּבְיִשְׂרָאֵל עַמּוֹ וּבִנְבִיאֵי הָאֱמֶת וָצֶדֶק׃",
    ],
  },
  {
    title: "ברכות ההפטרה (לאחר)",
    lines: [
      "בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם צוּר כָּל הָעוֹלָמִים צַדִּיק בְּכָל הַדּוֹרוֹת הָאֵל הַנֶּאֱמָן הָאוֹמֵר וְעוֹשֶׂה הַמְדַבֵּר וּמְקַיֵּם שֶׁכָּל דְּבָרָיו אֱמֶת וָצֶדֶק׃",
      "נֶאֱמָן אַתָּה הוּא יְיָ אֱלֹהֵינוּ וְנֶאֱמָנִים דְּבָרֶיךָ וְדָבָר אֶחָד מִדְּבָרֶיךָ אָחוֹר לֹא יָשׁוּב רֵיקָם כִּי אֵל מֶלֶךְ נֶאֱמָן וְרַחֲמָן אָתָּה׃ בָּרוּךְ אַתָּה יְיָ הָאֵל הַנֶּאֱמָן בְּכָל דְּבָרָיו׃",
    ],
  },
  {
    title: "מי שברך לעולה לתורה",
    lines: [
      "מִי שֶׁבֵּרַךְ אֲבוֹתֵינוּ אַבְרָהָם יִצְחָק וְיַעֲקֹב הוּא יְבָרֵךְ אֶת [שם] בַּעֲבוּר שֶׁעָלָה לִכְבוֹד הַמָּקוֹם וְלִכְבוֹד הַתּוֹרָה׃",
      "בִּשְׂכַר זֶה הַקָּדוֹשׁ בָּרוּךְ הוּא יִשְׁמְרֵהוּ וְיַצִּילֵהוּ מִכָּל צָרָה וְצוּקָה וּמִכָּל נֶגַע וּמַחֲלָה וְיִשְׁלַח בְּרָכָה וְהַצְלָחָה בְּכָל מַעֲשֵׂה יָדָיו וְיִזְכֶּה לַעֲלוֹת לְרֶגֶל עִם כָּל יִשְׂרָאֵל אֶחָיו׃ וְנֹאמַר אָמֵן׃",
    ],
  },
];

const KRIA_SCHEDULE = [
  { days: "שני וחמישי",   aliyot: "ג׳ עולים",            note: "ראשית הפרשה" },
  { days: "שבת שחרית",   aliyot: "ז׳ + מפטיר",          note: "קריאה שלמה" },
  { days: "שבת מנחה",    aliyot: "ג׳ עולים",            note: "פרשה הבאה" },
  { days: "ראש חודש",    aliyot: "ד׳ עולים",            note: "במדבר כח" },
  { days: "שלש רגלים",   aliyot: "ה׳ עולים",            note: "ענין היום" },
  { days: "ראש השנה",    aliyot: "ב׳ ספרי תורה",        note: "עקידה + מוסף" },
  { days: "יום כיפור",   aliyot: "ו׳ שחרית + ג׳ מנחה", note: "" },
];

const KriaPane = ({ onNavigate }: { onNavigate: () => void }) => (
  <div className="pb-8" dir="rtl">
    <OrnamentTitle text="קריאה בתורה" />
    <Divider />

    {/* Quick link to Torah reader */}
    <div
      className="my-4 rounded-xl border flex items-center justify-between gap-3 px-4 py-3"
      style={{ borderColor: `${GOLD}55`, background: `${GOLD}0d` }}
    >
      <div>
        <p
          className="font-semibold text-foreground text-sm"
          style={{ fontFamily: "'Noto Serif Hebrew', serif" }}
        >
          פרשת השבוע
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">קרא ישירות מהאפליקציה</p>
      </div>
      <Button
        size="sm"
        onClick={onNavigate}
        className="flex items-center gap-1.5 text-sm font-medium shrink-0"
        style={{ background: GOLD, color: "#1a1a1a" }}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        פתח
      </Button>
    </div>

    {/* Reading schedule table */}
    <div
      className="mb-4 rounded-xl border border-border/50 overflow-hidden"
      style={{ background: "hsl(var(--card))" }}
    >
      <div className="px-4 py-2 border-b border-border/40">
        <span className="text-xs font-bold text-muted-foreground tracking-wider">לוח קריאות</span>
      </div>
      {KRIA_SCHEDULE.map((row, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between px-4 py-2.5 gap-2",
            i < KRIA_SCHEDULE.length - 1 && "border-b border-border/30"
          )}
          dir="rtl"
        >
          <div>
            <span
              className="font-semibold text-sm text-foreground"
              style={{ fontFamily: "'Noto Serif Hebrew', serif" }}
            >
              {row.days}
            </span>
            {row.note && (
              <span className="text-xs text-muted-foreground mr-1.5">— {row.note}</span>
            )}
          </div>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
            style={{ background: `${GOLD}22`, color: GOLD }}
          >
            {row.aliyot}
          </span>
        </div>
      ))}
    </div>

    {/* Blessings */}
    <div className="mt-2 space-y-1">
      {KRIA_BLESSINGS.map((sec, i) => (
        <SectionCard key={i} section={sec} initialOpen={i < 2} />
      ))}
    </div>
  </div>
);

/* ─── Main Siddur component ──────────────────────────────── */
export const Siddur = () => {
  const navigate                = useNavigate();
  const [nusach, setNusach]    = useState("sefard");
  const [catId, setCatId]      = useState("shacharit");
  const [viewMode, setViewMode] = useState<"accordion" | "continuous" | "scroll">(() =>
    (localStorage.getItem("siddur-view-mode") as "accordion" | "continuous" | "scroll") ?? "accordion"
  );
  const [displayStyle, setDisplayStyleState] = useState<DisplayStyle>(() =>
    (localStorage.getItem("siddur-display-style") as DisplayStyle) ?? "classic"
  );
  const [omerOpen, setOmerOpen] = useState(false);

  const { categories, loading: catsLoading } = useSiddurCategories(nusach);
  const isSpecial = NUSACH_INDEP.has(catId);
  const settingsTab = catId === "tehillim" ? "tehillim" : catId === "kria" ? "pasuk" : "siddur";

  // If active category disappeared in new nusach, fall back to first
  useEffect(() => {
    if (!isSpecial && categories.length > 0 && !categories.find(c => c.id === catId)) {
      setCatId(categories[0].id);
    }
  }, [categories, catId, isSpecial]);

  const setMode = (mode: "accordion" | "continuous" | "scroll") => {
    localStorage.setItem("siddur-view-mode", mode);
    setViewMode(mode);
  };

  const setDisplayStyle = (style: DisplayStyle) => {
    localStorage.setItem("siddur-display-style", style);
    setDisplayStyleState(style);
  };

  const VIEW_MODES: { id: "accordion" | "continuous" | "scroll"; icon: React.ReactNode; title: string }[] = [
    { id: "accordion",  icon: <LayoutList  className="h-4 w-4" />, title: "תצוגת מקטעים" },
    { id: "continuous", icon: <AlignJustify className="h-4 w-4" />, title: "תצוגה רציפה" },
    { id: "scroll",     icon: <ScrollText  className="h-4 w-4" />, title: "גלילה כוללת" },
  ];

  return (
    <SiddurDisplayStyleContext.Provider value={{ displayStyle, setDisplayStyle }}>
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: displayStyle === "ornate"
          ? "linear-gradient(180deg, #fffefb 0%, #fff7e9 52%, #fffdf7 100%)"
          : "hsl(var(--background))",
        direction: "rtl",
      }}
    >
      {/* ── Omer dialog (accessible from header) ── */}
      <OmerBoardDialog open={omerOpen} onOpenChange={setOmerOpen} />

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: displayStyle === "ornate"
            ? "linear-gradient(180deg, hsl(var(--sidebar-background)) 0%, #1a2f63 100%)"
            : "hsl(var(--sidebar-background))",
          paddingTop: "max(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)), 24px)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.18), 0 1px 0 rgba(200,160,77,0.15)",
        }}
      >
        <div className="w-full px-3 sm:px-5 max-w-4xl mx-auto">

          {/* ── Row 1: 3-column grid — [back | title-center | actions] ── */}
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 pt-2.5 pb-2">

            {/* Col 1 (visual right in RTL): Back */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-sm font-medium flex-shrink-0 whitespace-nowrap"
              style={{ color: "hsl(var(--sidebar-foreground)/0.75)", background: "rgba(255,255,255,0.07)" }}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>חזרה</span>
            </Button>

            {/* Col 2 (center): Title */}
            <div className="flex items-center justify-center gap-2 min-w-0">
              <div className="w-4 h-px opacity-35 flex-shrink-0" style={{ background: `linear-gradient(to left, ${GOLD}, transparent)` }} />
              <h1
                className="text-base sm:text-lg font-bold tracking-wide truncate"
                style={{
                  color: "hsl(var(--sidebar-foreground))",
                  fontFamily: "'Noto Serif Hebrew', 'David Libre', serif",
                  textShadow: `0 0 20px ${GOLD}33`,
                }}
              >
                סידור תפילה
              </h1>
              <div className="w-4 h-px opacity-35 flex-shrink-0" style={{ background: `linear-gradient(to right, ${GOLD}, transparent)` }} />
            </div>

            {/* Col 3 (visual left in RTL): actions — ltr so order is predictable */}
            <div className="flex items-center gap-1.5 flex-shrink-0" dir="ltr">
              {/* T — text settings */}
              <TextDisplaySettings initialTab={settingsTab} />

              {/* View mode dropdown (siddur only) */}
              {!isSpecial && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-2 text-xs font-medium rounded-lg"
                      style={{ color: GOLD, background: `${GOLD}18`, border: `1px solid ${GOLD}44` }}
                    >
                      <Layers className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="hidden md:inline max-w-[80px] truncate">{VIEW_MODES.find(m => m.id === viewMode)?.title ?? "תצוגה"}</span>
                      <ChevronDown className="h-3 w-3 opacity-60 flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48" style={{ direction: "rtl" }}>
                    <DropdownMenuLabel className="text-right text-xs text-muted-foreground">מצב תצוגה</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {VIEW_MODES.map(m => (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span style={{ color: viewMode === m.id ? GOLD : "hsl(var(--muted-foreground))" }}>{m.icon}</span>
                        <span className={cn("flex-1 text-sm", viewMode === m.id && "font-semibold text-foreground")}>{m.title}</span>
                        {viewMode === m.id && <span className="text-xs" style={{ color: GOLD }}>✓</span>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Mode switcher: חומש | סידור | עומר */}
              <div
                className="flex items-center rounded-full overflow-hidden flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.10)", border: `1px solid rgba(200,160,77,0.25)` }}
              >
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                  style={{ color: "hsl(var(--sidebar-foreground)/0.55)" }}
                  title="חומש"
                >
                  <Book className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">חומש</span>
                </button>
                <span className="w-px h-3.5 opacity-25" style={{ background: GOLD }} />
                <div
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold"
                  style={{ color: GOLD }}
                >
                  <BookMarked className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">סידור</span>
                </div>
                <span className="w-px h-3.5 opacity-25" style={{ background: GOLD }} />
                <button
                  onClick={() => setOmerOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                  style={{ color: "hsl(var(--sidebar-foreground)/0.55)" }}
                  title="ספירת העומר"
                >
                  <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">עומר</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Row 2: Nusach pills ── */}
          <div
            className="flex gap-1.5 pb-2.5 justify-center overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", opacity: isSpecial ? 0.45 : 1, transition: "opacity 0.2s" }}
          >
            {NUSACHOT.map(n => (
              <button
                key={n.id}
                onClick={() => { setNusach(n.id); if (isSpecial) setCatId("shacharit"); }}
                className="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all"
                style={
                  nusach === n.id
                    ? { background: GOLD, color: "hsl(var(--sidebar-background))", boxShadow: `0 2px 8px ${GOLD}55`, fontWeight: 700 }
                    : { background: "rgba(255,255,255,0.09)", color: "hsl(var(--sidebar-foreground)/0.65)", border: "1px solid rgba(255,255,255,0.12)" }
                }
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Category tabs ── */}
      <div
        className="border-b border-border/40 flex items-stretch"
        style={{ background: "hsl(var(--card))" }}
      >
        {/* Scrollable tabs */}
        <div
          className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
        <div className="flex gap-0 min-w-max px-2 py-1 items-center">
          {/* Loading spinner placeholder */}
          {catsLoading && (
            <div className="px-4 py-2 flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>טוען...</span>
            </div>
          )}

          {/* Siddur prayer categories (from loaded nusach data) */}
          {!catsLoading && categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCatId(cat.id)}
              className={cn(
                "flex items-center gap-1 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                catId === cat.id
                  ? "border-[#c8a04d] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
              style={{ fontFamily: "'Noto Serif Hebrew', 'David Libre', serif" }}
            >
              <CatIcon id={cat.id} />
              {cat.name}
            </button>
          ))}

          {/* Separator before special tabs */}
          {!catsLoading && categories.length > 0 && (
            <div className="self-stretch w-px bg-border/40 mx-1 my-2" />
          )}

          {/* Static tabs — always shown */}
          {STATIC_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCatId(tab.id)}
              className={cn(
                "flex items-center gap-1 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                catId === tab.id
                  ? "border-[#c8a04d] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
              style={{ fontFamily: "'Noto Serif Hebrew', 'David Libre', serif" }}
            >
              <CatIcon id={tab.id} />
              {tab.name}
            </button>
          ))}

          {/* View mode segmented control (only for siddur panes, not tehillim/kria) */}
          {/* (moved outside the scrollable area — see below) */}
        </div>
        </div>

        {/* View mode picker — clickable dropdown in tab bar */}
        {!isSpecial && (
          <div className="flex-shrink-0 flex items-center px-2 border-l border-border/40" dir="ltr">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ background: `${GOLD}18`, color: GOLD }}
                  title={VIEW_MODES.find(m => m.id === viewMode)?.title}
                >
                  {VIEW_MODES.find(m => m.id === viewMode)?.icon}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" className="w-44 z-[9999]" style={{ direction: "rtl" }}>
                <DropdownMenuLabel className="text-right text-xs text-muted-foreground">מצב תצוגה</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {VIEW_MODES.map(m => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span style={{ color: viewMode === m.id ? GOLD : "hsl(var(--muted-foreground))" }}>{m.icon}</span>
                    <span className={cn("flex-1 text-sm", viewMode === m.id && "font-semibold text-foreground")}>{m.title}</span>
                    {viewMode === m.id && <span className="text-xs" style={{ color: GOLD }}>✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      <main className="flex-1 flex flex-col px-5 sm:px-7 pt-4 sm:pt-6 max-w-2xl mx-auto w-full">
        {/* ── Text filter toggles (nikud / taamim) ── */}
        <TextFiltersBar scope={catId === "tehillim" ? "tehillim" : "siddur"} />

        {/* Special — nusach-independent panes */}
        {catId === "tehillim" && <TehillimPane />}
        {catId === "kria"     && <KriaPane onNavigate={() => navigate("/")} />}

        {/* Regular siddur prayer content */}
        {!isSpecial && viewMode !== "scroll" && (
          <CategoryPane nusach={nusach} catId={catId} viewMode={viewMode} />
        )}
        {!isSpecial && viewMode === "scroll" && (
          <FullContinuousPane nusach={nusach} />
        )}
      </main>
    </div>
    </SiddurDisplayStyleContext.Provider>
  );
};

export default Siddur;
