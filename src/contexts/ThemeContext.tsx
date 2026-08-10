import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSyncedState } from "@/hooks/useSyncedState";
import { supabase } from "@/integrations/supabase/client";

export type Theme = "classic" | "royal-gold" | "elegant-night" | "ancient-scroll" | "light" | "gold-silver" | "custom";

export interface CustomAppTheme {
  name: string;
  background: string;
  foreground: string;
  card: string;
  primary: string;
  accent: string;
  sidebar: string;
  sidebarForeground: string;
}

const CUSTOM_THEME_KEY = "torah-custom-theme";
const defaultCustomTheme: CustomAppTheme = {
  name: "הערכה שלי", background: "#f8f6f1", foreground: "#17233d", card: "#ffffff",
  primary: "#173665", accent: "#e9b51f", sidebar: "#142c55", sidebarForeground: "#fff8e6",
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  customTheme: CustomAppTheme;
  saveCustomTheme: (theme: CustomAppTheme) => Promise<void>;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [customTheme, setCustomTheme] = useState<CustomAppTheme>(() => {
    try { return { ...defaultCustomTheme, ...JSON.parse(localStorage.getItem(CUSTOM_THEME_KEY) || "{}") }; }
    catch { return defaultCustomTheme; }
  });

  const { data: theme, setData: setThemeData, status } = useSyncedState<Theme>({
    localStorageKey: "torah-theme",
    tableName: "user_settings",
    column: "theme",
    userId,
    syncToCloud: !!userId,
    defaultValue: "classic",
  });

  useEffect(() => {
    document.documentElement.classList.remove("classic", "royal-gold", "elegant-night", "ancient-scroll", "light", "gold-silver", "custom");
    document.documentElement.classList.add(theme);
    if (theme !== "custom") return;
    const root = document.documentElement;
    const hexToHsl = (hex: string) => {
      const raw = hex.replace("#", "");
      const r = parseInt(raw.slice(0, 2), 16) / 255, g = parseInt(raw.slice(2, 4), 16) / 255, b = parseInt(raw.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      let h = 0; const l = (max + min) / 2; const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      if (d) { if (max === r) h = 60 * (((g - b) / d) % 6); else if (max === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
      if (h < 0) h += 360;
      return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    const vars: Record<string, string> = {
      "--background": customTheme.background, "--foreground": customTheme.foreground,
      "--card": customTheme.card, "--card-foreground": customTheme.foreground,
      "--popover": customTheme.card, "--popover-foreground": customTheme.foreground,
      "--primary": customTheme.primary, "--primary-foreground": customTheme.sidebarForeground,
      "--accent": customTheme.accent, "--accent-foreground": customTheme.foreground,
      "--secondary": customTheme.card, "--secondary-foreground": customTheme.foreground,
      "--muted": customTheme.card, "--muted-foreground": customTheme.foreground,
      "--border": customTheme.accent, "--input": customTheme.accent, "--ring": customTheme.accent,
      "--sidebar-background": customTheme.sidebar, "--sidebar-foreground": customTheme.sidebarForeground,
      "--sidebar-primary": customTheme.accent, "--sidebar-primary-foreground": customTheme.foreground,
      "--sidebar-accent": customTheme.primary, "--sidebar-accent-foreground": customTheme.sidebarForeground,
      "--sidebar-border": customTheme.primary, "--sidebar-ring": customTheme.accent,
    };
    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, hexToHsl(value)));
    return () => Object.keys(vars).forEach(key => root.style.removeProperty(key));
  }, [theme, customTheme]);

  useEffect(() => {
    if (!user) return;
    const cloud = user.user_metadata?.custom_app_theme;
    if (cloud && typeof cloud === "object") {
      const next = { ...defaultCustomTheme, ...cloud } as CustomAppTheme;
      setCustomTheme(next);
      localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(next));
    }
  }, [user?.id]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeData(newTheme);
  }, [setThemeData]);

  const saveCustomTheme = useCallback(async (next: CustomAppTheme) => {
    setCustomTheme(next);
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(next));
    if (user) {
      const { error } = await supabase.auth.updateUser({ data: { ...user.user_metadata, custom_app_theme: next } });
      if (error) throw error;
    }
  }, [user]);

  const value = useMemo(() => ({ theme, setTheme, customTheme, saveCustomTheme, syncStatus: status }), [theme, setTheme, customTheme, saveCustomTheme, status]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
