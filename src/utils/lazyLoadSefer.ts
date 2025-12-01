import { Sefer } from "@/types/torah";

/**
 * Lazy load sefer data only when needed
 * Returns a promise that resolves to the sefer data
 */
export const lazyLoadSefer = async (seferId: number): Promise<Sefer> => {
  console.log(`[LazyLoad] 📚 Loading sefer ${seferId}`);
  
  let module;
  switch (seferId) {
    case 1:
      module = await import("@/data/bereishit.json");
      break;
    case 2:
      module = await import("@/data/shemot.json");
      break;
    case 3:
      module = await import("@/data/vayikra.json");
      break;
    case 4:
      module = await import("@/data/bamidbar.json");
      break;
    case 5:
      module = await import("@/data/devarim.json");
      break;
    default:
      throw new Error(`Unknown sefer ID: ${seferId}`);
  }
  
  console.log(`[LazyLoad] ✅ Sefer ${seferId} loaded successfully`);
  return module.default as Sefer;
};

/**
 * Preload next sefer in background for smooth navigation
 */
export const preloadNextSefer = (currentSeferId: number) => {
  const nextSeferId = currentSeferId < 5 ? currentSeferId + 1 : 1;
  
  // Preload in the background without blocking
  setTimeout(() => {
    console.log(`[LazyLoad] 🔄 Preloading next sefer ${nextSeferId}`);
    lazyLoadSefer(nextSeferId).catch(() => {
      // Silently fail - it's just a preload
    });
  }, 2000); // Wait 2 seconds after initial load
};
