/**
 * useSiddurData
 * Loads siddur sections for a given nusach + category.
 * Strategy: Supabase first (fast, CDN-cached) → local JSON fallback.
 * Results are cached in memory so switching categories is instant on repeat visits.
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiddurSection  = { title: string; lines: string[] };
export type SiddurCategory = { name: string; sections: SiddurSection[] };
export type SiddurData     = Record<string, SiddurCategory>;

const SIDDUR_FILES = import.meta.glob<{ default: SiddurData }>(
  "../data/siddur/siddur_*.json"
);

// Global cache shared across hook instances
const sectionsCache: Record<string, SiddurSection[]> = {};
const catNameCache:  Record<string, string>          = {};
// Track which nusach files have been locally loaded (for category tab discovery)
const nusachCache:   Record<string, SiddurData>      = {};

export function useSiddurSections(nusach: string, catId: string) {
  const [sections, setSections] = useState<SiddurSection[] | null>(
    sectionsCache[`${nusach}:${catId}`] ?? null
  );
  const [catName, setCatName] = useState(catNameCache[`${nusach}:${catId}`] ?? "");
  const [loading, setLoading] = useState(sections === null);
  const [error, setError]     = useState<string | null>(null);
  const [source, setSource]   = useState<"supabase" | "local" | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    const key = `${nusach}:${catId}`;
    if (sectionsCache[key]) {
      setSections(sectionsCache[key]);
      setCatName(catNameCache[key] ?? "");
      setLoading(false);
      return;
    }

    abortRef.current = false;
    setLoading(true);
    setError(null);
    setSections(null);

    async function load() {
      // ── Try Supabase ──────────────────────────────────────────
      try {
        const { data: rows, error: sbErr } = await (supabase as any)
          .from("siddur")
          .select("title, lines, cat_name, section_idx")
          .eq("nusach", nusach)
          .eq("category", catId)
          .order("section_idx");

        if (!sbErr && rows && rows.length > 0 && !abortRef.current) {
          const secs: SiddurSection[] = rows.map(r => ({
            title: r.title,
            lines: r.lines as string[],
          }));
          const name = rows[0].cat_name;
          sectionsCache[key] = secs;
          catNameCache[key]  = name;
          setSections(secs);
          setCatName(name);
          setSource("supabase");
          setLoading(false);
          return;
        }
      } catch {
        // fall through
      }

      if (abortRef.current) return;

      // ── Fallback: local JSON ──────────────────────────────────
      try {
        let nusachData = nusachCache[nusach];
        if (!nusachData) {
          const fileKey = `../data/siddur/siddur_${nusach}.json`;
          const importer = SIDDUR_FILES[fileKey];
          if (!importer) throw new Error("file not found");
          const mod = await importer();
          nusachData = mod.default;
          nusachCache[nusach] = nusachData;
        }

        if (abortRef.current) return;

        const cat = nusachData[catId];
        if (cat) {
          sectionsCache[key] = cat.sections;
          catNameCache[key]  = cat.name;
          setSections(cat.sections);
          setCatName(cat.name);
          setSource("local");
        } else {
          setSections([]);
        }
        setLoading(false);
      } catch {
        if (!abortRef.current) {
          setError("לא ניתן לטעון — בדוק חיבור אינטרנט");
          setLoading(false);
        }
      }
    }

    load();
    return () => { abortRef.current = true; };
  }, [nusach, catId]);

  return { sections, catName, loading, error, source };
}

/**
 * useSiddurCategories
 * Returns the available categories for a nusach.
 * Tries to load list from Supabase (DISTINCT query), falls back to local JSON.
 */
const CATEGORIES_ORDER = [
  "shacharit", "mincha", "arvit",
  "shabbat_kabbalat", "shabbat_arvit", "shabbat_shacharit",
  "shabbat_musaf", "shabbat_mincha", "brachot", "other",
];
const catListCache: Record<string, { id: string; name: string }[]> = {};

export function useSiddurCategories(nusach: string) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    catListCache[nusach] ?? []
  );
  const [loading, setLoading] = useState(!catListCache[nusach]);

  useEffect(() => {
    if (catListCache[nusach]) {
      setCategories(catListCache[nusach]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      // ── Try Supabase ──────────────────────────────────────────
      try {
        const { data: rows } = await (supabase as any)
          .from("siddur")
          .select("category, cat_name, section_idx")
          .eq("nusach", nusach)
          .eq("section_idx", 0);

        if (rows && rows.length > 0 && !cancelled) {
          const cats = rows
            .map(r => ({ id: r.category, name: r.cat_name }))
            .sort((a, b) => CATEGORIES_ORDER.indexOf(a.id) - CATEGORIES_ORDER.indexOf(b.id));
          catListCache[nusach] = cats;
          setCategories(cats);
          setLoading(false);
          return;
        }
      } catch {
        // fall through
      }

      if (cancelled) return;

      // ── Fallback: local JSON ──────────────────────────────────
      try {
        let nusachData = nusachCache[nusach];
        if (!nusachData) {
          const fileKey = `../data/siddur/siddur_${nusach}.json`;
          const importer = SIDDUR_FILES[fileKey];
          if (!importer) throw new Error("not found");
          const mod = await importer();
          nusachData = mod.default;
          nusachCache[nusach] = nusachData;
        }

        if (cancelled) return;

        const cats = CATEGORIES_ORDER
          .filter(k => nusachData[k] && nusachData[k].sections.length > 0)
          .map(k => ({ id: k, name: nusachData[k].name }));
        catListCache[nusach] = cats;
        setCategories(cats);
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [nusach]);

  return { categories, loading };
}

/**
 * useTehillimData
 * Loads all 150 chapters.
 * Tries Supabase first, falls back to local JSON.
 */
export type TehillimChapter = { chapter: number; title: string; lines: string[] };
export type TehillimMap     = Record<string, TehillimChapter>;

const TEHILLIM_FILE = import.meta.glob<{ default: TehillimMap }>(
  "../data/tehillim.json"
);

let tehillimCache: TehillimMap | null = null;

export function useTehillimData() {
  const [tehillim, setTehillim] = useState<TehillimMap | null>(tehillimCache);
  const [loading, setLoading]   = useState(tehillimCache === null);
  const [source, setSource]     = useState<"supabase" | "local" | null>(null);
  const loaded = useRef(tehillimCache !== null);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    setLoading(true);

    async function load() {
      // ── Try Supabase ──────────────────────────────────────────
      try {
        const { data: rows, error: sbErr } = await supabase
          .from("tehillim")
          .select("chapter, title, lines")
          .order("chapter");

        if (!sbErr && rows && rows.length > 0) {
          const map: TehillimMap = {};
          for (const r of rows) {
            map[String(r.chapter)] = {
              chapter: r.chapter,
              title:   r.title,
              lines:   r.lines as string[],
            };
          }
          tehillimCache = map;
          setTehillim(map);
          setSource("supabase");
          setLoading(false);
          return;
        }
      } catch {
        // fall through
      }

      // ── Fallback: local JSON ──────────────────────────────────
      try {
        const key = "../data/tehillim.json";
        const importer = TEHILLIM_FILE[key];
        if (!importer) throw new Error("not found");
        const mod = await importer();
        tehillimCache = mod.default;
        setTehillim(mod.default);
        setSource("local");
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { tehillim, loading, source };
}
