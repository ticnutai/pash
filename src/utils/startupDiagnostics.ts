type TraceHandle = {
  stop: () => void;
};

type OverlaySnapshot = {
  t: string;
  tick: number;
  readyState: string;
  fontStatus: string;
  loadedCount: number;
  missingCount: number;
  googleCssReq: number;
  googleFontFilesReq: number;
  swControlled: boolean;
  cls: number;
  longTasks: number;
  fcpMs: number | null;
  lcpMs: number | null;
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

  let overlayEl: HTMLDivElement | null = null;
  const ensureOverlay = () => {
    if (overlayEl) return overlayEl;
    const panel = document.createElement("div");
    panel.id = "startup-trace-overlay";
    panel.style.position = "fixed";
    panel.style.left = "10px";
    panel.style.bottom = "10px";
    panel.style.zIndex = "2147483647";
    panel.style.background = "rgba(10, 16, 26, 0.92)";
    panel.style.color = "#d9f5ff";
    panel.style.border = "1px solid rgba(76, 188, 255, 0.45)";
    panel.style.borderRadius = "10px";
    panel.style.padding = "10px 12px";
    panel.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    panel.style.fontSize = "11px";
    panel.style.lineHeight = "1.35";
    panel.style.minWidth = "260px";
    panel.style.maxWidth = "45vw";
    panel.style.whiteSpace = "pre";
    panel.style.pointerEvents = "auto";
    panel.style.boxShadow = "0 8px 28px rgba(0,0,0,0.35)";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Stop Trace";
    btn.style.display = "block";
    btn.style.marginBottom = "8px";
    btn.style.padding = "2px 8px";
    btn.style.background = "#123d5f";
    btn.style.border = "1px solid #2a78b0";
    btn.style.color = "#d9f5ff";
    btn.style.borderRadius = "6px";
    btn.style.cursor = "pointer";
    btn.addEventListener("click", () => window.__pashTraceHandle?.stop());

    const body = document.createElement("div");
    body.id = "startup-trace-overlay-body";
    body.textContent = "collecting...";

    panel.appendChild(btn);
    panel.appendChild(body);
    document.body.appendChild(panel);
    overlayEl = panel;
    return panel;
  };

  const renderOverlay = (snapshot: OverlaySnapshot) => {
    const panel = ensureOverlay();
    const body = panel.querySelector("#startup-trace-overlay-body");
    if (!body) return;
    body.textContent = [
      `t=${snapshot.t} tick=${snapshot.tick}`,
      `ready=${snapshot.readyState} sw=${snapshot.swControlled ? "yes" : "no"}`,
      `fonts=${snapshot.fontStatus} loaded=${snapshot.loadedCount} missing=${snapshot.missingCount}`,
      `google css=${snapshot.googleCssReq} files=${snapshot.googleFontFilesReq}`,
      `fcp=${snapshot.fcpMs ?? "-"}ms lcp=${snapshot.lcpMs ?? "-"}ms`,
      `cls=${snapshot.cls.toFixed(4)} longtasks=${snapshot.longTasks}`,
    ].join("\n");
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
  let longTasks = 0;
  let lcpMs: number | null = null;
  let fcpMs: number | null = null;
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

          if (type === "largest-contentful-paint") {
            lcpMs = Number(entry.startTime.toFixed(1));
          }

          if (type === "longtask") {
            longTasks += 1;
          }

          if (type === "paint" && entry.name === "first-contentful-paint") {
            fcpMs = Number(entry.startTime.toFixed(1));
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

    const loadedFonts = trackedFonts.filter(checkFontLoaded);
    renderOverlay({
      t: `${nowSeconds(start)}s`,
      tick: ticks,
      readyState: document.readyState,
      fontStatus: fontFaceSet?.status ?? "unknown",
      loadedCount: loadedFonts.length,
      missingCount: trackedFonts.length - loadedFonts.length,
      googleCssReq: googleCss.length,
      googleFontFilesReq: googleFiles.length,
      swControlled: !!navigator.serviceWorker?.controller,
      cls,
      longTasks,
      fcpMs,
      lcpMs,
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
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    log("trace-stop", { cls: Number(cls.toFixed(4)) });
    delete window.__pashTraceHandle;
  };

  window.__pashTraceHandle = { stop };
}
