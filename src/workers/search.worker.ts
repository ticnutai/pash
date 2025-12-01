import Fuse from 'fuse.js';

interface SearchableItem {
  type: 'pasuk' | 'question' | 'perush';
  id: string;
  sefer: number;
  perek: number;
  pasuk_num: number;
  text: string;
  mefaresh?: string;
  questionText?: string;
  originalItem: any;
}

let fuseInstance: Fuse<SearchableItem> | null = null;

// Remove niqqud (Hebrew vowel marks) for better matching
const removeNiqqud = (text: string) => {
  return text.replace(/[\u0591-\u05C7]/g, '');
};

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT_INDEX':
      const searchableItems: SearchableItem[] = payload.items;
      
      fuseInstance = new Fuse(searchableItems, {
        keys: [
          { name: 'text', weight: 2 },
          { name: 'mefaresh', weight: 1.5 },
          { name: 'questionText', weight: 1 }
        ],
        threshold: 0.2,
        distance: 100,
        includeScore: true,
        includeMatches: true,
        minMatchCharLength: 2,
        ignoreLocation: true,
        useExtendedSearch: true,
        getFn: (obj, path) => {
          const value = Fuse.config.getFn(obj, path);
          if (typeof value === 'string') {
            return removeNiqqud(value);
          }
          return value;
        }
      });

      self.postMessage({ type: 'INDEX_READY' });
      break;

    case 'SEARCH':
      if (!fuseInstance) {
        self.postMessage({ 
          type: 'ERROR', 
          error: 'Search index not initialized' 
        });
        return;
      }

      const { query, filters } = payload;
      let results = fuseInstance.search(removeNiqqud(query));

      // Apply filters
      if (filters) {
        results = results.filter((r) => {
          const item = r.item;
          
          if (filters.sefer && item.sefer !== filters.sefer) return false;
          if (filters.searchType !== 'all' && item.type !== filters.searchType) return false;
          if (filters.mefaresh !== 'הכל' && item.mefaresh !== filters.mefaresh) return false;
          
          return true;
        });
      }

      self.postMessage({ 
        type: 'SEARCH_RESULTS', 
        results 
      });
      break;

    default:
      self.postMessage({ 
        type: 'ERROR', 
        error: `Unknown message type: ${type}` 
      });
  }
};

export {};
