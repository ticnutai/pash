import { createContext, useContext, useMemo, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSyncedState } from "@/hooks/useSyncedState";
import { useDevice } from "@/contexts/DeviceContext";

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
  const { isMobile } = useDevice();

  // Use device-specific column and localStorage key
  const column = isMobile ? "display_settings_mobile" : "display_settings";
  const localStorageKey = isMobile ? "torah-display-settings-mobile" : "torah-display-settings";

  const { data: displaySettings, setData: setDisplaySettingsData, status } = useSyncedState<DisplaySettings>({
    localStorageKey,
    tableName: "user_settings",
    column,
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
