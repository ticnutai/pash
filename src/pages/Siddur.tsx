import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TextDisplaySettings } from "@/components/TextDisplaySettings";
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
function cleanLine(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&thinsp;/g, "\u2009")
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\{[פסנ]\}/g, "")
    .trim();
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
const OrnamentTitle = ({ text }: { text: string }) => (
  <div className="flex items-center justify-center gap-2 my-2">
    <span style={{ color: GOLD, fontSize: "0.9em" }}>❧</span>
    <span className="font-bold tracking-wide text-sm" style={{ color: GOLD, fontFamily: "'Noto Serif Hebrew', 'David Libre', serif" }}>
      {text}
    </span>
    <span style={{ color: GOLD, fontSize: "0.9em", transform: "scaleX(-1)", display: "inline-block" }}>❧</span>
  </div>
);

/* ─── SectionCard ────────────────────────────────────────── */
const SectionCard = ({ section, initialOpen = false }: { section: SiddurSection; initialOpen?: boolean }) => {
  const [open, setOpen] = useState(initialOpen);
  const { settings: siddurSettings } = useFontAndColorSettings();

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden mb-2" style={{
      background: "hsl(var(--card))",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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
            className="font-semibold text-foreground"
            style={{
              fontFamily: siddurSettings.siddurFont,
              fontSize: `${siddurSettings.siddurSize}px`,
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
          className="px-4 sm:px-6 pb-4 pt-1 space-y-1.5 animate-fade-in border-t border-border/40"
          style={{ direction: "rtl" }}
        >
          {section.lines.map((line, i) => (
            <p
              key={i}
              className="text-foreground"
              style={{
                fontFamily: siddurSettings.siddurFont,
                fontSize: `${siddurSettings.siddurSize}px`,
                fontWeight: siddurSettings.siddurBold ? 700 : 400,
                textAlign: siddurSettings.textAlignment as React.CSSProperties["textAlign"],
                lineHeight: lineHeightCSS(siddurSettings.lineHeight, siddurSettings.lineHeightCustom),
              }}
            >
              {cleanLine(line)}
            </p>
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
            className="font-semibold mb-1 flex items-center gap-2"
            style={{
              color: GOLD,
              fontFamily: siddurSettings.siddurFont,
              fontSize: `${siddurSettings.siddurSize}px`,
            }}
          >
            <span className="inline-block w-1.5 h-4 rounded-full flex-shrink-0" style={{ background: GOLD, opacity: 0.7 }} />
            {sec.title}
          </h3>
          <Divider />
          <div className="space-y-1.5 mt-2">
            {sec.lines.map((line, j) => (
              <p
                key={j}
                className="text-foreground"
                style={{
                  fontFamily: siddurSettings.siddurFont,
                  fontSize: `${siddurSettings.siddurSize}px`,
                  fontWeight: siddurSettings.siddurBold ? 700 : 400,
                  textAlign: siddurSettings.textAlignment as React.CSSProperties["textAlign"],
                  lineHeight: lineHeightCSS(siddurSettings.lineHeight, siddurSettings.lineHeightCustom),
                }}
              >
                {cleanLine(line)}
              </p>
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
      <OrnamentTitle text={catName} />
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
  if (loading)
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  if (!sections?.length) return null;
  return (
    <div className="mb-10">
      <OrnamentTitle text={cat.name} />
      <Divider />
      <div className="mt-4 space-y-6">
        {sections.map((sec, i) => (
          <div key={i}>
            <h3
              className="font-bold mb-1 flex items-center gap-2"
              style={{
                color: GOLD,
                fontFamily: siddurSettings.siddurFont,
                fontSize: `${siddurSettings.siddurSize}px`,
              }}
            >
              <span className="inline-block w-1.5 h-4 rounded-full flex-shrink-0" style={{ background: GOLD, opacity: 0.7 }} />
              {sec.title}
            </h3>
            <div className="space-y-1.5 mt-2">
              {sec.lines.map((line, j) => (
                <p
                  key={j}
                  className="text-foreground"
                  style={{
                    fontFamily: siddurSettings.siddurFont,
                    fontSize: `${siddurSettings.siddurSize}px`,
                    fontWeight: siddurSettings.siddurBold ? 700 : 400,
                    textAlign: siddurSettings.textAlignment as React.CSSProperties["textAlign"],
                    lineHeight: lineHeightCSS(siddurSettings.lineHeight, siddurSettings.lineHeightCustom),
                  }}
                >
                  {cleanLine(line)}
                </p>
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

/* ─── TehillimPane ───────────────────────────────────────── */
const TEHILLIM_DAILY: Record<number, number>   = { 0: 24, 1: 48, 2: 82, 3: 94, 4: 81, 5: 93, 6: 92 };
const TEHILLIM_DAY_HEB: Record<number, string> = { 0: "ראשון", 1: "שני", 2: "שלישי", 3: "רביעי", 4: "חמישי", 5: "שישי", 6: "שבת" };

const TehillimPane = () => {
  const { tehillim, loading } = useTehillimData();
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
    textAlign:  tehillimSettings.textAlignment as React.CSSProperties["textAlign"],
    lineHeight: lineHeightCSS(tehillimSettings.lineHeight, tehillimSettings.lineHeightCustom),
  };

  const verseNumStyle: React.CSSProperties = {
    color: GOLD, fontSize: "0.7em", opacity: 0.9,
    fontFamily: "'Noto Serif Hebrew', serif",
    minWidth: "1.4em", verticalAlign: "super", lineHeight: 1,
    display: "inline-block", marginLeft: "0.3em",
  };

  const renderVerseCard = (lines: string[], highlightPasuk: number | null, trackRefs = false) => (
    <div className="rounded-xl border border-border/50 px-5 py-5 space-y-3" style={{ background: "hsl(var(--card))" }}>
      {lines.map((line, i) => (
        <p
          key={i}
          ref={trackRefs ? (el => { verseRefs.current[i] = el; }) : undefined}
          className="leading-relaxed text-foreground transition-all rounded-lg"
          style={{
            ...textStyle,
            background:  highlightPasuk === i + 1 ? `${GOLD}18` : "transparent",
            padding:     highlightPasuk === i + 1 ? "2px 6px" : "0",
            borderRight: highlightPasuk === i + 1 ? `3px solid ${GOLD}` : "3px solid transparent",
          }}
        >
          <span style={verseNumStyle}>{heNum(i + 1)}</span>
          {cleanLine(line)}
        </p>
      ))}
    </div>
  );

  return (
    <div className="pb-10 px-1" dir="rtl">
      <OrnamentTitle text="תהילים" />
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

              <OrnamentTitle text={`פרק ${heNum(chapter)} — ${current.title || "תהלים"}`} />
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
          <OrnamentTitle text={`פרק ${heNum(todayChapter)} — ${dailyCurrent.title || "תהלים"}`} />
          {renderVerseCard(dailyCurrent.lines, null, false)}
        </div>
      )}

      {/* ═══ CONTINUOUS mode ═══ */}
      {mode === "continuous" && (
        <div className="space-y-8">
          {allChapters.slice(0, visibleCount).map(ch => (
            <div key={ch.chapter}>
              <h3
                className="font-bold mb-2 flex items-center gap-2"
                style={{
                  color:      GOLD,
                  fontFamily: "'Noto Serif Hebrew', 'David Libre', serif",
                  fontSize:   `${tehillimSettings.tehillimSize}px`,
                }}
              >
                <span className="inline-block w-1.5 h-4 rounded-full flex-shrink-0" style={{ background: GOLD, opacity: 0.7 }} />
                {`פרק ${heNum(ch.chapter)}`}
                {ch.title && ch.title !== "תהילים" && (
                  <span className="text-xs font-normal opacity-70">— {ch.title}</span>
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

  const { categories, loading: catsLoading } = useSiddurCategories(nusach);
  const isSpecial = NUSACH_INDEP.has(catId);

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

  const VIEW_MODES: { id: "accordion" | "continuous" | "scroll"; icon: React.ReactNode; title: string }[] = [
    { id: "accordion",  icon: <LayoutList  className="h-4 w-4" />, title: "תצוגת מקטעים" },
    { id: "continuous", icon: <AlignJustify className="h-4 w-4" />, title: "תצוגה רציפה" },
    { id: "scroll",     icon: <ScrollText  className="h-4 w-4" />, title: "גלילה כוללת" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "hsl(var(--background))", direction: "rtl" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 shadow-lg"
        style={{
          background: "hsl(var(--sidebar-background))",
          paddingTop: "max(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)), 28px)",
        }}
      >
        <div className="w-full px-3 sm:px-6 py-2 max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-2">
            {/* Back button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9 flex-shrink-0"
              style={{ color: "hsl(var(--sidebar-foreground))" }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Title */}
            <div className="flex-1 flex items-center justify-center gap-2">
              <BookMarked className="h-6 w-6 flex-shrink-0" style={{ color: GOLD }} />
              <h1
                className="text-xl font-bold text-center"
                style={{
                  color:      "hsl(var(--sidebar-foreground))",
                  fontFamily: "'Noto Serif Hebrew', 'David Libre', serif",
                }}
              >
                סידור תפילה
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {!isSpecial && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 text-xs font-medium"
                      style={{
                        borderColor: `${GOLD}66`,
                        color: GOLD,
                        background: `${GOLD}15`,
                      }}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{VIEW_MODES.find(m => m.id === viewMode)?.title ?? "תצוגה"}</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48" style={{ direction: "rtl" }}>
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
              <TextDisplaySettings />
            </div>
          </div>

          {/* ── Nusach tabs ── */}
          <div
            className="flex gap-1 mt-2 overflow-x-auto pb-1 justify-center flex-wrap [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", opacity: isSpecial ? 0.45 : 1, transition: "opacity 0.2s" }}
          >
            {NUSACHOT.map(n => (
              <button
                key={n.id}
                onClick={() => { setNusach(n.id); if (isSpecial) setCatId("shacharit"); }}
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  nusach === n.id
                    ? "text-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={
                  nusach === n.id
                    ? { background: GOLD, color: "hsl(var(--sidebar-background))" }
                    : { background: "hsl(var(--sidebar-accent))", color: "hsl(var(--sidebar-foreground)/0.7)" }
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

        {/* View mode indicator — subtle current-mode badge in tab bar */}
        {!isSpecial && (
          <div className="flex-shrink-0 flex items-center px-2 border-l border-border/40" dir="ltr">
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
              style={{ background: `${GOLD}18`, color: GOLD }}
            >
              {VIEW_MODES.find(m => m.id === viewMode)?.icon}
            </div>
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      <main className="flex-1 flex flex-col px-4 sm:px-6 pt-4 sm:pt-6 max-w-2xl mx-auto w-full">
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
  );
};

export default Siddur;
