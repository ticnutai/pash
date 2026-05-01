/**
 * MetaSyncInitializer — runs once on login and syncs cloud user_metadata
 * (omer auto-open, dev feature flags) to localStorage so all pages can
 * read the correct value immediately, without waiting for Settings to open.
 */
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const DEV_CHAT_ENABLED_KEY = "dev-chat-widget-enabled";
const DEV_SCREENSHOT_ENABLED_KEY = "dev-screenshot-tool-enabled";
const DEV_FLOATING_ENABLED_KEY = "dev-floating-buttons-enabled";

export const DEV_FEATURES_EVENT = "dev-features:changed";
export const OMER_SETTINGS_EVENT = "omer-settings:synced";

export function MetaSyncInitializer() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    supabase.auth.getUser().then(({ data: { user: freshUser } }) => {
      if (!freshUser) return;
      const meta = freshUser.user_metadata ?? {};

      let devChanged = false;

      const syncDevFlag = (metaKey: string, lsKey: string) => {
        const cloudVal = meta[metaKey];
        const cloudTs = Number(meta[metaKey + "_ts"]) || 0;
        const localTs = Number(localStorage.getItem(lsKey + "-ts")) || 0;
        if (cloudVal !== true && cloudVal !== false) return;
        if (cloudTs >= localTs) {
          localStorage.setItem(lsKey, String(cloudVal));
          localStorage.setItem(lsKey + "-ts", String(cloudTs));
          devChanged = true;
        }
      };

      syncDevFlag("dev_floating_enabled", DEV_FLOATING_ENABLED_KEY);
      syncDevFlag("dev_chat_enabled", DEV_CHAT_ENABLED_KEY);
      syncDevFlag("dev_screenshot_enabled", DEV_SCREENSHOT_ENABLED_KEY);

      if (devChanged) {
        window.dispatchEvent(new CustomEvent(DEV_FEATURES_EVENT));
      }

      // Sync omer auto-open
      const cloudOmerVal = meta.omer_auto_open;
      const cloudOmerTs = Number(meta.omer_auto_open_ts) || 0;
      const localOmerTs = Number(localStorage.getItem("omer-auto-open-ts")) || 0;

      if (
        (cloudOmerVal === true || cloudOmerVal === false) &&
        cloudOmerTs >= localOmerTs
      ) {
        localStorage.setItem("omer-auto-open", String(cloudOmerVal));
        localStorage.setItem("omer-auto-open-ts", String(cloudOmerTs));
        window.dispatchEvent(new CustomEvent(OMER_SETTINGS_EVENT));
      }
    }).catch(() => {});
  }, [user?.id]);

  return null;
}
