import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ──────────────────────────────────────────────── */

const STORAGE_KEY = "omer_custom_themes_v1";
const ACTIVE_KEY = "omer_active_theme_v1";
const TYPO_KEY = "omer-typography-v1";

export interface OmerTypography {
  fontSize: number;
  subFontSize: number;
  cardGap: number;
  cardPadding: number;
  lineHeight: number;
}

export const DEFAULT_TYPOGRAPHY: OmerTypography = {
  fontSize: 14,
  subFontSize: 11,
  cardGap: 10,
  cardPadding: 12,
  lineHeight: 1.4,
};

export interface OmerThemeColors {
  boardBg: string;
  card: string;
  today: string;
  header: string;
  dialogBorder: string;
  dialogBg: string;
  textColor: string;
  textMuted: string;
  accentColor: string;
  borderRadius?: number;      // px, default 8
  cardShadow?: 'none' | 'sm' | 'md' | 'lg';  // default 'none'
}

export interface OmerTheme {
  id: string;
  name: string;
  builtIn: boolean;
  colors: OmerThemeColors;
}

/* ─── Built-in themes ────────────────────────────────────── */

export const BUILT_IN_THEMES: OmerTheme[] = [
  {
    id: "classic", name: "קלאסי", builtIn: true,
    colors: {
      boardBg: "bg-white",
      card: "border-[#D6B66A]/70 bg-white",
      today: "border-[#C8A44D] bg-[#F7F1E1] ring-2 ring-[#C8A44D]/60",
      header: "bg-[#F7F1E1]",
      dialogBorder: "border-[#C8A44D]",
      dialogBg: "bg-white",
      textColor: "text-[#0B1F4A]",
      textMuted: "text-[#0B1F4A]/70",
      accentColor: "#C8A44D",
    },
  },
  {
    id: "parchment", name: "קלף", builtIn: true,
    colors: {
      boardBg: "bg-[#FFFDF7]",
      card: "border-[#B89B57]/70 bg-[#FFFCF0]",
      today: "border-[#B89B57] bg-[#F2E7C9] ring-2 ring-[#B89B57]/60",
      header: "bg-[#EFE4C8]",
      dialogBorder: "border-[#B89B57]",
      dialogBg: "bg-[#FFFDF7]",
      textColor: "text-[#3B2F1A]",
      textMuted: "text-[#3B2F1A]/70",
      accentColor: "#B89B57",
    },
  },
  {
    id: "clean", name: "נקי", builtIn: true,
    colors: {
      boardBg: "bg-white",
      card: "border-[#CBD5E1] bg-[#F8FAFC]",
      today: "border-[#64748B] bg-[#E2E8F0] ring-2 ring-[#64748B]/50",
      header: "bg-[#EEF2F7]",
      dialogBorder: "border-[#CBD5E1]",
      dialogBg: "bg-white",
      textColor: "text-[#1E293B]",
      textMuted: "text-[#64748B]",
      accentColor: "#64748B",
    },
  },
  {
    id: "golden", name: "זהב מלכותי", builtIn: true,
    colors: {
      boardBg: "bg-gradient-to-b from-[#1A0F00] to-[#2D1A00]",
      card: "border-[#DAA520]/60 bg-gradient-to-br from-[#2D1A00] to-[#3D2400] shadow-md shadow-[#DAA520]/10",
      today: "border-[#FFD700] bg-gradient-to-br from-[#3D2400] to-[#4D2E00] ring-2 ring-[#FFD700]/70 shadow-lg shadow-[#FFD700]/20",
      header: "bg-gradient-to-r from-[#2D1A00] to-[#3D2400]",
      dialogBorder: "border-[#DAA520]",
      dialogBg: "bg-gradient-to-b from-[#1A0F00] to-[#2D1A00]",
      textColor: "text-[#F5DEB3]",
      textMuted: "text-[#DAA520]/80",
      accentColor: "#FFD700",
    },
  },
  {
    id: "dark", name: "לילה", builtIn: true,
    colors: {
      boardBg: "bg-[#0F172A]",
      card: "border-[#334155] bg-[#1E293B]",
      today: "border-[#60A5FA] bg-[#1E3A5F] ring-2 ring-[#60A5FA]/50 shadow-lg shadow-[#60A5FA]/10",
      header: "bg-[#1E293B]",
      dialogBorder: "border-[#334155]",
      dialogBg: "bg-[#0F172A]",
      textColor: "text-[#E2E8F0]",
      textMuted: "text-[#94A3B8]",
      accentColor: "#60A5FA",
    },
  },
  {
    id: "colorful", name: "צבעוני", builtIn: true,
    colors: {
      boardBg: "bg-gradient-to-br from-[#FFF7ED] via-[#FEF3C7] to-[#ECFDF5]",
      card: "border-[#F59E0B]/40 bg-white/80 backdrop-blur-sm",
      today: "border-[#8B5CF6] bg-gradient-to-br from-[#EDE9FE] to-[#FEF3C7] ring-2 ring-[#8B5CF6]/50 shadow-lg",
      header: "bg-gradient-to-r from-[#FEF3C7] to-[#ECFDF5]",
      dialogBorder: "border-[#F59E0B]",
      dialogBg: "bg-gradient-to-br from-[#FFF7ED] via-[#FEF3C7] to-[#ECFDF5]",
      textColor: "text-[#1C1917]",
      textMuted: "text-[#78716C]",
      accentColor: "#8B5CF6",
    },
  },
  {
    id: "white-gold-navy", name: "לבן זהב", builtIn: true,
    colors: {
      boardBg: "bg-white",
      card: "border-[#C8A44D] bg-white",
      today: "border-[#C8A44D] bg-white ring-2 ring-[#C8A44D]/60 shadow-lg shadow-[#C8A44D]/20",
      header: "bg-white",
      dialogBorder: "border-[#C8A44D]",
      dialogBg: "bg-white",
      textColor: "text-[#0A1A3F]",
      textMuted: "text-[#0A1A3F]/60",
      accentColor: "#C8A44D",
    },
  },
  {
    id: "gray-classic", name: "אפור קלאסי", builtIn: true,
    colors: {
      boardBg: "bg-[#1C1C1E]",
      card: "border-[#3A3A3C] bg-[#2C2C2E]",
      today: "border-[#C8A44D] bg-[#2C2C2E] ring-2 ring-[#C8A44D]/50 shadow-lg shadow-[#C8A44D]/10",
      header: "bg-[#2C2C2E]",
      dialogBorder: "border-[#3A3A3C]",
      dialogBg: "bg-[#1C1C1E]",
      textColor: "text-[#E5E5E7]",
      textMuted: "text-[#8E8E93]",
      accentColor: "#C8A44D",
    },
  },
];

/* ─── Persistence ────────────────────────────────────────── */

function loadCustomLocal(): OmerTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveCustomLocal(themes: OmerTheme[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

function loadActiveLocal(): string {
  try {
    return localStorage.getItem(ACTIVE_KEY) ?? "classic";
  } catch { /* ignore */ }
  return "classic";
}

function saveActiveLocal(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

function loadTypoLocal(): OmerTypography {
  try {
    const raw = localStorage.getItem(TYPO_KEY);
    if (raw) return { ...DEFAULT_TYPOGRAPHY, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_TYPOGRAPHY };
}

function saveTypoLocal(typo: OmerTypography) {
  localStorage.setItem(TYPO_KEY, JSON.stringify(typo));
}

async function syncToCloud(customThemes: OmerTheme[], activeId: string, typography?: OmerTypography) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const meta: Record<string, unknown> = {
      ...user.user_metadata,
      omer_custom_themes: customThemes,
      omer_active_theme: activeId,
    };
    if (typography) meta.omer_typography = typography;
    await supabase.auth.updateUser({ data: meta });
  } catch { /* silent */ }
}

async function loadFromCloud(): Promise<{ customThemes: OmerTheme[]; activeId: string; typography?: OmerTypography } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.user_metadata) return null;
    const ct = user.user_metadata.omer_custom_themes as OmerTheme[] | undefined;
    const ai = user.user_metadata.omer_active_theme as string | undefined;
    const tp = user.user_metadata.omer_typography as OmerTypography | undefined;
    if (!ct && !ai && !tp) return null;
    return { customThemes: ct ?? [], activeId: ai ?? "classic", typography: tp };
  } catch {
    return null;
  }
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useOmerThemes() {
  const [customThemes, setCustomThemes] = useState<OmerTheme[]>(() => loadCustomLocal());
  const [activeId, setActiveId] = useState<string>(() => loadActiveLocal());
  const [typography, setTypography] = useState<OmerTypography>(() => loadTypoLocal());

  // All themes: built-in + custom
  const allThemes = [...BUILT_IN_THEMES, ...customThemes];
  const activeTheme = allThemes.find((t) => t.id === activeId) ?? BUILT_IN_THEMES[0];

  // Cloud sync on load
  useEffect(() => {
    const applyCloud = (cloud: { customThemes: OmerTheme[]; activeId: string; typography?: OmerTypography } | null) => {
      if (!cloud) return;
      if (cloud.customThemes.length > 0) {
        setCustomThemes(cloud.customThemes);
        saveCustomLocal(cloud.customThemes);
      }
      if (cloud.activeId) {
        setActiveId(cloud.activeId);
        saveActiveLocal(cloud.activeId);
      }
      if (cloud.typography) {
        setTypography(cloud.typography);
        saveTypoLocal(cloud.typography);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;
      loadFromCloud().then(applyCloud);
    });
    loadFromCloud().then(applyCloud);
    return () => subscription.unsubscribe();
  }, []);

  const persist = useCallback((themes: OmerTheme[], active: string, typo?: OmerTypography) => {
    saveCustomLocal(themes);
    saveActiveLocal(active);
    syncToCloud(themes, active, typo);
  }, []);

  const selectTheme = useCallback((id: string) => {
    setActiveId(id);
    saveActiveLocal(id);
    syncToCloud(customThemes, id, typography);
  }, [customThemes, typography]);

  const addCustomTheme = useCallback((theme: Omit<OmerTheme, "id" | "builtIn">) => {
    const newTheme: OmerTheme = {
      ...theme,
      id: "custom_" + Math.random().toString(36).slice(2, 10),
      builtIn: false,
    };
    setCustomThemes((prev) => {
      const next = [...prev, newTheme];
      persist(next, activeId);
      return next;
    });
    return newTheme.id;
  }, [persist, activeId]);

  const updateCustomTheme = useCallback((id: string, partial: Partial<Pick<OmerTheme, "name" | "colors">>) => {
    setCustomThemes((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...partial } : t));
      persist(next, activeId);
      return next;
    });
  }, [persist, activeId]);

  const removeCustomTheme = useCallback((id: string) => {
    setCustomThemes((prev) => {
      const next = prev.filter((t) => t.id !== id);
      const newActiveId = activeId === id ? "classic" : activeId;
      persist(next, newActiveId);
      if (activeId === id) setActiveId("classic");
      return next;
    });
  }, [persist, activeId]);

  const duplicateTheme = useCallback((id: string) => {
    const source = allThemes.find((t) => t.id === id);
    if (!source) return;
    return addCustomTheme({
      name: source.name + " (עותק)",
      colors: { ...source.colors },
    });
  }, [allThemes, addCustomTheme]);

  const updateTypography = useCallback((key: keyof OmerTypography, value: number) => {
    setTypography((prev) => {
      const next = { ...prev, [key]: value };
      saveTypoLocal(next);
      syncToCloud(customThemes, activeId, next);
      return next;
    });
  }, [customThemes, activeId]);

  const resetTypography = useCallback(() => {
    setTypography({ ...DEFAULT_TYPOGRAPHY });
    saveTypoLocal(DEFAULT_TYPOGRAPHY);
    syncToCloud(customThemes, activeId, DEFAULT_TYPOGRAPHY);
  }, [customThemes, activeId]);

  return {
    allThemes,
    customThemes,
    activeTheme,
    activeId,
    selectTheme,
    addCustomTheme,
    updateCustomTheme,
    removeCustomTheme,
    duplicateTheme,
    typography,
    updateTypography,
    resetTypography,
  };
}
