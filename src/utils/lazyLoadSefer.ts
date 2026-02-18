import { Sefer } from "@/types/torah";
import { torahDB } from "@/utils/torahDB";

// In-memory cache for instant access
const memoryCache = new Map<number, Sefer>();

const SEFER_NAMES = ['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים'];

/**
 * Lazy load sefer data with 3-tier caching:
 * 1. Memory cache (instant)
 * 2. IndexedDB cache (fast, ~10ms)
 * 3. Bundle import (slower, network/disk)
 */
export const lazyLoadSefer = async (seferId: number): Promise<Sefer> => {
  // Tier 1: Memory cache
  if (memoryCache.has(seferId)) {
    return memoryCache.get(seferId)!;
  }

  // Tier 2: IndexedDB cache
  try {
    const cached = await torahDB.getSefer(seferId);
    if (cached) {
      memoryCache.set(seferId, cached);
      return cached as Sefer;
    }
  } catch (e) {
    // IndexedDB failed, continue to bundle
  }

  // Tier 3: Bundle import
  let module;
  switch (seferId) {
    case 1: module = await import("@/data/bereishit.json"); break;
    case 2: module = await import("@/data/shemot.json"); break;
    case 3: module = await import("@/data/vayikra.json"); break;
    case 4: module = await import("@/data/bamidbar.json"); break;
    case 5: module = await import("@/data/devarim.json"); break;
    default: throw new Error(`Unknown sefer ID: ${seferId}`);
  }

  const data = module.default as Sefer;
  
  // Store in both caches
  memoryCache.set(seferId, data);
  torahDB.saveSefer(seferId, data).catch(() => {});

  return data;
};

/**
 * Preload next sefer in background for smooth navigation
 */
export const preloadNextSefer = (currentSeferId: number) => {
  const nextSeferId = currentSeferId < 5 ? currentSeferId + 1 : 1;
  setTimeout(() => {
    lazyLoadSefer(nextSeferId).catch(() => {});
  }, 2000);
};

/**
 * Download all sefarim for offline use
 */
export const downloadAllSefarim = async (
  onProgress?: (completed: number, total: number, currentName: string) => void
): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    const seferId = i + 1;
    onProgress?.(i, 5, SEFER_NAMES[i]);
    await lazyLoadSefer(seferId);
  }
  onProgress?.(5, 5, '');
};

/**
 * Clear all sefer caches
 */
export const clearAllSeferCache = async () => {
  memoryCache.clear();
  await torahDB.clearSefarim();
};
