import { useEffect, useRef, useState, useCallback } from 'react';
import { SearchableItem } from './useSearchIndex';

interface SearchFilters {
  sefer: number | null;
  searchType: 'all' | 'question' | 'perush' | 'pasuk';
  mefaresh: string;
}

export const useSearchWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const itemsMapRef = useRef<Map<string, SearchableItem>>(new Map());

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/search.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { type } = e.data;
      
      if (type === 'INDEX_READY') {
        setIsReady(true);
      } else if (type === 'SEARCH_RESULTS') {
        setIsSearching(false);
      } else if (type === 'ERROR') {
        setIsSearching(false);
        console.error('Worker error:', e.data.error);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const initializeIndex = useCallback((items: SearchableItem[]) => {
    if (!workerRef.current) return;
    
    // Build lookup map for originalItem restoration after search
    const map = new Map<string, SearchableItem>();
    for (const item of items) {
      map.set(item.id, item);
    }
    itemsMapRef.current = map;
    
    // Strip originalItem to reduce payload size — worker only needs search fields
    const lightItems = items.map(({ originalItem, ...rest }) => rest);
    
    workerRef.current.postMessage({
      type: 'INIT_INDEX',
      payload: { items: lightItems }
    });
  }, []);

  const search = useCallback(
    (query: string, filters: SearchFilters): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !isReady) {
          reject(new Error('Worker not ready'));
          return;
        }

        setIsSearching(true);

        const handleMessage = (e: MessageEvent) => {
          const { type, results, error } = e.data;
          
          if (type === 'SEARCH_RESULTS') {
            workerRef.current?.removeEventListener('message', handleMessage);
            // Restore originalItem from the map
            const enriched = results.map((r: any) => ({
              ...r,
              item: {
                ...r.item,
                originalItem: itemsMapRef.current.get(r.item.id)?.originalItem
              }
            }));
            resolve(enriched);
          } else if (type === 'ERROR') {
            workerRef.current?.removeEventListener('message', handleMessage);
            reject(new Error(error));
          }
        };

        workerRef.current.addEventListener('message', handleMessage);

        workerRef.current.postMessage({
          type: 'SEARCH',
          payload: { query, filters }
        });
      });
    },
    [isReady]
  );

  return {
    initializeIndex,
    search,
    isReady,
    isSearching
  };
};