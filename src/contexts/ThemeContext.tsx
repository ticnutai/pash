import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSyncedState } from "@/hooks/useSyncedState";

export type Theme = "classic" | "royal-gold" | "elegant-night" | "ancient-scroll" | "light" | "gold-silver";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: theme, setData: setThemeData, status } = useSyncedState<Theme>({
    localStorageKey: "torah-theme",
    tableName: "user_settings",
    column: "theme",
    userId,
    syncToCloud: !!userId,
    defaultValue: "classic",
  });

  useEffect(() => {
    document.documentElement.classList.remove("classic", "royal-gold", "elegant-night", "ancient-scroll", "light", "gold-silver");
    document.documentElement.classList.add(theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeData(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, syncStatus: status }}>
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
