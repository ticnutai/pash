type TraceHandle = {
  stop: () => void;
};

declare global {
  interface Window {
    __pashTraceHandle?: TraceHandle;
  }
}

const TRACE_KEY = "debug-font-trace";

function shouldEnableTrace() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("traceFonts") === "1") return true;
    if (localStorage.getItem(TRACE_KEY) === "true") return true;
  } catch {
    // ignore
  }
  return import.meta.env.DEV;
}

function nowSeconds(start: number) {
  return ((performance.now() - start) / 1000).toFixed(1);
}

function checkFontLoaded(family: string) {
  if (!("fonts" in document)) return false;
  try {
    return document.fonts.check(`16px "${family}"`);
  } catch {
    return false;
  }
}

export function installStartupDiagnostics() {
  if (typeof window === "undefined") return;
  if (!shouldEnableTrace()) return;
  if (window.__pashTraceHandle) return;

  const start = performance.now();
  const trackedFonts = [
    "David Libre",
    "Frank Ruhl Libre",
    "Noto Serif Hebrew",
    "Miriam Libre",
    "Rubik",
  ];

  const log = (event: string, details?: Record<string, unknown>) => {
    const payload = {
      t: `${nowSeconds(start)}s`,
      event,
      ...(details || {}),
    };
    console.log("[startup-trace]", payload);
  };

  log("trace-start", {
    href: window.location.href,
    readyState: document.readyState,
    online: navigator.onLine,
    swControlled: !!navigator.serviceWorker?.controller,
  });

  const fontFaceSet = (document as Document & { fonts?: FontFaceSet }).fonts;
  const onLoading = () => log("fonts-loading", { status: fontFaceSet?.status ?? "unknown" });
  const onLoadingDone = () => {
    const loaded = trackedFonts.filter(checkFontLoaded);
    const missing = trackedFonts.filter((f) => !checkFontLoaded(f));
    log("fonts-loadingdone", { loaded, missing });
  };
  const onLoadingError = () => log("fonts-loadingerror");

  if (fontFaceSet) {
    fontFaceSet.addEventListener("loading", onLoading as EventListener);
    fontFaceSet.addEventListener("loadingdone", onLoadingDone as EventListener);
    fontFaceSet.addEventListener("loadingerror", onLoadingError as EventListener);
  }

  const onSWControllerChange = () => {
    log("sw-controllerchange", {
      hasController: !!navigator.serviceWorker.controller,
    });
  };
  navigator.serviceWorker?.addEventListener("controllerchange", onSWControllerChange);

  const onPageShow = (e: PageTransitionEvent) => log("pageshow", { persisted: e.persisted });
  const onVisibility = () => log("visibility", { state: document.visibilityState });
  const onLoad = () => log("window-load");
  window.addEventListener("pageshow", onPageShow);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("load", onLoad);

  let cls = 0;
  const perfObservers: PerformanceObserver[] = [];

  const safeObserve = (type: "paint" | "largest-contentful-paint" | "layout-shift" | "longtask") => {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (type === "layout-shift") {
            const ls = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
            if (!ls.hadRecentInput && typeof ls.value === "number") {
              cls += ls.value;
              log("cls-update", { cls: Number(cls.toFixed(4)) });
            }
            continue;
          }

          log(`perf-${type}`, {
            name: entry.name,
            startTime: Number(entry.startTime.toFixed(1)),
            duration: Number(entry.duration.toFixed(1)),
          });
        }
      });
      observer.observe({ type, buffered: true });
      perfObservers.push(observer);
    } catch {
      // unsupported in this browser
    }
  };

  safeObserve("paint");
  safeObserve("largest-contentful-paint");
  safeObserve("layout-shift");
  safeObserve("longtask");

  let ticks = 0;
  const intervalId = window.setInterval(() => {
    ticks += 1;
    const resources = performance.getEntriesByType("resource");
    const googleCss = resources.filter((r) => r.name.includes("fonts.googleapis.com/css2"));
    const googleFiles = resources.filter((r) => r.name.includes("fonts.gstatic.com"));

    log("tick", {
      tick: ticks,
      readyState: document.readyState,
      fontStatus: fontFaceSet?.status ?? "unknown",
      loadedFonts: trackedFonts.filter(checkFontLoaded),
      missingFonts: trackedFonts.filter((f) => !checkFontLoaded(f)),
      googleCssReq: googleCss.length,
      googleFontFilesReq: googleFiles.length,
      swControlled: !!navigator.serviceWorker?.controller,
    });

    if (ticks >= 45) {
      stop();
    }
  }, 1000);

  const stop = () => {
    window.clearInterval(intervalId);
    if (fontFaceSet) {
      fontFaceSet.removeEventListener("loading", onLoading as EventListener);
      fontFaceSet.removeEventListener("loadingdone", onLoadingDone as EventListener);
      fontFaceSet.removeEventListener("loadingerror", onLoadingError as EventListener);
    }
    navigator.serviceWorker?.removeEventListener("controllerchange", onSWControllerChange);
    window.removeEventListener("pageshow", onPageShow);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("load", onLoad);
    perfObservers.forEach((o) => o.disconnect());
    log("trace-stop", { cls: Number(cls.toFixed(4)) });
    delete window.__pashTraceHandle;
  };

  window.__pashTraceHandle = { stop };
}
