import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TextDisplaySettings } from "@/components/TextDisplaySettings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";
import { ArrowLeft, ChevronDown, ChevronUp, BookMarked, Loader2, BookOpen, ExternalLink, LayoutList, AlignJustify, ScrollText, Layers, Sunrise, Sun, Moon, Sparkles, Flame, Star, Leaf, Heart, Book, Columns2, PanelRightOpen, type LucideProps } from "lucide-react";
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
import { getWeekdayLeyning, getCalendarPreference, type WeekdayLeyning } from "@/utils/parshaUtils";

/* ─── Types ─────────────────────────────────────────────── */
type SiddurSection   = { title: string; lines: string[] };
type SiddurCategory  = { name: string; sections: SiddurSection[]; total_lines: number };
type SiddurData      = Record<string, SiddurCategory>;
type TehillimChapter = { chapter: number; title: string; lines: string[] };
type TehillimMap     = Record<string, TehillimChapter>;
type DisplayStyle    = "classic" | "ornate";
type ViewMode        = "accordion" | "continuous" | "scroll" | "split" | "book";

/* ─── Theme system ───────────────────────────────────────── */
export interface SiddurTheme {
  id: string;
  name: string;
  emoji: string;
  bg: string;                   // page background
  headerBg: string;             // header/tabs background
  textColor: string;            // prayer text color
  headingColor?: string;        // section headings (defaults to accentColor)
  instructionColor?: string;    // rubric / instruction lines (defaults to textColor)
  accentColor: string;          // accent / gold
  cardBg: string;               // section card bg
  cardBorder: string;           // section card border
  bgImage?: string;             // optional CSS background-image
  isCustom?: boolean;
}

const DEFAULT_ACCENT = "#c8a04d";

export const SIDDUR_PRESET_THEMES: SiddurTheme[] = [
  {
    id: "dark_navy",
    name: "כחול לילה",
    emoji: "🌙",
    bg: "#15254a",
    headerBg: "#0f1b38",
    textColor: "#e8dfc8",
    accentColor: DEFAULT_ACCENT,
    cardBg: "rgba(255,255,255,0.04)",
    cardBorder: `${DEFAULT_ACCENT}33`,
  },
  {
    id: "parchment",
    name: "קלף עתיק",
    emoji: "📜",
    bg: "linear-gradient(180deg, #fffefb 0%, #fff7e9 52%, #fffdf7 100%)",
    headerBg: "linear-gradient(180deg, hsl(var(--sidebar-background)) 0%, #1a2f63 100%)",
    textColor: "#2d1e0e",
    accentColor: "#9a6b1a",
    cardBg: "linear-gradient(180deg, #fffdfa 0%, #fffaf0 100%)",
    cardBorder: "#c8a04d44",
  },
  {
    id: "midnight",
    name: "שחור לילה",
    emoji: "⬛",
    bg: "#0a0a0f",
    headerBg: "#111118",
    textColor: "#e8e6e0",
    accentColor: "#c8a04d",
    cardBg: "rgba(255,255,255,0.04)",
    cardBorder: "rgba(200,160,77,0.22)",
  },
  {
    id: "deep_blue",
    name: "כחול עמוק",
    emoji: "🔷",
    bg: "#0d1b2e",
    headerBg: "#0a1520",
    textColor: "#cfe2f5",
    accentColor: "#7ab8e8",
    cardBg: "rgba(100,160,220,0.07)",
    cardBorder: "rgba(122,184,232,0.22)",
  },
  {
    id: "forest",
    name: "יער ירוק",
    emoji: "🌿",
    bg: "#0d1f0f",
    headerBg: "#091508",
    textColor: "#d4edda",
    accentColor: "#66bb6a",
    cardBg: "rgba(102,187,106,0.07)",
    cardBorder: "rgba(102,187,106,0.22)",
  },
  {
    id: "burgundy",
    name: "בורדו",
    emoji: "🍷",
    bg: "#1a0a0e",
    headerBg: "#120609",
    textColor: "#f5d5db",
    accentColor: "#d4728a",
    cardBg: "rgba(212,114,138,0.07)",
    cardBorder: "rgba(212,114,138,0.22)",
  },
  {
    id: "sepia",
    name: "ספיה",
    emoji: "🟤",
    bg: "#1c130b",
    headerBg: "#130d06",
    textColor: "#e8d5b0",
    accentColor: "#c49a47",
    cardBg: "rgba(196,154,71,0.07)",
    cardBorder: "rgba(196,154,71,0.22)",
  },
];

const CUSTOM_THEME_KEY = "siddur-custom-theme";
const ACTIVE_THEME_KEY = "siddur-active-theme";

function loadCustomTheme(): SiddurTheme {
  try {
    const raw = localStorage.getItem(CUSTOM_THEME_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    id: "custom",
    name: "מותאם אישית",
    emoji: "🎨",
    bg: "#0d1b2e",
    headerBg: "#0a1520",
    textColor: "#e8dfc8",
    headingColor: "#c8a04d",
    instructionColor: "#b8cce8",
    accentColor: "#c8a04d",
    cardBg: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(200,160,77,0.28)",
    isCustom: true,
  };
}

function saveCustomTheme(t: SiddurTheme) {
  localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(t));
}

/* ─── Theme context ──────────────────────────────────────── */
interface SiddurThemeCtx {
  theme: SiddurTheme;
  setTheme: (t: SiddurTheme) => void;
  customTheme: SiddurTheme;
  setCustomTheme: (t: SiddurTheme) => void;
}
const SiddurThemeContext = createContext<SiddurThemeCtx | null>(null);
const useSiddurTheme = (): SiddurThemeCtx => {
  const ctx = useContext(SiddurThemeContext);
  if (!ctx) return {
    theme: SIDDUR_PRESET_THEMES[0],
    setTheme: () => {},
    customTheme: loadCustomTheme(),
    setCustomTheme: () => {},
  };
  return ctx;
};

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
  const parsed = Number(lineHeight);
  const stableLineHeight = showNikud && Number.isFinite(parsed)
    ? String(Math.max(parsed, 1.8))
    : lineHeight;
  // User-selected font is always first; Hebrew nikud-optimised fonts serve as fallbacks.
  const fullFamily = `${fontFamily}, 'Noto Serif Hebrew', 'Noto Sans Hebrew', 'David Libre', serif`;
  if (!showNikud) return { fontFamily: fullFamily, lineHeight: stableLineHeight };
  return {
    fontFamily: fullFamily,
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
  const { theme } = useSiddurTheme();
  const Icon = CAT_ICON[id];
  return Icon ? <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: theme.accentColor }} /> : null;
};
const Divider = () => {
  const { theme } = useSiddurTheme();
  return (
    <div className="my-1 mx-auto" style={{
      width: "60%", height: "1px",
      background: `linear-gradient(90deg, transparent, ${theme.accentColor}, transparent)`
    }} />
  );
};
const OrnamentTitle = ({ text, fontSize }: { text: string; fontSize?: number }) => {
  const { theme } = useSiddurTheme();
  return (
    <div className="flex items-center justify-center gap-2 my-2">
      <span style={{ color: theme.accentColor, fontSize: "0.9em" }}>❧</span>
      <span className="font-bold tracking-wide" style={{ color: theme.accentColor, fontFamily: "'Noto Serif Hebrew', 'David Libre', serif", fontSize: fontSize ? `${fontSize}px` : "0.9em" }}>
        {text}
      </span>
    <span style={{ color: theme.accentColor, fontSize: "0.9em", transform: "scaleX(-1)", display: "inline-block" }}>❧</span>
  </div>
  );
};

/* ─── ThemePicker ────────────────────────────────────────── */
const COLOR_FIELDS: { key: keyof SiddurTheme; label: string; group: string; colorOnly?: boolean }[] = [
  { key: "bg",               label: "רקע דף",           group: "רקע" },
  { key: "headerBg",         label: "רקע כותרת/טאבים",  group: "רקע" },
  { key: "cardBg",           label: "רקע כרטיס",        group: "רקע" },
  { key: "cardBorder",       label: "מסגרת כרטיס",      group: "מסגרות" },
  { key: "textColor",        label: "טקסט תפילה",       group: "טקסט" },
  { key: "headingColor",     label: "כותרת מקטע",       group: "טקסט" },
  { key: "instructionColor", label: "הוראות / רוביקה",  group: "טקסט" },
  { key: "accentColor",      label: "צבע הדגשה (זהב)",  group: "הדגשה", colorOnly: true },
];

const ThemePicker = () => {
  const { theme, setTheme, customTheme, setCustomTheme } = useSiddurTheme();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"presets" | "custom">("presets");
  const [draft, setDraft] = useState<SiddurTheme>({ ...customTheme });

  // Keep draft in sync when customTheme changes externally
  useEffect(() => { setDraft(prev => ({ ...prev, ...customTheme })); }, [customTheme]);

  const allThemes = [...SIDDUR_PRESET_THEMES, { ...customTheme }];

  const applyCustom = () => {
    const t: SiddurTheme = { ...draft, id: "custom", emoji: "🎨", isCustom: true };
    if (!t.name?.trim()) t.name = "מותאם אישית";
    saveCustomTheme(t);
    setCustomTheme(t);
    setTheme(t);
    setOpen(false);
  };

  const fieldVal = (key: keyof SiddurTheme): string =>
    (draft[key] as string | undefined) ?? "";

  // Group fields
  const groups = Array.from(new Set(COLOR_FIELDS.map(f => f.group)));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="ערכת נושא"
        className="flex items-center justify-center h-8 w-8 rounded-lg transition-all hover:opacity-80"
        style={{ background: open ? "#c8a04d22" : "transparent", border: "1px solid #c8a04d66" }}
      >
        <span style={{ fontSize: "1rem", filter: "sepia(1) saturate(3) hue-rotate(5deg)" }}>🎨</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />
          <div
            className="fixed left-2 right-2 sm:absolute sm:left-0 sm:right-auto top-12 sm:top-10 z-[999] w-auto sm:w-[360px] max-h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
            style={{ background: theme.headerBg, border: `1px solid ${theme.accentColor}44`, direction: "rtl" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0" style={{ borderColor: `${theme.accentColor}22` }}>
              <span className="text-sm font-bold" style={{ color: theme.accentColor, fontFamily: "'Noto Serif Hebrew', serif" }}>ערכת נושא</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setTab("presets")}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{ background: tab === "presets" ? theme.accentColor : `rgba(255,255,255,0.08)`, color: tab === "presets" ? "#1a1a1a" : theme.textColor }}
                >
                  ערכות מובנות
                </button>
                <button
                  onClick={() => setTab("custom")}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{ background: tab === "custom" ? theme.accentColor : `rgba(255,255,255,0.08)`, color: tab === "custom" ? "#1a1a1a" : theme.textColor }}
                >
                  עריכה מותאמת
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1">
              {tab === "presets" && (
                <div className="p-3 grid grid-cols-4 gap-2">
                  {allThemes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t); setOpen(false); }}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: theme.id === t.id ? `${theme.accentColor}22` : "rgba(255,255,255,0.05)",
                        border: `1.5px solid ${theme.id === t.id ? theme.accentColor : "transparent"}`,
                      }}
                    >
                      {/* Mini preview swatch showing all key colors */}
                      <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 border" style={{ border: `1px solid ${t.accentColor}55` }}>
                        <div className="h-4 w-full" style={{ background: t.bg.includes("gradient") ? t.accentColor : t.bg }} />
                        <div className="h-3 w-full flex items-center justify-center" style={{ background: t.cardBg === "transparent" ? t.bg : (t.cardBg.includes("rgba") ? t.bg : t.cardBg) }}>
                          <span style={{ fontSize: "7px", color: t.textColor, fontFamily: "serif" }}>אבג</span>
                        </div>
                        <div className="h-3 w-full flex items-center justify-center" style={{ background: t.headerBg.includes("gradient") ? t.accentColor : t.headerBg }}>
                          <span style={{ fontSize: "6px", color: t.accentColor }}>❧</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-center leading-tight font-medium" style={{ color: theme.textColor }}>{t.emoji} {t.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {tab === "custom" && (
                <div className="p-3 space-y-4" dir="rtl">
                  {/* Theme name */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold w-24 flex-shrink-0" style={{ color: theme.accentColor }}>שם ערכה</span>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1 rounded px-2 py-1 text-xs"
                      style={{ background: "rgba(255,255,255,0.1)", border: `1px solid ${theme.accentColor}44`, color: theme.textColor }}
                      dir="rtl"
                      placeholder="שם ערכת הנושא"
                    />
                  </div>

                  {/* Preview strip */}
                  <div className="rounded-lg overflow-hidden border" style={{ borderColor: `${theme.accentColor}33` }}>
                    <div className="px-3 py-2" style={{ background: draft.headerBg.includes("gradient") ? draft.bg : draft.headerBg }}>
                      <span className="text-xs font-bold" style={{ color: draft.accentColor, fontFamily: "'Noto Serif Hebrew', serif" }}>❧ תצוגה מקדימה ❧</span>
                    </div>
                    <div className="px-3 py-2.5 space-y-1" style={{ background: draft.bg.includes("gradient") ? "#1a1a2e" : draft.bg, border: `1px solid ${draft.cardBorder}`, borderRadius: "0 0 8px 8px" }}>
                      <p className="text-xs font-bold" style={{ color: draft.headingColor ?? draft.accentColor, fontFamily: "serif" }}>כותרת מקטע</p>
                      <p className="text-sm" style={{ color: draft.textColor, fontFamily: "'Noto Serif Hebrew', serif" }}>בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ</p>
                      <p className="text-xs italic" style={{ color: draft.instructionColor ?? draft.textColor, opacity: 0.8, fontFamily: "serif" }}>הוראה: אומר בכוונה</p>
                    </div>
                  </div>

                  {/* Color groups */}
                  {groups.map(group => (
                    <div key={group}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: theme.accentColor }}>{group}</span>
                        <div className="flex-1 h-px" style={{ background: `${theme.accentColor}33` }} />
                      </div>
                      <div className="space-y-2">
                        {COLOR_FIELDS.filter(f => f.group === group).map(({ key, label, colorOnly }) => {
                          const val = fieldVal(key);
                          const isHex = val.startsWith("#");
                          return (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-xs flex-shrink-0 w-28" style={{ color: theme.textColor }}>{label}</span>
                              <div className="flex items-center gap-1.5 flex-1">
                                <input
                                  type="color"
                                  value={isHex ? val : "#c8a04d"}
                                  onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                                  className="h-7 w-9 rounded cursor-pointer flex-shrink-0"
                                  style={{ background: "transparent", border: `1px solid ${theme.accentColor}44`, padding: "1px" }}
                                />
                                {!colorOnly && (
                                  <input
                                    type="text"
                                    value={val}
                                    onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                                    className="flex-1 rounded px-2 py-1 text-[10px] font-mono min-w-0"
                                    style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${theme.accentColor}22`, color: theme.textColor }}
                                    dir="ltr"
                                    placeholder="#hex / rgba(...) / linear-gradient(...)"
                                  />
                                )}
                                {colorOnly && isHex && (
                                  <span className="text-[10px] font-mono" style={{ color: theme.textColor, opacity: 0.6 }}>{val}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        const base = SIDDUR_PRESET_THEMES[0];
                        setDraft({ ...base, id: "custom", name: "מותאם אישית", emoji: "🎨", isCustom: true });
                      }}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.08)", color: theme.textColor, border: `1px solid ${theme.accentColor}22` }}
                    >
                      אפס
                    </button>
                    <button
                      onClick={applyCustom}
                      className="flex-1 py-1.5 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                      style={{ background: theme.accentColor, color: "#1a1a1a" }}
                    >
                      החל ושמור
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ─── SiddurLine — renders one siddur line with semantic styling ─── */
type SiddurLineSettings = { siddurFont: string; siddurSize: number; siddurBold: boolean; textAlignment: string; lineHeight: string; lineHeightCustom: number; showNikud: boolean; showTaamim: boolean; letterSpacing: string; letterSpacingCustom: number; wordSpacing: number; };

const SiddurLine = ({ html, s }: { html: string; s: SiddurLineSettings }) => {
  html = stripText(html, s.showNikud, s.showTaamim);
  const type = classifyLine(html);
  const lh = lineHeightCSS(s.lineHeight, s.lineHeightCustom);
  const nikudStyle = withNikudTypography(s.siddurFont, lh, s.showNikud);
  const { theme } = useSiddurTheme();

  const letterSpacingCSS = s.letterSpacing === "custom"
    ? `${s.letterSpacingCustom ?? 0}em`
    : s.letterSpacing === "tight"  ? "-0.02em"
    : s.letterSpacing === "wide"   ? "0.05em"
    : s.letterSpacing === "wider"  ? "0.1em"
    : "0em";
  const wordSpacingCSS = `${s.wordSpacing ?? 0}em`;

  const headingColor  = theme.headingColor     ?? theme.accentColor;
  const instrColor    = theme.instructionColor  ?? theme.textColor;

  if (type === "heading") {
    return (
      <div className="flex items-center gap-2 mt-3 mb-0.5" style={{ direction: "rtl" }}>
        <span className="inline-block h-3 w-0.5 rounded-full flex-shrink-0" style={{ background: headingColor, opacity: 0.8 }} />
        <span style={{
          ...nikudStyle,
          fontSize: `${Math.round(s.siddurSize * 0.82)}px`,
          fontWeight: 700,
          color: headingColor,
          letterSpacing: letterSpacingCSS,
          wordSpacing: wordSpacingCSS,
        }}>
          {renderLineContent(html)}
        </span>
      </div>
    );
  }

  if (type === "instruction") {
    return (
      <p style={{
        color: instrColor,
        ...nikudStyle,
        fontSize: `${Math.max(Math.round(s.siddurSize * 0.78), 12)}px`,
        fontStyle: "italic",
        textAlign: s.textAlignment as React.CSSProperties["textAlign"],
        direction: "rtl",
        opacity: 0.82,
        letterSpacing: letterSpacingCSS,
        wordSpacing: wordSpacingCSS,
      }}>
        {renderLineContent(html)}
      </p>
    );
  }

  return (
    <p style={{
      ...nikudStyle,
      color: theme.textColor,
      fontSize: `${s.siddurSize}px`,
      fontWeight: s.siddurBold ? 700 : 400,
      textAlign: s.textAlignment as React.CSSProperties["textAlign"],
      direction: "rtl",
      letterSpacing: letterSpacingCSS,
      wordSpacing: wordSpacingCSS,
    }}>
      {renderLineContent(html)}
    </p>
  );
};

/* ─── SectionCard ────────────────────────────────────────── */
const SectionCard = ({ section, initialOpen = false }: { section: SiddurSection; initialOpen?: boolean }) => {
  const [open, setOpen] = useState(initialOpen);
  const { settings: siddurSettings } = useFontAndColorSettings();
  const { theme } = useSiddurTheme();
  const gutter = readingGutter(siddurSettings.siddurContentWidth);
  const lineSettings: SiddurLineSettings = {
    ...siddurSettings,
    textAlignment: siddurSettings.siddurTextAlignment,
    lineHeight: siddurSettings.siddurLineHeight,
    lineHeightCustom: siddurSettings.siddurLineHeightCustom,
  };

  return (
    <div className="rounded-lg border overflow-hidden mb-2" style={{
      background: theme.cardBg,
      borderColor: theme.cardBorder,
      boxShadow: "none",
    }}>
      {/* Section header / toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-right transition-colors hover:bg-white/10 focus:outline-none"
        style={{ direction: "rtl" }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-4 rounded-full" style={{ background: theme.accentColor, opacity: 0.7 }} />
          <span
            style={{
              color: theme.textColor,
              fontFamily: siddurSettings.siddurFont,
              fontSize: `${siddurSettings.siddurSize}px`,
              fontWeight: siddurSettings.siddurBold ? 700 : 600,
            }}
          >
            {section.title}
          </span>
        </div>
        <span className="ml-2" style={{ color: theme.textColor, opacity: 0.5 }}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Prayer lines */}
      {open && (
        <div
        className="pb-4 pt-2 space-y-1.5 animate-fade-in border-t"
          style={{ direction: "rtl", paddingInline: gutter, borderColor: `${theme.accentColor}22` }}
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
  const { theme } = useSiddurTheme();
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
              color: theme.accentColor,
              fontFamily: siddurSettings.siddurFont,
              fontSize: `${siddurSettings.siddurSize}px`,
              fontWeight: siddurSettings.siddurBold ? 700 : 600,
            }}
          >
            <span className="inline-block w-1.5 h-4 rounded-full flex-shrink-0" style={{ background: theme.accentColor, opacity: 0.7 }} />
            {sec.title}
          </h3>
          <Divider />
          <div
            className="space-y-1.5 mt-2 rounded-xl border py-3"
            style={{ paddingInline: gutter, background: theme.cardBg, borderColor: theme.cardBorder }}
          >
            {sec.lines.map((line, j) => (
              <SiddurLine key={j} html={line} s={lineSettings} />
            ))}
          </div>
        </div>
      ))}
      {visibleCount < sections.length && (
        <div ref={sentinelRef} className="flex justify-center items-center py-4 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: theme.accentColor }} />
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
  const { theme } = useSiddurTheme();

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: theme.accentColor }} />
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
  const { theme } = useSiddurTheme();
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
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: theme.accentColor }} />
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
                color: theme.accentColor,
                fontFamily: siddurSettings.siddurFont,
                fontSize: `${siddurSettings.siddurSize}px`,
                fontWeight: siddurSettings.siddurBold ? 700 : 600,
              }}
            >
              <span className="inline-block w-1.5 h-4 rounded-full flex-shrink-0" style={{ background: theme.accentColor, opacity: 0.7 }} />
              {sec.title}
            </h3>
            <div
              className="space-y-1.5 mt-2 rounded-xl border py-3"
              style={{ paddingInline: gutter, background: theme.cardBg, borderColor: theme.cardBorder }}
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
  const { theme } = useSiddurTheme();
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
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: theme.accentColor }} />
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
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: theme.accentColor }} />
          <span className="text-sm" style={{ fontFamily: SERIF }}>
            טוען {categories[visibleCount]?.name}...
          </span>
        </div>
      )}
    </div>
  );
};

/* ─── SplitPane — master/detail: section list | prayer text ─ */
const SplitPane = ({ nusach, catId }: { nusach: string; catId: string }) => {
  const { sections, catName, loading } = useSiddurSections(nusach, catId);
  const [selIdx, setSelIdx] = useState(0);
  const { settings: s } = useFontAndColorSettings();
  const { displayStyle } = useSiddurDisplayStyle();
  const { theme } = useSiddurTheme();
  const ornate = displayStyle === "ornate";
  const gutter = readingGutter(s.siddurContentWidth);
  const lineSettings: SiddurLineSettings = {
    ...s,
    textAlignment: s.siddurTextAlignment,
    lineHeight: s.siddurLineHeight,
    lineHeightCustom: s.siddurLineHeightCustom,
  };

  useEffect(() => { setSelIdx(0); }, [catId, nusach]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: theme.accentColor }} />
      </div>
    );
  if (!sections?.length) return null;

  const sec = sections[Math.min(selIdx, sections.length - 1)];

  return (
    <div className="flex flex-col sm:flex-row gap-0 pb-8" dir="rtl">
      {/* Section nav panel (right side in RTL) */}
      <div
        className="w-full sm:w-52 flex-shrink-0 border-b sm:border-b-0 sm:border-l border-border/50 max-h-36 sm:max-h-none overflow-y-auto"
        style={{ paddingLeft: "0.5rem" }}
      >
        <div
          className="text-xs font-bold mb-2 px-2 py-1.5 text-center sticky top-0 z-10"
          style={{
            color: theme.accentColor,
            fontFamily: "'Noto Serif Hebrew', serif",
            background: ornate ? "#fffdf7" : theme.headerBg,
            borderBottom: `1px solid ${theme.accentColor}22`,
          }}
        >
          {catName}
        </div>
        <div className="flex sm:flex-col flex-row gap-1 sm:gap-0 sm:space-y-0.5 pb-2 sm:pb-4 overflow-x-auto sm:overflow-x-hidden">
          {sections.map((item, i) => (
            <button
              key={i}
              onClick={() => setSelIdx(i)}
              className="sm:w-full flex-shrink-0 whitespace-nowrap sm:whitespace-normal text-right text-sm px-2.5 py-2 rounded-lg transition-all leading-snug"
              style={{
                fontFamily: "'Noto Serif Hebrew', serif",
                color: i === selIdx ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                background: i === selIdx ? `${theme.accentColor}18` : "transparent",
                borderRight: i === selIdx ? `3px solid ${theme.accentColor}` : "3px solid transparent",
                fontWeight: i === selIdx ? 600 : 400,
              }}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>

      {/* Prayer text (left side in RTL) */}
      <div className="flex-1 min-w-0 pt-4 sm:pt-0 pr-0 sm:pr-4 overflow-y-auto">
        <OrnamentTitle text={sec.title} fontSize={s.siddurSize} />
        <Divider />
        <div
          className="space-y-1.5 mt-3 rounded-xl border py-4"
          style={{
            paddingInline: gutter,
            background: ornate ? "linear-gradient(180deg, #fffdfa 0%, #fffaf0 100%)" : theme.cardBg,
            borderColor: ornate ? `${theme.accentColor}44` : theme.cardBorder,
            boxShadow: ornate ? `0 4px 16px ${theme.accentColor}1f` : undefined,
          }}
        >
          {sec.lines.map((line, i) => (
            <SiddurLine key={i} html={line} s={lineSettings} />
          ))}
        </div>

        {/* Prev / Next */}
        <div className="flex justify-between items-center mt-4 gap-2">
          <button
            onClick={() => setSelIdx(v => Math.min(v + 1, sections.length - 1))}
            disabled={selIdx >= sections.length - 1}
            className="text-xs px-3 py-1.5 rounded-full disabled:opacity-30 transition-all"
            style={{ background: `${theme.accentColor}22`, color: theme.accentColor, border: `1px solid ${theme.accentColor}55` }}
          >
            « הבא
          </button>
          <span className="text-xs text-muted-foreground" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
            {selIdx + 1} / {sections.length}
          </span>
          <button
            onClick={() => setSelIdx(v => Math.max(v - 1, 0))}
            disabled={selIdx <= 0}
            className="text-xs px-3 py-1.5 rounded-full disabled:opacity-30 transition-all"
            style={{ background: `${theme.accentColor}22`, color: theme.accentColor, border: `1px solid ${theme.accentColor}55` }}
          >
            קודם »
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── BookColumnPane — two CSS-columns book layout ────────── */
const BookColumnPane = ({ nusach, catId }: { nusach: string; catId: string }) => {
  const { sections, catName, loading } = useSiddurSections(nusach, catId);
  const { settings: s } = useFontAndColorSettings();
  const { theme } = useSiddurTheme();
  const [isMobileView, setIsMobileView] = useState(typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    const h = () => setIsMobileView(window.innerWidth < 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const lineSettings: SiddurLineSettings = {
    ...s,
    textAlignment: s.siddurTextAlignment,
    lineHeight: s.siddurLineHeight,
    lineHeightCustom: s.siddurLineHeightCustom,
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: theme.accentColor }} />
      </div>
    );
  if (!sections?.length) return null;

  return (
    <div className="pb-8" dir="rtl">
      <OrnamentTitle text={catName} fontSize={s.siddurSize} />
      <Divider />
      <div
        style={{
          columnCount: isMobileView ? 1 : 2,
          columnGap: "2.5rem",
          columnRule: isMobileView ? undefined : `1px solid ${theme.accentColor}44`,
          direction: "rtl",
        }}
      >
        {sections.map((sec, i) => (
          <div
            key={i}
            style={{ breakInside: "avoid", pageBreakInside: "avoid", marginBottom: "1.5rem" }}
          >
            <div className="flex items-center gap-2 mb-1.5" style={{ direction: "rtl" }}>
              <span
                className="inline-block h-3 w-0.5 rounded-full flex-shrink-0"
                style={{ background: theme.accentColor, opacity: 0.7 }}
              />
              <span
                style={{
                  color: theme.accentColor,
                  fontFamily: "'Noto Serif Hebrew', serif",
                  fontSize: `${Math.round(s.siddurSize * 0.85)}px`,
                  fontWeight: 700,
                }}
              >
                {sec.title}
              </span>
            </div>
            <div className="space-y-1">
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

/* ─── TextFiltersBar (nikud / taamim toggles) ───────────── */
const TextFiltersBar = ({ scope }: { scope: "siddur" | "tehillim" }) => {
  const { settings, updateSettings } = useFontAndColorSettings();
  const { displayStyle, setDisplayStyle } = useSiddurDisplayStyle();
  const { theme } = useSiddurTheme();
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
        background: active ? theme.accentColor : "hsl(var(--muted))",
        color:      active ? "hsl(var(--sidebar-background))" : "hsl(var(--muted-foreground))",
        boxShadow:  active ? `0 2px 8px ${theme.accentColor}44` : "none",
        fontFamily: "'Noto Serif Hebrew', serif",
        opacity:    active ? 1 : 0.6,
      }}
    >
      <span style={{ fontSize: "0.85em", opacity: active ? 1 : 0.5 }}>{example}</span>
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap justify-center gap-2 mb-3">
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
  const { theme } = useSiddurTheme();
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
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: theme.accentColor }} />
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
    color: theme.accentColor, fontSize: "0.7em", opacity: 0.9,
    fontFamily: "'Noto Serif Hebrew', serif",
    minWidth: "1.4em", verticalAlign: "super", lineHeight: 1,
    display: "inline-block", marginLeft: "0.3em",
  };

  const renderVerseCard = (lines: string[], highlightPasuk: number | null, trackRefs = false) => (
    <div className="rounded-xl border border-border/50 py-5 space-y-3" style={{
      background: ornate ? "linear-gradient(180deg, #fffdfa 0%, #fff8eb 100%)" : "hsl(var(--card))",
      borderColor: ornate ? `${theme.accentColor}44` : undefined,
      boxShadow: ornate ? `0 6px 18px ${theme.accentColor}1f` : undefined,
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
            background:  highlightPasuk === i + 1 ? `${theme.accentColor}18` : "transparent",
            padding:     highlightPasuk === i + 1 ? "2px 6px" : "0",
            borderRight: highlightPasuk === i + 1 ? `3px solid ${theme.accentColor}` : "3px solid transparent",
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
                background: mode === m.id ? theme.accentColor : "transparent",
                color:      mode === m.id ? "hsl(var(--sidebar-background))" : "hsl(var(--muted-foreground))",
                boxShadow:  mode === m.id ? `0 2px 8px ${theme.accentColor}55` : "none",
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
                  style={{ background: `${theme.accentColor}22`, color: theme.accentColor, border: `1px solid ${theme.accentColor}55` }}
                >
                  פרק {heNum(todayChapter)} ({todayChapter})
                </button>
              </div>

              <div className="grid gap-1 mb-4 justify-items-center grid-cols-7 sm:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))]">
                {Array.from({ length: 150 }, (_, i) => i + 1).map(ch => (
                  <button
                    key={ch}
                    onClick={() => handleChapterSelect(ch)}
                    title={`פרק ${ch}`}
                    className="w-full aspect-square flex items-center justify-center rounded text-[10px] sm:text-xs font-medium transition-all leading-none"
                    style={
                      ch === chapter
                        ? { background: theme.accentColor, color: "hsl(var(--sidebar-background))", boxShadow: `0 0 0 2px ${theme.accentColor}` }
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
                <span className="font-semibold" style={{ color: theme.accentColor }}>
                  {`פרק ${heNum(chapter)} (${chapter})`}
                </span>
                {pasuk && (
                  <>
                    <span className="opacity-40 text-foreground">›</span>
                    <span className="font-semibold" style={{ color: theme.accentColor }}>פסוק {heNum(pasuk)}</span>
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
                        background: pasuk === i + 1 ? theme.accentColor : "hsl(var(--muted))",
                        color:      pasuk === i + 1 ? "hsl(var(--sidebar-background))" : "hsl(var(--muted-foreground))",
                        boxShadow:  pasuk === i + 1 ? `0 2px 6px ${theme.accentColor}55` : "none",
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
                  style={{ background: `${theme.accentColor}22`, color: theme.accentColor, border: `1px solid ${theme.accentColor}55` }}
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
                  style={{ background: `${theme.accentColor}22`, color: theme.accentColor, border: `1px solid ${theme.accentColor}55` }}
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
            style={{ background: `${theme.accentColor}12`, border: `1px solid ${theme.accentColor}30` }}
          >
            <Star className="h-4 w-4 flex-shrink-0" style={{ color: theme.accentColor }} />
            <span
              className="text-sm font-semibold"
              style={{ color: theme.accentColor, fontFamily: "'Noto Serif Hebrew', serif" }}
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
                  color:      theme.accentColor,
                  fontFamily: tehillimSettings.tehillimFont,
                  fontSize:   `${tehillimSettings.tehillimSize}px`,
                  fontWeight: tehillimSettings.tehillimBold ? 700 : 600,
                }}
              >
                <span className="inline-block w-1.5 h-4 rounded-full flex-shrink-0" style={{ background: theme.accentColor, opacity: 0.7 }} />
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
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: theme.accentColor }} />
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
const ALIYAH_NUM_HE: Record<number, string> = { 1: 'ראשון', 2: 'שני', 3: 'שלישי' };

function pasukRef(ref: string): string {
  const [p, v] = ref.split(':').map(Number);
  return `פרק\u00a0${p} פסוק\u00a0${v}`;
}

const WeekdayReadingCard = ({ onNavigate }: { onNavigate: (seferId: number, perek: number) => void }) => {
  const [leyning, setLeyning] = useState<WeekdayLeyning | null>(null);
  const [loadingL, setLoadingL] = useState(true);
  const { theme } = useSiddurTheme();

  useEffect(() => {
    try { setLeyning(getWeekdayLeyning(getCalendarPreference())); }
    catch { /* ignore */ }
    setLoadingL(false);
  }, []);

  if (loadingL)
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: theme.accentColor }} />
      </div>
    );

  if (!leyning)
    return (
      <div
        className="my-4 rounded-xl border px-4 py-3 text-sm text-right text-muted-foreground"
        dir="rtl"
        style={{ borderColor: `${theme.accentColor}30`, background: `${theme.accentColor}0a` }}
      >
        קריאת שני וחמישי אינה זמינה כעת
      </div>
    );

  const todayLabel = (() => {
    const d = new Date().getDay();
    return d === 1 ? 'שני' : d === 4 ? 'חמישי' : 'שני / חמישי';
  })();

  return (
    <div
      className="my-4 rounded-xl border overflow-hidden"
      dir="rtl"
      style={{ borderColor: `${theme.accentColor}44`, boxShadow: `0 2px 12px ${theme.accentColor}18` }}
    >
      {/* Card header */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: `${theme.accentColor}14`, borderBottom: `1px solid ${theme.accentColor}30` }}
      >
        <Button
          size="sm"
          onClick={() => onNavigate(leyning.seferId, leyning.openPerek)}
          className="flex items-center gap-1.5 text-xs font-medium shrink-0"
          style={{ background: theme.accentColor, color: '#1a1a1a' }}
        >
          <ExternalLink className="h-3 w-3" />
          פתח בסידור
        </Button>
        <div className="text-right">
          <p className="font-bold" style={{ color: theme.accentColor, fontFamily: "'Noto Serif Hebrew', serif", fontSize: '1rem' }}>
            {leyning.parshaHe}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            קריאת {todayLabel} שבוע זה — ג׳ עולים
          </p>
        </div>
      </div>

      {/* Aliyot rows */}
      <div className="divide-y divide-border/30">
        {leyning.aliyot.map((a, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-3" dir="rtl">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: `${theme.accentColor}22`, color: theme.accentColor, fontFamily: "'Noto Serif Hebrew', serif" }}
            >
              {ALIYAH_NUM_HE[i + 1] ?? `עלייה ${i + 1}`}
            </span>
            <div className="flex-1 text-right">
              <span className="text-sm font-medium" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
                {a.bookHe} {pasukRef(a.begin)}
              </span>
              <span className="text-xs text-muted-foreground"> עד </span>
              <span className="text-sm font-medium" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
                {pasukRef(a.end)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{a.verses}&nbsp;פסוקים</span>
          </div>
        ))}
      </div>
    </div>
  );
};

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

const KriaPane = ({ onNavigate }: { onNavigate: (seferId?: number, perek?: number) => void }) => {
  const { theme } = useSiddurTheme();
  return (
  <div className="pb-8" dir="rtl">
    <OrnamentTitle text="קריאה בתורה" />
    <Divider />

    {/* Live Mon/Thu reading for this week */}
    <WeekdayReadingCard onNavigate={(sid, perek) => onNavigate(sid, perek)} />

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
            style={{ background: `${theme.accentColor}22`, color: theme.accentColor }}
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
};

/* ─── Main Siddur component ──────────────────────────────── */
export const Siddur = () => {
  const navigate                = useNavigate();
  const [nusach, setNusach]    = useState("sefard");
  const [catId, setCatId]      = useState("shacharit");
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem("siddur-view-mode") as ViewMode) ?? "accordion"
  );
  const [displayStyle, setDisplayStyleState] = useState<DisplayStyle>(() =>
    (localStorage.getItem("siddur-display-style") as DisplayStyle) ?? "classic"
  );

  const { user } = useAuth();

  const [activeTheme, setActiveTheme] = useState<SiddurTheme>(() => {
    const saved = localStorage.getItem(ACTIVE_THEME_KEY);
    if (saved) {
      const found = SIDDUR_PRESET_THEMES.find(t => t.id === saved);
      if (found) return found;
      // Active theme was custom — restore from CUSTOM_THEME_KEY
      if (saved === "custom") return loadCustomTheme();
    }
    return SIDDUR_PRESET_THEMES[0];
  });
  const [customTheme, setCustomTheme] = useState<SiddurTheme>(loadCustomTheme);

  // Cloud sync helpers
  const cloudSaveActiveTheme = useCallback(async (t: SiddurTheme) => {
    if (!user) return;
    const ts = Date.now();
    localStorage.setItem(`${ACTIVE_THEME_KEY}__ts`, String(ts));
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      await supabase.auth.updateUser({ data: {
        ...u.user_metadata,
        siddur_active_theme_id: t.id,
        siddur_active_theme_ts: ts,
      }});
    } catch { /* ignore */ }
  }, [user]);

  const cloudSaveCustomTheme = useCallback(async (t: SiddurTheme) => {
    const ts = Date.now();
    localStorage.setItem(`${CUSTOM_THEME_KEY}__ts`, String(ts));
    if (!user) return;
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      await supabase.auth.updateUser({ data: {
        ...u.user_metadata,
        siddur_custom_theme: JSON.stringify(t),
        siddur_custom_theme_ts: ts,
      }});
    } catch { /* ignore */ }
  }, [user]);

  // On login: pull cloud theme state and apply if newer
  useEffect(() => {
    if (!user) return;
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      const meta = u.user_metadata ?? {};

      // Restore custom theme
      const cloudCustomTs = Number(meta["siddur_custom_theme_ts"]) || 0;
      const localCustomTs = Number(localStorage.getItem(`${CUSTOM_THEME_KEY}__ts`)) || 0;
      if (cloudCustomTs > localCustomTs && meta["siddur_custom_theme"]) {
        try {
          const ct: SiddurTheme = typeof meta["siddur_custom_theme"] === "string"
            ? JSON.parse(meta["siddur_custom_theme"])
            : meta["siddur_custom_theme"];
          if (ct && ct.id === "custom") {
            saveCustomTheme(ct);
            localStorage.setItem(`${CUSTOM_THEME_KEY}__ts`, String(cloudCustomTs));
            setCustomTheme(ct);
            // If active theme was custom, update it too
            if (localStorage.getItem(ACTIVE_THEME_KEY) === "custom") {
              setActiveTheme(ct);
            }
          }
        } catch { /* ignore */ }
      }

      // Restore active theme id
      const cloudActiveTs = Number(meta["siddur_active_theme_ts"]) || 0;
      const localActiveTs = Number(localStorage.getItem(`${ACTIVE_THEME_KEY}__ts`)) || 0;
      if (cloudActiveTs > localActiveTs && meta["siddur_active_theme_id"]) {
        const id = meta["siddur_active_theme_id"] as string;
        localStorage.setItem(ACTIVE_THEME_KEY, id);
        localStorage.setItem(`${ACTIVE_THEME_KEY}__ts`, String(cloudActiveTs));
        const found = SIDDUR_PRESET_THEMES.find(t => t.id === id);
        if (found) setActiveTheme(found);
        else if (id === "custom") {
          const ct = loadCustomTheme();
          setActiveTheme(ct);
        }
      }
    }).catch(() => {});
  }, [user?.id]);

  const { categories, loading: catsLoading } = useSiddurCategories(nusach);
  const { settings: fontSettings } = useFontAndColorSettings();
  const isSpecial = NUSACH_INDEP.has(catId);
  const settingsTab = catId === "tehillim" ? "tehillim" : catId === "kria" ? "pasuk" : "siddur";

  const activeWidth = catId === "tehillim" ? fontSettings.tehillimContentWidth : fontSettings.siddurContentWidth;
  const containerMaxW =
    activeWidth === "narrow" ? "max-w-2xl" :
    activeWidth === "wide"   ? "max-w-6xl" :
    activeWidth === "full"   ? "max-w-full" :
    "max-w-4xl";

  // If active category disappeared in new nusach, fall back to first
  useEffect(() => {
    if (!isSpecial && categories.length > 0 && !categories.find(c => c.id === catId)) {
      setCatId(categories[0].id);
    }
  }, [categories, catId, isSpecial]);

  const setMode = (mode: ViewMode) => {
    localStorage.setItem("siddur-view-mode", mode);
    setViewMode(mode);
  };

  const setDisplayStyle = (style: DisplayStyle) => {
    localStorage.setItem("siddur-display-style", style);
    setDisplayStyleState(style);
  };

  const VIEW_MODES: { id: ViewMode; icon: React.ReactNode; title: string; desc?: string }[] = [
    { id: "accordion",  icon: <LayoutList     className="h-4 w-4" />, title: "מקטעים",       desc: "קפסאות מתקפלות" },
    { id: "continuous", icon: <AlignJustify   className="h-4 w-4" />, title: "רציף",          desc: "גלילה סעיף-אחר-סעיף" },
    { id: "scroll",     icon: <ScrollText     className="h-4 w-4" />, title: "גלילה כוללת",  desc: "כל הקטגוריות ברצף" },
    { id: "split",      icon: <PanelRightOpen className="h-4 w-4" />, title: "פצול",          desc: "רשימת סעיפים + טקסט" },
    { id: "book",       icon: <Columns2       className="h-4 w-4" />, title: "שתי עמודות",   desc: "פריסת ספר" },
  ];

  return (
    <SiddurThemeContext.Provider value={{
      theme: activeTheme,
      setTheme: t => {
        setActiveTheme(t);
        localStorage.setItem(ACTIVE_THEME_KEY, t.id);
        cloudSaveActiveTheme(t);
      },
      customTheme,
      setCustomTheme: (t) => {
        setCustomTheme(t);
        cloudSaveCustomTheme(t);
      },
    }}>
    <SiddurDisplayStyleContext.Provider value={{ displayStyle, setDisplayStyle }}>
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: activeTheme.bg,
        direction: "rtl",
      }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: activeTheme.headerBg,
          paddingTop: "max(var(--safe-area-inset-top, var(--sai-top, env(safe-area-inset-top, 0px))), 24px)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.18), 0 1px 0 rgba(200,160,77,0.15)",
        }}
      >
        <div className="w-full px-3 sm:px-5">

          {/* ── Row 1: Title right, actions left ── */}
          <div className="flex items-center justify-between gap-1 pt-2.5 pb-2 flex-nowrap min-w-0">

            {/* Right side: Title + Back */}
            <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
              <h1
                className="text-lg sm:text-2xl font-bold tracking-wide whitespace-nowrap"
                style={{
                  color: activeTheme.textColor,
                  fontFamily: "'Noto Serif Hebrew', 'David Libre', serif",
                  textShadow: `0 0 20px ${activeTheme.accentColor}33`,
                }}
              >
                סידור תפילה
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-sm font-medium flex-shrink-0 whitespace-nowrap"
                style={{ color: `${activeTheme.textColor}bf`, background: "transparent" }}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">חזרה</span>
              </Button>
            </div>

            {/* Left side: actions — ltr so order is predictable */}
            <div className="flex items-center gap-1.5 flex-shrink-0" dir="ltr">
              {/* Theme picker */}
              <ThemePicker />
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
                      style={{ color: activeTheme.accentColor, background: `${activeTheme.accentColor}18`, border: `1px solid ${activeTheme.accentColor}44` }}
                    >
                      <Layers className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="hidden md:inline max-w-[80px] truncate">{VIEW_MODES.find(m => m.id === viewMode)?.title ?? "תצוגה"}</span>
                      <ChevronDown className="h-3 w-3 opacity-60 flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56" style={{ direction: "rtl" }}>
                    <DropdownMenuLabel className="text-right text-xs text-muted-foreground">מצב תצוגה</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {VIEW_MODES.map(m => (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span style={{ color: viewMode === m.id ? activeTheme.accentColor : "hsl(var(--muted-foreground))" }}>{m.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className={cn("block text-sm", viewMode === m.id && "font-semibold text-foreground")}>{m.title}</span>
                          {m.desc && <span className="block text-[10px] text-muted-foreground">{m.desc}</span>}
                        </div>
                        {viewMode === m.id && <span className="text-xs flex-shrink-0" style={{ color: activeTheme.accentColor }}>✓</span>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Mode switcher: חומש | סידור | עומר — hidden on xs */}
              <div
                className="hidden sm:flex items-center rounded-full flex-shrink-0"
                style={{ }}
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
                <span className="w-px h-3.5 opacity-25" style={{ background: activeTheme.accentColor }} />
                <div
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold"
                  style={{ color: activeTheme.accentColor }}
                >
                  <BookMarked className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">סידור</span>
                </div>
                <span className="w-px h-3.5 opacity-25" style={{ background: activeTheme.accentColor }} />
                <button
                  onClick={() => navigate('/omer')}
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
                    ? { background: activeTheme.accentColor, color: "hsl(var(--sidebar-background))", boxShadow: `0 2px 8px ${activeTheme.accentColor}55`, fontWeight: 700 }
                    : { background: "transparent", color: `${activeTheme.textColor}a0` }
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
        className="border-b flex items-stretch"
        style={{
          background: activeTheme.headerBg,
          borderColor: `${activeTheme.accentColor}30`,
        }}
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
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-all"
              style={{
                fontFamily: "'Noto Serif Hebrew', 'David Libre', serif",
                color: catId === cat.id ? activeTheme.accentColor : `${activeTheme.textColor}99`,
                borderBottomColor: catId === cat.id ? activeTheme.accentColor : "transparent",
              }}
            >
              <CatIcon id={cat.id} />
              {cat.name}
            </button>
          ))}

          {/* Separator before special tabs */}
          {!catsLoading && categories.length > 0 && (
            <div className="self-stretch w-px bg-white/15 mx-1 my-2" />
          )}

          {/* Static tabs — always shown */}
          {STATIC_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCatId(tab.id)}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-all"
              style={{
                fontFamily: "'Noto Serif Hebrew', 'David Libre', serif",
                color: catId === tab.id ? activeTheme.accentColor : `${activeTheme.textColor}99`,
                borderBottomColor: catId === tab.id ? activeTheme.accentColor : "transparent",
              }}
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
          <div className="flex-shrink-0 flex items-center px-2 border-r border-white/10" dir="ltr">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ background: `${activeTheme.accentColor}18`, color: activeTheme.accentColor }}
                  title={VIEW_MODES.find(m => m.id === viewMode)?.title}
                >
                  {VIEW_MODES.find(m => m.id === viewMode)?.icon}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" className="w-56 z-[9999]" style={{ direction: "rtl" }}>
                <DropdownMenuLabel className="text-right text-xs text-muted-foreground">מצב תצוגה</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {VIEW_MODES.map(m => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span style={{ color: viewMode === m.id ? activeTheme.accentColor : "hsl(var(--muted-foreground))" }}>{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className={cn("block text-sm", viewMode === m.id && "font-semibold text-foreground")}>{m.title}</span>
                      {m.desc && <span className="block text-[10px] text-muted-foreground">{m.desc}</span>}
                    </div>
                    {viewMode === m.id && <span className="text-xs flex-shrink-0" style={{ color: activeTheme.accentColor }}>✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      <main
        className={cn(
          "flex-1 flex flex-col pt-4 sm:pt-6 mx-auto w-full",
          containerMaxW,
          viewMode === "split" || viewMode === "book"
            ? "px-3 sm:px-5"
            : viewMode === "scroll"
            ? "px-4 sm:px-6"
            : "px-5 sm:px-7"
        )}
      >
        {/* ── Text filter toggles (nikud / taamim) ── */}
        <TextFiltersBar scope={catId === "tehillim" ? "tehillim" : "siddur"} />

        {/* Special — nusach-independent panes */}
        {catId === "tehillim" && <TehillimPane />}
        {catId === "kria"     && (
          <KriaPane
            onNavigate={(seferId, perek) => {
              if (seferId && perek) {
                navigate(`/?sefer=${seferId}&perek=${perek}`);
              } else {
                navigate("/");
              }
            }}
          />
        )}

        {/* Regular siddur prayer content */}
        {!isSpecial && (viewMode === "accordion" || viewMode === "continuous") && (
          <CategoryPane nusach={nusach} catId={catId} viewMode={viewMode} />
        )}
        {!isSpecial && viewMode === "scroll" && (
          <FullContinuousPane nusach={nusach} />
        )}
        {!isSpecial && viewMode === "split" && (
          <SplitPane nusach={nusach} catId={catId} />
        )}
        {!isSpecial && viewMode === "book" && (
          <BookColumnPane nusach={nusach} catId={catId} />
        )}
      </main>
    </div>
    </SiddurDisplayStyleContext.Provider>
    </SiddurThemeContext.Provider>
  );
};

export default Siddur;
