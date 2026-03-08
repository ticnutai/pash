import { useEffect, useState, useRef } from "react";
import { FlatPasuk } from "@/types/torah";
import { supabase } from "@/integrations/supabase/client";

/** Map key: "seferId-perek-pasuk" → rashi text */
export type RashiMap = Map<string, string>;

const rashiKey = (seferId: number, perek: number, pasuk: number) =>
  `${seferId}-${perek}-${pasuk}`;

// In-memory cache across hook instances
const globalCache = new Map<string, RashiMap>();

/**
 * Fetches Rashi commentary from Supabase for all verses in `pesukim`.
 * Falls back to local JSON files (only Bereishit is bundled).
 */
export function useRashi(pesukim: FlatPasuk[], enabled: boolean) {
  const [rashiMap, setRashiMap] = useState<RashiMap>(new Map());
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || pesukim.length === 0) {
      setRashiMap(new Map());
      return;
    }

    // Collect unique (seferId, perek) pairs
    const pairs = new Map<string, { seferId: number; perek: number }>();
    for (const p of pesukim) {
      const k = `${p.sefer}-${p.perek}`;
      if (!pairs.has(k)) pairs.set(k, { seferId: p.sefer, perek: p.perek });
    }

    // Check if everything is already cached
    const merged = new Map<string, string>();
    let allCached = true;
    for (const { seferId, perek } of pairs.values()) {
      const ck = `${seferId}-${perek}`;
      if (globalCache.has(ck)) {
        globalCache.get(ck)!.forEach((v, k) => merged.set(k, v));
      } else {
        allCached = false;
        break;
      }
    }
    if (allCached) {
      setRashiMap(new Map(merged));
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);

    const fetchAll = async () => {
      const result = new Map<string, string>();

      for (const { seferId, perek } of pairs.values()) {
        const ck = `${seferId}-${perek}`;

        if (globalCache.has(ck)) {
          globalCache.get(ck)!.forEach((v, k) => result.set(k, v));
          continue;
        }

        // Try Supabase
        try {
          const { data, error } = await supabase
            .from("rashi_commentary")
            .select("pasuk, text")
            .eq("sefer_id", seferId)
            .eq("perek", perek);

          if (!error && data && data.length > 0) {
            const perekMap = new Map<string, string>();
            for (const row of data) {
              const k = rashiKey(seferId, perek, row.pasuk);
              perekMap.set(k, row.text);
              result.set(k, row.text);
            }
            globalCache.set(ck, perekMap);
            continue;
          }
        } catch {
          // fall through to local file
        }

        // Fallback: local JSON file (only Bereishit / sefer 1 is bundled)
        try {
          const SEFER_NAMES: Record<number, string> = {
            1: "Rashi_on_Genesis",
            2: "Rashi_on_Exodus",
            3: "Rashi_on_Leviticus",
            4: "Rashi_on_Numbers",
            5: "Rashi_on_Deuteronomy",
          };
          const fileName = SEFER_NAMES[seferId];
          if (!fileName) continue;

          const mod = await import(`@/data/sefaria/${fileName}.json`);
          const textArr: (string | string[])[][] = (mod.default || mod).text;
          const perekArr = textArr[perek - 1];
          if (!Array.isArray(perekArr)) continue;

          const perekMap = new Map<string, string>();
          for (let i = 0; i < perekArr.length; i++) {
            const raw = perekArr[i];
            const text = (Array.isArray(raw) ? raw.join(" ") : raw ?? "").replace(/<[^>]+>/g, " ").trim();
            if (!text) continue;
            const k = rashiKey(seferId, perek, i + 1);
            perekMap.set(k, text);
            result.set(k, text);
          }
          globalCache.set(ck, perekMap);
        } catch {
          // No local file — no Rashi for this chapter
          globalCache.set(ck, new Map()); // cache miss to avoid re-fetching
        }
      }

      setRashiMap(result);
      setLoading(false);
    };

    fetchAll();

    return () => {
      abortRef.current?.abort();
    };
  }, [enabled, pesukim]);

  return { rashiMap, loading };
}
