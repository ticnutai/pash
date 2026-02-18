import { SEFARIA_BOOK_NAMES, MEFARESH_MAPPING, AVAILABLE_COMMENTARIES, SefariaCommentary } from "@/types/sefaria";
import { supabase } from "@/integrations/supabase/client";
import { torahDB } from "@/utils/torahDB";

// Cache for loaded commentaries to improve performance
const commentaryCache = new Map<string, any>();

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
 * Load a specific commentary from local Sefaria data
 * Uses 3-tier cache: memory → IndexedDB → dynamic import
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
  } catch (e) {}

  try {
    // Tier 3: Dynamic import of the commentary file
    const data = await import(`@/data/sefaria/${mefareshEn}_on_${sefer}.json`);
    const result = data.default || data;
    commentaryCache.set(cacheKey, result);
    // Save to IndexedDB for next time
    torahDB.saveCommentary(cacheKey, result).catch(() => {});
    return result;
  } catch (error) {
    console.warn(`Commentary not found: ${mefareshEn} on ${sefer}`, error);
    return null;
  }
};

/**
 * Fetch a single commentary from Sefaria API via edge function
 */
const fetchCommentaryFromAPI = async (
  book: string,
  commentaryName: string,
  chapter: number,
  verse: number
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-sefaria', {
      body: {
        commentaryName,
        book,
        chapter,
        verse
      }
    });

    if (error) {
      console.warn(`Error fetching ${commentaryName} from API:`, error);
      return null;
    }

    return data?.text || null;
  } catch (error) {
    console.warn(`Failed to fetch ${commentaryName} from Sefaria:`, error);
    return null;
  }
};

/**
 * Get available commentaries for a specific verse
 * First tries local files, then falls back to Sefaria API
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
        // Try loading from local files first
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

        // If local data not found, fetch from Sefaria API
        console.log(`Fetching ${commentary.hebrew} from Sefaria API...`);
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
        console.warn(`Error loading ${commentary.english}:`, error);
        return null;
      }
    })
  );
  
  return results.filter((c): c is SefariaCommentary => c !== null && c.text?.length > 0);
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
  
  return `https://www.sefaria.org/${mefareshEn}_on_${sefer}.${perek}.${pasuk}?lang=he`;
};

/**
 * Clear the commentary cache (useful for memory management)
 */
export const clearCommentaryCache = () => {
  commentaryCache.clear();
};
