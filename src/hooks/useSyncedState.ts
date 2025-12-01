import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface UseSyncedStateOptions<T> {
  localStorageKey: string;
  tableName?: string;
  column?: string;
  userId?: string | null;
  syncToCloud?: boolean;
  defaultValue: T;
  debounceMs?: number;
}

interface SyncState<T> {
  data: T;
  status: SyncStatus;
  lastSynced: number | null;
}

export function useSyncedState<T>({
  localStorageKey,
  tableName,
  column,
  userId,
  syncToCloud = true,
  defaultValue,
  debounceMs = 1000,
}: UseSyncedStateOptions<T>) {
  const { toast } = useToast();
  const [syncState, setSyncState] = useState<SyncState<T>>(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (!saved) return {
        data: defaultValue,
        status: 'synced' as SyncStatus,
        lastSynced: null,
      };
      
      // Try to parse as JSON, if fails use the raw value (for backward compatibility)
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaultValue to ensure all properties exist
        const merged = typeof parsed === 'object' && parsed !== null && typeof defaultValue === 'object' && defaultValue !== null
          ? { ...defaultValue, ...parsed }
          : parsed;
        return {
          data: merged,
          status: 'synced' as SyncStatus,
          lastSynced: null,
        };
      } catch {
        // If not valid JSON, assume it's a primitive value (string, etc.)
        return {
          data: saved as T,
          status: 'synced' as SyncStatus,
          lastSynced: null,
        };
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return {
        data: defaultValue,
        status: 'synced' as SyncStatus,
        lastSynced: null,
      };
    }
  });

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const syncQueueRef = useRef<T | null>(null);
  const isOnlineRef = useRef(navigator.onLine);

  // Save to localStorage immediately
  const saveToLocalStorage = useCallback((data: T) => {
    localStorage.setItem(localStorageKey, JSON.stringify(data));
  }, [localStorageKey]);

  // Save to Supabase (debounced)
  const saveToCloud = useCallback(async (data: T) => {
    if (!syncToCloud || !userId || !tableName || !column) return;

    try {
      setSyncState(prev => ({ ...prev, status: 'syncing' }));

      const updateData = { [column]: data };
      const { error } = await supabase
        .from(tableName as never)
        .update(updateData as never)
        .eq('user_id', userId);

      if (error) throw error;

      setSyncState(prev => ({
        ...prev,
        status: 'synced',
        lastSynced: Date.now(),
      }));
    } catch (error) {
      console.error('Cloud sync error:', error);
      setSyncState(prev => ({ ...prev, status: 'error' }));
      syncQueueRef.current = data; // Queue for retry
    }
  }, [syncToCloud, userId, tableName, column]);

  // Load from cloud on mount
  useEffect(() => {
    const loadFromCloud = async () => {
      if (!syncToCloud || !userId || !tableName || !column) return;

      try {
        const { data: cloudData, error } = await supabase
          .from(tableName as never)
          .select(column)
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;

        if (cloudData && cloudData[column]) {
          const cloudValue = cloudData[column] as T;
          // Merge with defaultValue to ensure all properties exist
          const merged = typeof cloudValue === 'object' && cloudValue !== null && typeof defaultValue === 'object' && defaultValue !== null
            ? { ...defaultValue, ...cloudValue }
            : cloudValue;
          
          setSyncState({
            data: merged,
            status: 'synced',
            lastSynced: Date.now(),
          });
          saveToLocalStorage(merged);
        }
      } catch (error) {
        console.error('Failed to load from cloud:', error);
      }
    };

    loadFromCloud();
  }, [userId, tableName, column, syncToCloud, localStorageKey, saveToLocalStorage]);

  // Update data
  const setData = useCallback((newData: T | ((prev: T) => T)) => {
    setSyncState(prev => {
      const updated = typeof newData === 'function' 
        ? (newData as (prev: T) => T)(prev.data)
        : newData;

      // Save to localStorage immediately
      saveToLocalStorage(updated);

      // Debounce cloud save
      if (syncToCloud && userId && isOnlineRef.current) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          saveToCloud(updated);
        }, debounceMs);
      }

      return { ...prev, data: updated };
    });
  }, [saveToLocalStorage, syncToCloud, userId, debounceMs, saveToCloud]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      setSyncState(prev => ({ ...prev, status: 'synced' }));
      
      // Retry queued sync
      if (syncQueueRef.current) {
        saveToCloud(syncQueueRef.current);
        syncQueueRef.current = null;
      }
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      setSyncState(prev => ({ ...prev, status: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [saveToCloud]);

  // Manual sync
  const syncNow = useCallback(async () => {
    if (syncToCloud && userId) {
      await saveToCloud(syncState.data);
    }
  }, [syncToCloud, userId, saveToCloud, syncState.data]);

  return {
    data: syncState.data,
    setData,
    status: syncState.status,
    lastSynced: syncState.lastSynced,
    syncNow,
  };
}
