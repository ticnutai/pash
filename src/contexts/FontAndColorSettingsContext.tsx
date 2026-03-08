import { createContext, useContext, useMemo, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSyncedState } from "@/hooks/useSyncedState";
import { useDevice } from "@/contexts/DeviceContext";

// ... keep existing code (FontAndColorSettings interface - lines 5-47)
export interface FontAndColorSettings {
  // Pasuk
  pasukFont: string;
  pasukSize: number;
  pasukColor: string;
  pasukBold: boolean;
  
  // Title/Header
  titleFont: string;
  titleSize: number;
  titleColor: string;
  titleBold: boolean;
  
  // Question
  questionFont: string;
  questionSize: number;
  questionColor: string;
  questionBold: boolean;
  
  // Answer
  answerFont: string;
  answerSize: number;
  answerColor: string;
  answerBold: boolean;
  
  // Commentary
  commentaryFont: string;
  commentarySize: number;
  commentaryColor: string;
  commentaryBold: boolean;
  commentaryLineHeight: "normal" | "relaxed" | "loose";
  commentaryMaxWidth: "narrow" | "medium" | "wide" | "full";
  
  // Display Settings
  textAlignment: "right" | "center" | "left";
  contentSpacing: "compact" | "normal" | "comfortable" | "spacious" | "custom";
  contentSpacingCustom: number;
  lineHeight: "tight" | "normal" | "relaxed" | "loose" | "custom";
  lineHeightCustom: number;
  contentWidth: "narrow" | "normal" | "wide" | "full";
  letterSpacing: "tight" | "normal" | "wide" | "wider" | "custom";
  letterSpacingCustom: number;
  
  // Dynamic Zoom
  fontScale: number;
}

interface FontAndColorSettingsContextType {
  settings: FontAndColorSettings;
  updateSettings: (settings: Partial<FontAndColorSettings>) => void;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
}

const defaultSettings: FontAndColorSettings = {
  pasukFont: "David Libre",
  pasukSize: 18,
  pasukColor: "#1a1a1a",
  pasukBold: false,
  titleFont: "David Libre",
  titleSize: 16,
  titleColor: "#2563eb",
  titleBold: true,
  questionFont: "David Libre",
  questionSize: 16,
  questionColor: "#1a1a1a",
  questionBold: false,
  answerFont: "David Libre",
  answerSize: 14,
  answerColor: "#666666",
  answerBold: false,
  commentaryFont: "David Libre",
  commentarySize: 18,
  commentaryColor: "#2d2d2d",
  commentaryBold: false,
  commentaryLineHeight: "relaxed",
  commentaryMaxWidth: "medium",
  textAlignment: "right",
  contentSpacing: "normal",
  contentSpacingCustom: 1,
  lineHeight: "normal",
  lineHeightCustom: 1.5,
  contentWidth: "normal",
  letterSpacing: "normal",
  letterSpacingCustom: 0,
  fontScale: 1,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeSettings = (settings: FontAndColorSettings): FontAndColorSettings => ({
  ...settings,
  pasukSize: clamp(Number(settings.pasukSize || defaultSettings.pasukSize), 8, 32),
  titleSize: clamp(Number(settings.titleSize || defaultSettings.titleSize), 8, 28),
  questionSize: clamp(Number(settings.questionSize || defaultSettings.questionSize), 8, 28),
  answerSize: clamp(Number(settings.answerSize || defaultSettings.answerSize), 8, 24),
  commentarySize: clamp(Number(settings.commentarySize || defaultSettings.commentarySize), 8, 24),
  fontScale: clamp(Number(settings.fontScale || defaultSettings.fontScale), 0.6, 1.8),
});

const FontAndColorSettingsContext = createContext<FontAndColorSettingsContextType | undefined>(undefined);

export const FontAndColorSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { isMobile } = useDevice();

  // Use device-specific column and localStorage key
  const column = isMobile ? "font_settings_mobile" : "font_settings";
  const localStorageKey = isMobile ? "torah-font-color-settings-mobile" : "torah-font-color-settings";

  const { data: settings, setData: setSettingsData, status } = useSyncedState<FontAndColorSettings>({
    localStorageKey,
    tableName: "user_settings",
    column,
    userId,
    syncToCloud: !!userId,
    defaultValue: defaultSettings,
  });

  const normalizedSettings = useMemo(() => normalizeSettings(settings), [settings]);

  const updateSettings = useCallback((newSettings: Partial<FontAndColorSettings>) => {
    setSettingsData((prev) => normalizeSettings({ ...prev, ...newSettings }));
  }, [setSettingsData]);

  const value = useMemo(() => ({ settings: normalizedSettings, updateSettings, syncStatus: status }), [normalizedSettings, updateSettings, status]);

  return (
    <FontAndColorSettingsContext.Provider value={value}>
      {children}
    </FontAndColorSettingsContext.Provider>
  );
};

export const useFontAndColorSettings = () => {
  const context = useContext(FontAndColorSettingsContext);
  if (!context) {
    throw new Error("useFontAndColorSettings must be used within FontAndColorSettingsProvider");
  }
  return context;
};
