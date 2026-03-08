import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, BookMarked, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* Pre-register all siddur JSON paths so Vite bundles them */
const SIDDUR_FILES = import.meta.glob<{ default: SiddurData }>(
  "../data/siddur/siddur_*.json"
);

/* ─── Types ─────────────────────────────────────────────── */
type SiddurSection  = { title: string; lines: string[] };
type SiddurCategory = { name: string; sections: SiddurSection[]; total_lines: number };
type SiddurData     = Record<string, SiddurCategory>;

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
const CAT_EMOJI: Record<string, string> = {
  shacharit:          "🌅",
  mincha:             "☀️",
  arvit:              "🌙",
  shabbat_kabbalat:   "✨",
  shabbat_arvit:      "🕯️",
  shabbat_shacharit:  "🌸",
  shabbat_musaf:      "📖",
  shabbat_mincha:     "🍃",
  brachot:            "🍊",
  other:              "📜",
};

/* ─── Gold decoration helpers ───────────────────────────── */
const GOLD = "#c8a04d";
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
          <span className="font-semibold text-base text-foreground" style={{ fontFamily: "'Noto Serif Hebrew', 'David Libre', serif" }}>
            {section.title}
          </span>
          <span className="text-xs text-muted-foreground mr-1">
            ({section.lines.length} שורות)
          </span>
        </div>
        <span className="text-muted-foreground ml-2">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Prayer lines */}
      {open && (
        <div
          className="px-5 pb-4 pt-1 space-y-1.5 animate-fade-in border-t border-border/40"
          style={{ direction: "rtl" }}
        >
          {section.lines.map((line, i) => (
            <p
              key={i}
              className="text-base leading-relaxed text-foreground text-justify"
              style={{
                fontFamily: "'Noto Serif Hebrew', 'David Libre', serif",
                fontWeight: i === 0 ? 600 : 400,
              }}
            >
              {line.replace(/<[^>]*>/g, "")}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── CategoryPane ───────────────────────────────────────── */
const CategoryPane = ({ cat }: { cat: SiddurCategory }) => {
  const sections = cat.sections ?? [];
  if (!sections.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground" dir="rtl">
        <BookMarked className="h-10 w-10 opacity-30" />
        <p className="text-sm">אין תוכן זמין כרגע</p>
      </div>
    );
  }
  return (
    <div className="pb-8">
      <OrnamentTitle text={cat.name} />
      <Divider />
      <div className="mt-4 space-y-1">
        {sections.map((sec, i) => (
          <SectionCard key={`${sec.title}-${i}`} section={sec} initialOpen={i === 0} />
        ))}
      </div>
    </div>
  );
};

/* ─── Main Siddur component ──────────────────────────────── */
export const Siddur = () => {
  const navigate               = useNavigate();
  const [nusach, setNusach]   = useState("sefard");
  const [catId, setCatId]     = useState("shacharit");
  const [data, setData]       = useState<SiddurData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const loadedRef             = useRef<Record<string, SiddurData>>({});

  const loadNusach = useCallback(async (id: string) => {
    if (loadedRef.current[id]) {
      setData(loadedRef.current[id]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const key = `../data/siddur/siddur_${id}.json`;
      const importer = SIDDUR_FILES[key];
      if (!importer) throw new Error("not found");
      const mod = await importer();
      loadedRef.current[id] = mod.default;
      setData(mod.default);
    } catch {
      setError("הנתונים עדיין בהורדה — אנא המתן רגע ורענן");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNusach(nusach); }, [nusach, loadNusach]);

  /* Build ordered category list from loaded data */
  const categories = useMemo(() =>
    data
      ? CATEGORIES_ORDER
          .filter(k => data[k] && Array.isArray(data[k].sections) && data[k].sections.length > 0)
          .map(k => ({ id: k, ...data[k] }))
      : [],
  [data]);

  const currentCat = data?.[catId];

  /* If active category disappeared in new nusach, fall back */
  useEffect(() => {
    if (categories.length > 0 && !categories.find(c => c.id === catId)) {
      setCatId(categories[0].id);
    }
  }, [categories, catId]);

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
        <div className="w-full px-3 py-2">
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
            <div className="w-9" /> {/* Spacer to balance back button */}
          </div>

          {/* ── Nusach tabs ── */}
          <div
            className="flex gap-1 mt-2 overflow-x-auto pb-1 justify-center flex-wrap"
            style={{ scrollbarWidth: "none" }}
          >
            {NUSACHOT.map(n => (
              <button
                key={n.id}
                onClick={() => setNusach(n.id)}
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
      {!loading && !error && categories.length > 0 && (
        <div
          className="border-b border-border/40 overflow-x-auto"
          style={{ background: "hsl(var(--card))", scrollbarWidth: "none" }}
        >
          <div className="flex gap-0 min-w-max px-2 py-1">
            {categories.map(cat => (
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
                <span className="text-base leading-none">{CAT_EMOJI[cat.id]}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content area ── */}
      <main className="flex-1 flex flex-col px-3 pt-4 max-w-2xl mx-auto w-full">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: GOLD }} />
            <p className="text-muted-foreground text-sm" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
              טוען סידור...
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4" dir="rtl">
            <div
              className="rounded-xl p-6 text-center max-w-sm border border-border"
              style={{ background: "hsl(var(--card))" }}
            >
              <span className="text-3xl mb-3 block">📖</span>
              <p className="font-semibold text-foreground mb-2" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
                הסידור עדיין בהורדה
              </p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button size="sm" onClick={() => loadNusach(nusach)} style={{ background: GOLD, color: "#1a1a1a" }}>
                נסה שוב
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && currentCat && <CategoryPane cat={currentCat} />}
      </main>
    </div>
  );
};

export default Siddur;
