import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSyncedState } from "@/hooks/useSyncedState";

export type DisplayMode = "full" | "verses-only" | "verses-questions" | "minimized" | "compact" | "scroll";

export interface DisplaySettings {
  mode: DisplayMode;
  pasukCount: number;
}

interface DisplayModeContextType {
  displaySettings: DisplaySettings;
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
}

const defaultSettings: DisplaySettings = {
  mode: "scroll",
  pasukCount: 10,
};

const DisplayModeContext = createContext<DisplayModeContextType | undefined>(undefined);

export const DisplayModeProvider = ({ children }: { children: ReactNode }) => {
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

  const { data: displaySettings, setData: setDisplaySettingsData, status } = useSyncedState<DisplaySettings>({
    localStorageKey: "torah-display-settings",
    tableName: "user_settings",
    column: "display_settings",
    userId,
    syncToCloud: !!userId,
    defaultValue: defaultSettings,
  });

  const updateDisplaySettings = (settings: Partial<DisplaySettings>) => {
    setDisplaySettingsData((prev) => ({ ...prev, ...settings }));
  };

  // Safety layer: ensure displaySettings always has valid structure
  const safeDisplaySettings: DisplaySettings = {
    mode: displaySettings?.mode || defaultSettings.mode,
    pasukCount: displaySettings?.pasukCount || defaultSettings.pasukCount,
  };

  return (
    <DisplayModeContext.Provider value={{ displaySettings: safeDisplaySettings, updateDisplaySettings, syncStatus: status }}>
      {children}
    </DisplayModeContext.Provider>
  );
};

export const useDisplayMode = () => {
  const context = useContext(DisplayModeContext);
  if (!context) {
    throw new Error("useDisplayMode must be used within DisplayModeProvider");
  }
  return context;
};
