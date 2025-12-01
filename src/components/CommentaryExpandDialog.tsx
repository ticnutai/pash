import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { loadSefariaCommentary, getSefariaSeferName, getMefareshSefariaUrl } from "@/utils/sefariaCommentaries";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";
import { useSefariaCache } from "@/hooks/useSefariaCache";
import { TextHighlighter } from "./TextHighlighter";
import { toHebrewNumber } from "@/utils/hebrewNumbers";
import { formatTorahText } from "@/utils/textUtils";

interface CommentaryExpandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sefer: number;
  perek: number;
  pasuk: number;
  mefaresh: string;
}

const MEFARESH_MAPPING: Record<string, string> = {
  'רש"י': 'Rashi',
  'רמב"ן': 'Ramban',
  'אבן עזרא': 'Ibn_Ezra',
  'ספורנו': 'Sforno'
};

export const CommentaryExpandDialog = ({
  open,
  onOpenChange,
  sefer,
  perek,
  pasuk,
  mefaresh
}: CommentaryExpandDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [commentaryText, setCommentaryText] = useState<string>("");
  const { settings } = useFontAndColorSettings();
  const { getFromCache, saveToCache } = useSefariaCache();

  // Memoize cache key
  const cacheKey = useMemo(() => 
    `${sefer}_${perek}_${pasuk}_${mefaresh}`,
    [sefer, perek, pasuk, mefaresh]
  );

  useEffect(() => {
    if (!open) return;

    const loadCommentary = async () => {
      setLoading(true);
      
      // Try cache first
      const cached = getFromCache(cacheKey);
      if (cached) {
        setCommentaryText(cached);
        setLoading(false);
        return;
      }

      try {
        const seferName = getSefariaSeferName(sefer);
        const mefareshEn = MEFARESH_MAPPING[mefaresh];

        if (!mefareshEn) {
          setCommentaryText("מפרש לא נתמך");
          setLoading(false);
          return;
        }

        const data = await loadSefariaCommentary(seferName, mefareshEn);
        
        if (data?.text?.[perek - 1]?.[pasuk - 1]) {
          const text = data.text[perek - 1][pasuk - 1];
          const textContent = Array.isArray(text) ? text.join(" ") : text;
          setCommentaryText(textContent);
          
          // Save to cache
          saveToCache(cacheKey, textContent);
        } else {
          setCommentaryText("לא נמצא פירוש");
        }
      } catch (error) {
        console.error("Error loading commentary:", error);
        setCommentaryText("שגיאה בטעינת הפירוש");
      } finally {
        setLoading(false);
      }
    };

    loadCommentary();
  }, [open, sefer, perek, pasuk, mefaresh, cacheKey, getFromCache, saveToCache]);

  const sefariaUrl = getMefareshSefariaUrl(sefer, perek, pasuk, mefaresh);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">
            {mefaresh} - {["בראשית", "שמות", "ויקרא", "במדבר", "דברים"][sefer - 1]} פרק {toHebrewNumber(perek)} פסוק {toHebrewNumber(pasuk)}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="break-words w-full"
              style={{
                fontFamily: settings.commentaryFont,
                fontSize: `${settings.commentarySize}px`,
                color: settings.commentaryColor,
                fontWeight: settings.commentaryBold ? 'bold' : 'normal',
                lineHeight: settings.commentaryLineHeight === 'normal' ? '1.6' : settings.commentaryLineHeight === 'relaxed' ? '1.9' : '2.2',
                maxWidth: settings.commentaryMaxWidth === 'narrow' ? '600px' : settings.commentaryMaxWidth === 'medium' ? '800px' : settings.commentaryMaxWidth === 'wide' ? '1000px' : '100%',
                margin: '0 auto',
                textAlign: 'justify',
                textAlignLast: 'right',
                direction: 'rtl',
                whiteSpace: 'normal'
              }}
            >
              {formatTorahText(commentaryText)}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(sefariaUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 ml-2" />
                פתח בספריא
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
