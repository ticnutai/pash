/**
 * useSiddurData
 * Loads siddur sections for a given nusach + category.
 * Strategy: race Supabase + local JSON simultaneously → first valid result wins.
 * Once the local JSON for a nusach is loaded it's cached in memory, so every
 * subsequent category switch is instant (zero network required).
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiddurSection  = { title: string; lines: string[] };
export type SiddurCategory = { name: string; sections: SiddurSection[] };
export type SiddurData     = Record<string, SiddurCategory>;

const SIDDUR_FILES = import.meta.glob<{ default: SiddurData }>(
  "../data/siddur/siddur_*.json"
);

// Global caches shared across all hook instances
const sectionsCache: Record<string, SiddurSection[]>            = {};
const catNameCache:  Record<string, string>                     = {};
const nusachCache:   Record<string, SiddurData>                 = {};
// In-flight local-JSON promises so concurrent callers share one fetch
const nusachPending: Record<string, Promise<SiddurData | null>> = {};

/**
 * Load (or return cached) the full local JSON for a nusach.
 * Concurrent callers get the same promise so we never double-fetch.
 */
async function loadLocalNusach(nusach: string): Promise<SiddurData | null> {
  if (nusachCache[nusach]) return nusachCache[nusach];
  if (!nusachPending[nusach]) {
    nusachPending[nusach] = (async () => {
      try {
        const fileKey = `../data/siddur/siddur_${nusach}.json`;
        const importer = SIDDUR_FILES[fileKey];
        if (!importer) return null;
        const mod = await importer();
        nusachCache[nusach] = mod.default;
        return mod.default;
      } catch {
        return null;
      } finally {
        delete nusachPending[nusach];
      }
    })();
  }
  return nusachPending[nusach];
}

/**
 * Call this when the Siddur page mounts to kick off background loading of the
 * local JSON while the page is rendering, so it's ready before the user taps
 * a category.
 */
export function preloadSiddurNusach(nusach: string) {
  if (!nusachCache[nusach] && !nusachPending[nusach]) {
    loadLocalNusach(nusach); // fire-and-forget
  }
}

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

    // "done" flag ensures only the first valid result updates state
    let done = false;

    const commit = (
      secs: SiddurSection[],
      name: string,
      src: "supabase" | "local",
    ) => {
      if (done || abortRef.current) return;
      done = true;
      sectionsCache[key] = secs;
      catNameCache[key]  = name;
      setSections(secs);
      setCatName(name);
      setSource(src);
      setLoading(false);
    };

    // ── Supabase ──────────────────────────────────────────────
    const supabaseLoad = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rows, error: sbErr } = await (supabase as any)
          .from("siddur")
          .select("title, lines, cat_name, section_idx")
          .eq("nusach", nusach)
          .eq("category", catId)
          .order("section_idx");
        if (!sbErr && rows && rows.length > 0) {
          commit(
            rows.map((r: { title: string; lines: string[] }) => ({ title: r.title, lines: r.lines })),
            rows[0].cat_name,
            "supabase",
          );
        }
      } catch { /* fall through */ }
    };

    // ── Local JSON ────────────────────────────────────────────
    const localLoad = async () => {
      const nusachData = await loadLocalNusach(nusach);
      if (!nusachData) return;
      const cat = nusachData[catId];
      if (cat) {
        commit(cat.sections, cat.name, "local");
      } else {
        // Category doesn't exist in this nusach
        if (!done && !abortRef.current) {
          done = true;
          setSections([]);
          setLoading(false);
        }
      }
    };

    // Race: both run simultaneously, first valid result wins
    Promise.all([supabaseLoad(), localLoad()]).then(() => {
      if (!done && !abortRef.current) {
        setError("לא ניתן לטעון — בדוק חיבור אינטרנט");
        setLoading(false);
      }
    });

    return () => { abortRef.current = true; };
  }, [nusach, catId]);

  return { sections, catName, loading, error, source };
}

/**
 * useSiddurCategories
 * Returns the available categories for a nusach.
 * Races Supabase vs local JSON — whichever has valid data first wins.
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
    let done      = false;
    setLoading(true);

    const commit = (cats: { id: string; name: string }[]) => {
      if (done || cancelled) return;
      done = true;
      catListCache[nusach] = cats;
      setCategories(cats);
      setLoading(false);
    };

    // ── Supabase ──────────────────────────────────────────────
    const supabaseLoad = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rows } = await (supabase as any)
          .from("siddur")
          .select("category, cat_name, section_idx")
          .eq("nusach", nusach)
          .eq("section_idx", 0);
        if (rows && rows.length > 0) {
          commit(
            rows
              .map((r: { category: string; cat_name: string }) => ({ id: r.category, name: r.cat_name }))
              .sort((a: { id: string }, b: { id: string }) =>
                CATEGORIES_ORDER.indexOf(a.id) - CATEGORIES_ORDER.indexOf(b.id),
              ),
          );
        }
      } catch { /* fall through */ }
    };

    // ── Local JSON ────────────────────────────────────────────
    const localLoad = async () => {
      const nusachData = await loadLocalNusach(nusach);
      if (!nusachData) return;
      commit(
        CATEGORIES_ORDER
          .filter(k => nusachData[k] && nusachData[k].sections.length > 0)
          .map(k => ({ id: k, name: nusachData[k].name })),
      );
    };

    // Race: both run simultaneously
    Promise.all([supabaseLoad(), localLoad()]).then(() => {
      if (!done && !cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [nusach]);

  return { categories, loading };
}

/**
 * useTehillimData
 * Loads all 150 chapters.
 * Races Supabase + local JSON — first valid result wins.
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

    let done = false;

    const commit = (map: TehillimMap, src: "supabase" | "local") => {
      if (done) return;
      done = true;
      tehillimCache = map;
      setTehillim(map);
      setSource(src);
      setLoading(false);
    };

    // ── Supabase ──────────────────────────────────────────────
    const supabaseLoad = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rows, error: sbErr } = await (supabase as any)
          .from("tehillim")
          .select("chapter, title, lines")
          .order("chapter");
        if (!sbErr && rows && rows.length > 0) {
          const map: TehillimMap = {};
          for (const r of rows) {
            map[String(r.chapter)] = { chapter: r.chapter, title: r.title, lines: r.lines as string[] };
          }
          commit(map, "supabase");
        }
      } catch { /* fall through */ }
    };

    // ── Local JSON ────────────────────────────────────────────
    const localLoad = async () => {
      try {
        const key = "../data/tehillim.json";
        const importer = TEHILLIM_FILE[key];
        if (!importer) return;
        const mod = await importer();
        commit(mod.default, "local");
      } catch { /* ignore */ }
    };

    // Race: both run simultaneously
    Promise.all([supabaseLoad(), localLoad()]).then(() => {
      if (!done) setLoading(false);
    });
  }, []);

  return { tehillim, loading, source };
}
