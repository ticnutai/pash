import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResults } from "@/components/search/SearchResults";
import { CommentaryExpandDialog } from "@/components/CommentaryExpandDialog";
import { useSearchWorker } from "@/hooks/useSearchWorker";
import { useSearchDataLoader } from "@/hooks/useSearchDataLoader";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useEffect } from "react";

export default function Search() {
  const { searchableItems, books, isReady, isFullyLoaded, completedCount, totalProgress } = useSearchDataLoader(true);
  const { initializeIndex, search: workerSearch, isReady: workerReady } = useSearchWorker();

  const [searchQuery, setSearchQuery] = useState("");
  const [sefer, setSefer] = useState<number | null>(null);
  const [searchType, setSearchType] = useState<"all" | "question" | "perush" | "pasuk">("pasuk");
  const [mefaresh, setMefaresh] = useState("הכל");
  const [activeResults, setActiveResults] = useState<any[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [expandDialog, setExpandDialog] = useState({
    open: false, sefer: 1, perek: 1, pasuk: 1, mefaresh: ""
  });

  useEffect(() => {
    if (searchableItems.length > 0) {
      initializeIndex(searchableItems);
    }
  }, [searchableItems, initializeIndex]);

  const handleExactSearch = useCallback(async () => {
    if (!searchQuery.trim()) { toast.error("נא להזין שאילתת חיפוש"); return; }
    if (!workerReady) { toast.error("מנוע החיפוש עדיין טוען..."); return; }
    try {
      const results = await workerSearch(searchQuery, { sefer, searchType, mefaresh });
      setActiveResults(results);
    } catch { toast.error("שגיאה בחיפוש"); }
  }, [searchQuery, workerSearch, workerReady, sefer, searchType, mefaresh]);

  const handleSmartSearch = useCallback(async () => {
    if (!searchQuery.trim()) { toast.error("נא להזין שאילתת חיפוש"); return; }
    setAiLoading(true); setAiSuggestion("");
    try {
      const context = sefer ? ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"][sefer - 1] : "כל התורה";
      const { data, error } = await supabase.functions.invoke('smart-search', { body: { query: searchQuery, context } });
      if (error) throw error;
      if (data?.suggestion) { setAiSuggestion(data.suggestion); handleExactSearch(); }
    } catch (error: any) {
      if (error.message?.includes('429')) toast.error("מגבלת בקשות הושגה");
      else toast.error("שגיאה בחיפוש חכם");
    } finally { setAiLoading(false); }
  }, [searchQuery, sefer, handleExactSearch]);

  const handleExpandCommentary = (sefer: number, perek: number, pasuk: number, mefaresh: string) => {
    setExpandDialog({ open: true, sefer, perek, pasuk, mefaresh });
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-right">חיפוש בתורה</h1>
        <p className="text-muted-foreground text-right">חפש פסוקים, שאלות ופירושים בכל חמשת חומשי התורה</p>
      </div>

      {/* Loading banner removed - index builds instantly */}

      <Card className="p-6">
        <Tabs defaultValue="exact" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="exact">חיפוש מדויק</TabsTrigger>
            <TabsTrigger value="smart">
              <Sparkles className="h-4 w-4 ml-2" />חיפוש חכם (AI)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exact" className="space-y-4 mt-4">
            <SearchBar value={searchQuery} onChange={setSearchQuery} onSearch={handleExactSearch} />
            <SearchFilters sefer={sefer} searchType={searchType} mefaresh={mefaresh}
              onSeferChange={setSefer} onSearchTypeChange={setSearchType} onMefareshChange={setMefaresh} />
            <div className="pt-4">
              {activeResults.length > 0 && (
                <div className="mb-4 text-sm text-muted-foreground text-right">נמצאו {activeResults.length} תוצאות</div>
              )}
              <SearchResults results={activeResults} onExpandCommentary={handleExpandCommentary} />
            </div>
          </TabsContent>

          <TabsContent value="smart" className="space-y-4 mt-4">
            <SearchBar value={searchQuery} onChange={setSearchQuery} onSearch={handleSmartSearch}
              placeholder="שאל שאלה או תאר מה אתה מחפש..." />
            <SearchFilters sefer={sefer} searchType={searchType} mefaresh={mefaresh}
              onSeferChange={setSefer} onSearchTypeChange={setSearchType} onMefareshChange={setMefaresh} />
            {aiLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary ml-2" />
                <span className="text-muted-foreground">מנתח את השאילתא...</span>
              </div>
            )}
            {aiSuggestion && (
              <Alert className="bg-primary/5 border-primary/20">
                <Sparkles className="h-4 w-4" />
                <AlertDescription className="text-right whitespace-pre-wrap">{aiSuggestion}</AlertDescription>
              </Alert>
            )}
            <div className="pt-4">
              {activeResults.length > 0 && (
                <div className="mb-4 text-sm text-muted-foreground text-right">נמצאו {activeResults.length} תוצאות</div>
              )}
              <SearchResults results={activeResults} onExpandCommentary={handleExpandCommentary} />
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <CommentaryExpandDialog
        open={expandDialog.open}
        onOpenChange={(open) => setExpandDialog({ ...expandDialog, open })}
        sefer={expandDialog.sefer} perek={expandDialog.perek}
        pasuk={expandDialog.pasuk} mefaresh={expandDialog.mefaresh}
      />
    </div>
  );
}
