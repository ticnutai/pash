import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ──────────────────────────────────────────────── */

const STORAGE_KEY = "omer_checklist_v1";

export interface OmerChecklistData {
  /** Hebrew year the checklist belongs to */
  year: number;
  /** Set of Omer day numbers (1-49) that were marked as counted */
  counted: number[];
}

export interface OmerStats {
  totalCounted: number;
  totalDays: number;
  /** Current consecutive streak ending at today */
  streak: number;
  /** Percentage 0-100 */
  percentage: number;
  /** True if user missed at least one day */
  missedAny: boolean;
  /** First day the user missed (1-49), or null */
  firstMissed: number | null;
}

/* ─── Persistence ────────────────────────────────────────── */

function loadLocal(year: number): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: OmerChecklistData = JSON.parse(raw);
      if (data.year === year) return new Set(data.counted);
    }
  } catch { /* ignore */ }
  return new Set();
}

function saveLocal(year: number, counted: Set<number>) {
  const data: OmerChecklistData = { year, counted: [...counted].sort((a, b) => a - b) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function syncToCloud(year: number, counted: Set<number>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload: OmerChecklistData = { year, counted: [...counted].sort((a, b) => a - b) };
    await supabase.auth.updateUser({
      data: { ...user.user_metadata, omer_checklist: payload },
    });
  } catch { /* silent */ }
}

async function loadFromCloud(year: number): Promise<Set<number> | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.user_metadata?.omer_checklist) return null;
    const data = user.user_metadata.omer_checklist as OmerChecklistData;
    if (data.year !== year) return null;
    return new Set(data.counted);
  } catch {
    return null;
  }
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useOmerChecklist(hebrewYear: number, currentDay: number | null) {
  const [counted, setCounted] = useState<Set<number>>(() => loadLocal(hebrewYear));

  // Cloud sync on load & auth change
  useEffect(() => {
    const applyCloud = (cloud: Set<number> | null) => {
      if (!cloud) return;
      setCounted((prev) => {
        // Merge: cloud ∪ local
        const merged = new Set([...prev, ...cloud]);
        saveLocal(hebrewYear, merged);
        return merged;
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;
      loadFromCloud(hebrewYear).then(applyCloud);
    });
    loadFromCloud(hebrewYear).then(applyCloud);
    return () => subscription.unsubscribe();
  }, [hebrewYear]);

  const toggleDay = useCallback((day: number) => {
    setCounted((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      saveLocal(hebrewYear, next);
      syncToCloud(hebrewYear, next);
      return next;
    });
  }, [hebrewYear]);

  const markDay = useCallback((day: number) => {
    setCounted((prev) => {
      if (prev.has(day)) return prev;
      const next = new Set(prev);
      next.add(day);
      saveLocal(hebrewYear, next);
      syncToCloud(hebrewYear, next);
      return next;
    });
  }, [hebrewYear]);

  const isCounted = useCallback((day: number) => counted.has(day), [counted]);

  const stats: OmerStats = useMemo(() => {
    // Only count days BEFORE today as expected (today hasn't passed yet)
    const maxDay = currentDay ? currentDay - 1 : 0;
    const totalDays = maxDay;
    const totalCounted = [...counted].filter((d) => d <= maxDay).length;

    // Find first missed day (only past days, not today)
    let firstMissed: number | null = null;
    for (let d = 1; d <= maxDay; d++) {
      if (!counted.has(d)) {
        firstMissed = d;
        break;
      }
    }

    // Streak: consecutive counted days ending at currentDay going backwards
    let streak = 0;
    if (currentDay) {
      for (let d = currentDay; d >= 1; d--) {
        if (counted.has(d)) streak++;
        else break;
      }
    }

    return {
      totalCounted,
      totalDays,
      streak,
      percentage: totalDays > 0 ? Math.round((totalCounted / totalDays) * 100) : 0,
      missedAny: firstMissed !== null,
      firstMissed,
    };
  }, [counted, currentDay]);

  return {
    counted,
    toggleDay,
    markDay,
    isCounted,
    stats,
  };
}
