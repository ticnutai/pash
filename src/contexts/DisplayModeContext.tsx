import { createContext, useContext, useMemo, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data: displaySettings, setData: setDisplaySettingsData, status } = useSyncedState<DisplaySettings>({
    localStorageKey: "torah-display-settings",
    tableName: "user_settings",
    column: "display_settings",
    userId,
    syncToCloud: !!userId,
    defaultValue: defaultSettings,
  });

  const updateDisplaySettings = useCallback((settings: Partial<DisplaySettings>) => {
    setDisplaySettingsData((prev) => ({ ...prev, ...settings }));
  }, [setDisplaySettingsData]);

  // Safety layer: ensure displaySettings always has valid structure
  const safeDisplaySettings: DisplaySettings = useMemo(() => ({
    mode: displaySettings?.mode || defaultSettings.mode,
    pasukCount: displaySettings?.pasukCount || defaultSettings.pasukCount,
  }), [displaySettings]);

  const value = useMemo(() => ({ displaySettings: safeDisplaySettings, updateDisplaySettings, syncStatus: status }), [safeDisplaySettings, updateDisplaySettings, status]);

  return (
    <DisplayModeContext.Provider value={value}>
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
