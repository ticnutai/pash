import { useMemo, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import { FlatPasuk } from '@/types/torah';
import { normalizeMefareshName } from '@/utils/names';

export interface SearchableItem {
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

export const useSearchIndex = (pesukim: FlatPasuk[]) => {
  const fuseRef = useRef<Fuse<SearchableItem> | null>(null);
  const searchableItemsRef = useRef<SearchableItem[]>([]);

  // Memoize searchable items creation
  const searchableItems = useMemo(() => {
    const items: SearchableItem[] = [];

    pesukim.forEach(pasuk => {
      // Add pasuk itself
      items.push({
        type: 'pasuk',
        id: `pasuk-${pasuk.id}`,
        sefer: pasuk.sefer,
        perek: pasuk.perek,
        pasuk_num: pasuk.pasuk_num,
        text: pasuk.text,
        originalItem: pasuk
      });

      // Add questions and perushim
      pasuk.content?.forEach(content => {
        content.questions?.forEach(question => {
          // Add question
          items.push({
            type: 'question',
            id: `question-${question.id}`,
            sefer: pasuk.sefer,
            perek: pasuk.perek,
            pasuk_num: pasuk.pasuk_num,
            text: question.text,
            questionText: question.text,
            originalItem: { pasuk, question }
          });

          // Add perushim for this question
          question.perushim?.forEach(perush => {
            items.push({
              type: 'perush',
              id: `perush-${perush.id}`,
              sefer: pasuk.sefer,
              perek: pasuk.perek,
              pasuk_num: pasuk.pasuk_num,
              text: perush.text,
              mefaresh: normalizeMefareshName(perush.mefaresh),
              questionText: question.text,
              originalItem: { pasuk, question, perush }
            });
          });
        });
      });
    });

    searchableItemsRef.current = items;
    return items;
  }, [pesukim]);

  // Only recreate Fuse index when searchable items actually change
  useEffect(() => {
    // Remove niqqud (Hebrew vowel marks) for better matching
    const removeNiqqud = (text: string) => {
      return text.replace(/[\u0591-\u05C7]/g, '');
    };

    fuseRef.current = new Fuse(searchableItems, {
      keys: [
        { name: 'text', weight: 2 },
        { name: 'mefaresh', weight: 1.5 },
        { name: 'questionText', weight: 1 }
      ],
      threshold: 0.2, // More precise (was 0.3)
      distance: 100, // Allow matches further apart
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true, // Better for Hebrew text
      useExtendedSearch: true, // Enable advanced search patterns
      getFn: (obj, path) => {
        const value = Fuse.config.getFn(obj, path);
        if (typeof value === 'string') {
          return removeNiqqud(value);
        }
        return value;
      }
    });
  }, [searchableItems]);

  return { 
    fuse: fuseRef.current!, 
    searchableItems 
  };
};
