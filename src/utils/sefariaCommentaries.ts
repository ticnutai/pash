import { SEFARIA_BOOK_NAMES, MEFARESH_MAPPING, AVAILABLE_COMMENTARIES, SefariaCommentary } from "@/types/sefaria";
import { supabase } from "@/integrations/supabase/client";
import { torahDB } from "@/utils/torahDB";

// ===== In-memory caches =====
// Full commentary files (keyed by "Genesis-Rashi")
const commentaryCache = new Map<string, any>();
// Per-verse API results (keyed by "Genesis-Rashi-1-1")
const verseCache = new Map<string, string>();

// ===== Rate limiting for API calls =====
const API_DELAY_MS = 150; // minimum ms between API calls
let lastApiCall = 0;

const rateLimitedDelay = async (): Promise<void> => {
  const now = Date.now();
  const elapsed = now - lastApiCall;
  if (elapsed < API_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS - elapsed));
  }
  lastApiCall = Date.now();
};

/**
 * Get the Sefaria book name from internal book ID
 */
export const getSefariaSeferName = (seferId: number): string => {
  const seferMap: Record<number, string> = {
    1: "Genesis",
    2: "Exodus",
    3: "Leviticus",
    4: "Numbers",
    5: "Deuteronomy"
  };
  return seferMap[seferId] || "Genesis";
};

/**
 * Get English sefer name for internal use
 */
export const getEnglishSeferName = (seferId: number): string => {
  const seferMap: Record<number, string> = {
    1: "bereishit",
    2: "shemot",
    3: "vayikra",
    4: "bamidbar",
    5: "devarim"
  };
  return seferMap[seferId] || "bereishit";
};

/**
 * Load a full commentary file from local Sefaria data.
 * Uses 3-tier cache: memory → IndexedDB → dynamic import.
 */
export const loadSefariaCommentary = async (
  sefer: string,
  mefareshEn: string
): Promise<any> => {
  const cacheKey = `${sefer}-${mefareshEn}`;
  
  // Tier 1: Memory cache
  if (commentaryCache.has(cacheKey)) {
    return commentaryCache.get(cacheKey);
  }

  // Tier 2: IndexedDB cache
  try {
    const cached = await torahDB.getCommentary(cacheKey);
    if (cached) {
      commentaryCache.set(cacheKey, cached);
      return cached;
    }
  } catch (e) {
    // IndexedDB read failed, continue to bundle
  }

  try {
    // Tier 3: Dynamic import of the bundled commentary file
    const data = await import(`@/data/sefaria/${mefareshEn}_on_${sefer}.json`);
    const result = data.default || data;
    commentaryCache.set(cacheKey, result);
    // Persist to IndexedDB for offline access
    torahDB.saveCommentary(cacheKey, result).catch(() => {});
    return result;
  } catch {
    // No bundled file exists for this commentary — not an error
    return null;
  }
};

/**
 * Fetch a single commentary from Sefaria API via edge function.
 * Results are cached in memory and IndexedDB.
 */
export const fetchCommentaryFromAPI = async (
  book: string,
  commentaryName: string,
  chapter: number,
  verse: number
): Promise<string | null> => {
  const verseCacheKey = `${book}-${commentaryName}-${chapter}-${verse}`;

  // Tier 1: Memory cache for verse-level results
  if (verseCache.has(verseCacheKey)) {
    return verseCache.get(verseCacheKey)!;
  }

  // Tier 2: IndexedDB per-verse cache
  try {
    const cached = await torahDB.getCommentary(verseCacheKey);
    if (cached && typeof cached === 'string') {
      verseCache.set(verseCacheKey, cached);
      return cached;
    }
  } catch {
    // IndexedDB read failed, continue to API
  }

  // Tier 3: Sefaria API via edge function
  try {
    await rateLimitedDelay();

    const { data, error } = await supabase.functions.invoke('fetch-sefaria', {
      body: { commentaryName, book, chapter, verse }
    });

    if (error) {
      console.warn(`[Sefaria] API error for ${commentaryName}:`, error);
      return null;
    }

    const text = data?.text || null;

    if (text) {
      // Cache in memory and IndexedDB for future access
      verseCache.set(verseCacheKey, text);
      torahDB.saveCommentary(verseCacheKey, text).catch(() => {});
    }

    return text;
  } catch (error) {
    console.warn(`[Sefaria] Failed to fetch ${commentaryName}:`, error);
    return null;
  }
};

/**
 * Get available commentaries for a specific verse.
 * First tries full local files, then falls back to cached API results.
 */
export const getAvailableCommentaries = async (
  seferId: number,
  perek: number,
  pasuk: number
): Promise<SefariaCommentary[]> => {
  const sefer = getSefariaSeferName(seferId);
  
  const results = await Promise.all(
    AVAILABLE_COMMENTARIES.map(async (commentary, index) => {
      try {
        // Try loading from full commentary file (memory/IndexedDB/bundle)
        const localData = await loadSefariaCommentary(sefer, commentary.english);
        
        if (localData) {
          const perekData = localData.text?.[perek - 1];
          const pasukText = perekData?.[pasuk - 1];

          if (pasukText) {
            return {
              id: index + 1000,
              mefaresh: commentary.hebrew,
              mefareshEn: commentary.english,
              text: Array.isArray(pasukText) ? pasukText.join(" ") : pasukText
            };
          }
        }

        // Fallback: fetch from Sefaria API (with caching)
        const apiText = await fetchCommentaryFromAPI(sefer, commentary.english, perek, pasuk);
        
        if (apiText) {
          return {
            id: index + 1000,
            mefaresh: commentary.hebrew,
            mefareshEn: commentary.english,
            text: apiText
          };
        }

        return null;
      } catch (error) {
        console.warn(`[Sefaria] Error loading ${commentary.english}:`, error);
        return null;
      }
    })
  );
  
  return results.filter((c): c is SefariaCommentary => c !== null && c.text?.length > 0);
};

/**
 * Download all available commentaries for all sefarim.
 * Tries bundle first, then API per-verse for each chapter.
 */
export const downloadAllCommentaries = async (
  onProgress?: (completed: number, total: number, current: string) => void
): Promise<void> => {
  const sefarim = [
    { id: 1, name: "Genesis", hebrew: "בראשית" },
    { id: 2, name: "Exodus", hebrew: "שמות" },
    { id: 3, name: "Leviticus", hebrew: "ויקרא" },
    { id: 4, name: "Numbers", hebrew: "במדבר" },
    { id: 5, name: "Deuteronomy", hebrew: "דברים" },
  ];

  const total = sefarim.length * AVAILABLE_COMMENTARIES.length;
  let completed = 0;

  for (const sefer of sefarim) {
    for (const commentary of AVAILABLE_COMMENTARIES) {
      const label = `${commentary.hebrew} על ${sefer.hebrew}`;
      onProgress?.(completed, total, label);
      
      try {
        // Try loading full file (bundle → IndexedDB)
        const data = await loadSefariaCommentary(sefer.name, commentary.english);
        if (!data) {
          // No bundle — try downloading chapter 1 verse 1 via API to verify it exists
          // This caches the result for future offline use
          await fetchCommentaryFromAPI(sefer.name, commentary.english, 1, 1);
        }
      } catch {
        // Skip failures silently — not all combinations have data
      }
      
      completed++;
    }
  }

  onProgress?.(total, total, '');
};

/**
 * Download commentaries for a specific mefaresh across all sefarim.
 * Tries bundle first, then caches API results per-verse.
 */
export const downloadCommentaryByMefaresh = async (
  mefareshEn: string,
  mefareshHebrew: string,
  onProgress?: (completed: number, total: number, current: string) => void
): Promise<void> => {
  const sefarim = [
    { id: 1, name: "Genesis", hebrew: "בראשית" },
    { id: 2, name: "Exodus", hebrew: "שמות" },
    { id: 3, name: "Leviticus", hebrew: "ויקרא" },
    { id: 4, name: "Numbers", hebrew: "במדבר" },
    { id: 5, name: "Deuteronomy", hebrew: "דברים" },
  ];

  const total = sefarim.length;
  let completed = 0;

  for (const sefer of sefarim) {
    onProgress?.(completed, total, `${mefareshHebrew} על ${sefer.hebrew}`);
    
    try {
      const data = await loadSefariaCommentary(sefer.name, mefareshEn);
      if (!data) {
        // Try API for first verse to at least validate and cache
        await fetchCommentaryFromAPI(sefer.name, mefareshEn, 1, 1);
      }
    } catch {
      // Skip failures
    }
    
    completed++;
  }

  onProgress?.(total, total, '');
};

/**
 * Get Sefaria URL for a specific verse
 */
export const getPasukSefariaUrl = (seferId: number, perek: number, pasuk: number): string => {
  const sefer = getSefariaSeferName(seferId);
  return `https://www.sefaria.org/${sefer}.${perek}.${pasuk}?lang=he`;
};

/**
 * Get Sefaria URL for a specific commentary on a verse
 */
export const getMefareshSefariaUrl = (
  seferId: number,
  perek: number,
  pasuk: number,
  mefareshHebrew: string
): string => {
  const sefer = getSefariaSeferName(seferId);
  const mefareshEn = MEFARESH_MAPPING[mefareshHebrew];
  
  if (!mefareshEn) {
    return getPasukSefariaUrl(seferId, perek, pasuk);
  }

  // Onkelos uses a different Sefaria URL format
  if (mefareshEn === "Onkelos") {
    return `https://www.sefaria.org/Onkelos_${sefer}.${perek}.${pasuk}?lang=he`;
  }
  
  return `https://www.sefaria.org/${mefareshEn.replace(/_/g, '_')}_on_${sefer}.${perek}.${pasuk}?lang=he`;
};

/**
 * Clear the commentary caches (memory only — IndexedDB cleared via torahDB)
 */
export const clearCommentaryCache = () => {
  commentaryCache.clear();
  verseCache.clear();
};
