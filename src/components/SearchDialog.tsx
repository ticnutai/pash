import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResults } from "@/components/search/SearchResults";
import { CommentaryExpandDialog } from "@/components/CommentaryExpandDialog";
import { useSearchIndex } from "@/hooks/useSearchIndex";
import { useSearchWorker } from "@/hooks/useSearchWorker";
import { Loader2, Sparkles, Maximize2, Minimize2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingProgress } from "@/components/LoadingProgress";
import { useIndexedDBCache } from "@/hooks/useIndexedDBCache";
import { cn } from "@/lib/utils";
import { yieldToMain } from "@/utils/asyncHelpers";

type BookStatus = 'pending' | 'loading' | 'completed' | 'error';

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_SEARCH_HISTORY = 10;

function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addToSearchHistory(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const history = getSearchHistory().filter(h => h !== trimmed);
  history.unshift(trimmed);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_SEARCH_HISTORY)));
}

function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

// Progressive loading with status tracking
const loadBookData = async (
  fileName: string, 
  index: number,
  onProgress: (progress: number) => void
) => {
  try {
    onProgress(10);
    const module = await import(`@/data/${fileName}.json`);
    onProgress(50);
    
    // Yield to prevent blocking
    await yieldToMain();
    
    const sefer = module.default;
    
    const seferData: any[] = [];
    const parshiot = sefer.parshiot || [];
    const totalParshiot = parshiot.length;
    
    for (let idx = 0; idx < parshiot.length; idx++) {
      const parsha = parshiot[idx];
      
      parsha.perakim?.forEach((perek: any) => {
        perek.pesukim?.forEach((pasuk: any) => {
          seferData.push({
            id: pasuk.id,
            sefer: index + 1,
            sefer_name: sefer.sefer_name,
            perek: perek.perek_num,
            pasuk_num: pasuk.pasuk_num,
            text: pasuk.text,
            content: pasuk.content || [],
            parsha_id: parsha.parsha_id,
            parsha_name: parsha.parsha_name,
          });
        });
      });
      
      const progressPercent = 50 + Math.floor(((idx + 1) / totalParshiot) * 50);
      onProgress(progressPercent);
      
      // Yield every 5 parshiot to prevent blocking
      if (idx % 5 === 0) {
        await yieldToMain();
      }
    }
    
    onProgress(100);
    return seferData;
  } catch (error) {
    console.error(`Failed to load ${fileName}:`, error);
    throw error;
  }
};

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const cache = useIndexedDBCache();
  const [allPesukim, setAllPesukim] = useState<any[]>([]);
  const [loadingBooks, setLoadingBooks] = useState<Array<{
    name: string;
    status: BookStatus;
    progress: number;
  }>>([
    { name: 'בראשית', status: 'pending', progress: 0 },
    { name: 'שמות', status: 'pending', progress: 0 },
    { name: 'ויקרא', status: 'pending', progress: 0 },
    { name: 'במדבר', status: 'pending', progress: 0 },
    { name: 'דברים', status: 'pending', progress: 0 },
  ]);
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);
  const [loadingCancelled, setLoadingCancelled] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sefer, setSefer] = useState<number | null>(null);
  const [searchType, setSearchType] = useState<"all" | "question" | "perush" | "pasuk">("all");
  const [mefaresh, setMefaresh] = useState("הכל");
  const [activeResults, setActiveResults] = useState<any[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [searchHistoryItems, setSearchHistoryItems] = useState<string[]>(getSearchHistory());
  
  const [expandDialog, setExpandDialog] = useState<{
    open: boolean;
    sefer: number;
    perek: number;
    pasuk: number;
    mefaresh: string;
  }>({
    open: false,
    sefer: 1,
    perek: 1,
    pasuk: 1,
    mefaresh: ""
  });

  // Progressive data loading
  useEffect(() => {
    if (!open) return; // Only load when dialog is opened

    const loadData = async () => {
      const CACHE_KEY = 'all_sefarim_data_v2';
      
      // Try IndexedDB cache first
      const cached = await cache.getFromCache(CACHE_KEY);
      if (cached) {
        setAllPesukim(cached);
        setIsLoadingComplete(true);
        setLoadingBooks(prev => prev.map(b => ({ ...b, status: 'completed', progress: 100 })));
        return;
      }

      // Load books progressively
      const seferFiles = ['bereishit', 'shemot', 'vayikra', 'bamidbar', 'devarim'];
      const allData: any[] = [];

      for (let i = 0; i < seferFiles.length; i++) {
        if (loadingCancelled) break;

        setLoadingBooks(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'loading' };
          return updated;
        });

        try {
          const bookData = await loadBookData(seferFiles[i], i, (progress) => {
            setLoadingBooks(prev => {
              const updated = [...prev];
              updated[i] = { ...updated[i], progress };
              return updated;
            });
          });

          allData.push(...bookData);
          setAllPesukim([...allData]); // Update immediately for search

          setLoadingBooks(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: 'completed', progress: 100 };
            return updated;
          });
        } catch (error) {
          setLoadingBooks(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: 'error', progress: 0 };
            return updated;
          });
          toast.error(`שגיאה בטעינת ${loadingBooks[i].name}`);
        }
      }

      if (!loadingCancelled) {
        await cache.saveToCache(CACHE_KEY, allData);
        setIsLoadingComplete(true);
      }
    };

    loadData();
  }, [open, cache, loadingCancelled]);

  const { searchableItems } = useSearchIndex(allPesukim);
  const { initializeIndex, search: workerSearch, isReady: workerReady, isSearching } = useSearchWorker();

  // Initialize worker when data is ready
  useEffect(() => {
    if (searchableItems.length > 0 && !workerReady) {
      initializeIndex(searchableItems);
    }
  }, [searchableItems, workerReady, initializeIndex]);

  const handleExactSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error("נא להזין שאילתת חיפוש");
      return;
    }

    if (!workerReady) {
      toast.error("מנוע החיפוש עדיין טוען...");
      return;
    }

    try {
      const results = await workerSearch(searchQuery, {
        sefer,
        searchType,
        mefaresh
      });
      setActiveResults(results);
      addToSearchHistory(searchQuery);
      setSearchHistoryItems(getSearchHistory());
    } catch (error) {
      console.error("Search error:", error);
      toast.error("שגיאה בחיפוש");
    }
  }, [searchQuery, workerSearch, workerReady, sefer, searchType, mefaresh]);

  const handleSmartSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error("נא להזין שאילתת חיפוש");
      return;
    }

    setAiLoading(true);
    setAiSuggestion("");

    try {
      const context = sefer ? ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"][sefer - 1] : "כל התורה";
      
      const { data, error } = await supabase.functions.invoke('smart-search', {
        body: { query: searchQuery, context }
      });

      if (error) throw error;

      if (data?.suggestion) {
        setAiSuggestion(data.suggestion);
        handleExactSearch();
      }
    } catch (error: any) {
      console.error("Smart search error:", error);
      
      if (error.message?.includes('429')) {
        toast.error("מגבלת בקשות הושגה, אנא נסה שוב מאוחר יותר");
      } else if (error.message?.includes('402')) {
        toast.error("נדרש תשלום, אנא הוסף זיכויים למערכת");
      } else {
        toast.error("שגיאה בחיפוש חכם");
      }
    } finally {
      setAiLoading(false);
    }
  }, [searchQuery, sefer, handleExactSearch]);

  const handleExpandCommentary = (sefer: number, perek: number, pasuk: number, mefaresh: string) => {
    setExpandDialog({ open: true, sefer, perek, pasuk, mefaresh });
  };

  // Loading state
  if (!isLoadingComplete) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <LoadingProgress 
            books={loadingBooks} 
            onCancel={() => setLoadingCancelled(true)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className={cn(
            "transition-all duration-300",
            isMaximized 
              ? "max-w-[95vw] h-[95vh]" 
              : "max-w-4xl max-h-[85vh]"
          )}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl">חיפוש בתורה</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMaximized(!isMaximized)}
                className="h-8 w-8"
                aria-label={isMaximized ? "הקטן חלון" : "הגדל חלון"}
              >
                {isMaximized ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-right">
              חפש פסוקים, שאלות ופירושים בכל חמשת חומשי התורה
            </p>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(85vh-8rem)]">
            <Card className="p-6">
              <Tabs defaultValue="exact" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="exact">חיפוש מדויק</TabsTrigger>
                  <TabsTrigger value="smart">
                    <Sparkles className="h-4 w-4 ml-2" />
                    חיפוש חכם (AI)
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="exact" className="space-y-4 mt-4">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={handleExactSearch}
                  />

                  {/* Recent searches */}
                  {searchHistoryItems.length > 0 && !searchQuery && activeResults.length === 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          חיפושים אחרונים
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground"
                          onClick={() => { clearSearchHistory(); setSearchHistoryItems([]); }}
                        >
                          נקה
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {searchHistoryItems.map((item, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 group"
                            onClick={() => { setSearchQuery(item); }}
                          >
                            {item}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <SearchFilters
                    sefer={sefer}
                    searchType={searchType}
                    mefaresh={mefaresh}
                    onSeferChange={setSefer}
                    onSearchTypeChange={setSearchType}
                    onMefareshChange={setMefaresh}
                  />

                  <div className="pt-4">
                    {activeResults.length > 0 && (
                      <div className="mb-4 text-sm text-muted-foreground text-right">
                        נמצאו {activeResults.length} תוצאות
                      </div>
                    )}
                    <SearchResults
                      results={activeResults}
                      onExpandCommentary={handleExpandCommentary}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="smart" className="space-y-4 mt-4">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={handleSmartSearch}
                    placeholder="שאל שאלה או תאר מה אתה מחפש..."
                  />

                  <SearchFilters
                    sefer={sefer}
                    searchType={searchType}
                    mefaresh={mefaresh}
                    onSeferChange={setSefer}
                    onSearchTypeChange={setSearchType}
                    onMefareshChange={setMefaresh}
                  />

                  {aiLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary ml-2" />
                      <span className="text-muted-foreground">מנתח את השאילתא...</span>
                    </div>
                  )}

                  {aiSuggestion && (
                    <Alert className="bg-primary/5 border-primary/20">
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription className="text-right whitespace-pre-wrap">
                        {aiSuggestion}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="pt-4">
                    {activeResults.length > 0 && (
                      <div className="mb-4 text-sm text-muted-foreground text-right">
                        נמצאו {activeResults.length} תוצאות
                      </div>
                    )}
                    <SearchResults
                      results={activeResults}
                      onExpandCommentary={handleExpandCommentary}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <CommentaryExpandDialog
        open={expandDialog.open}
        onOpenChange={(open) => setExpandDialog({ ...expandDialog, open })}
        sefer={expandDialog.sefer}
        perek={expandDialog.perek}
        pasuk={expandDialog.pasuk}
        mefaresh={expandDialog.mefaresh}
      />
    </>
  );
}
