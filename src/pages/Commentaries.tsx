import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, ExternalLink, GitCompare, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toHebrewNumber } from "@/utils/hebrewNumbers";
import { TextHighlighter } from "@/components/TextHighlighter";
import { PasukLineActions } from "@/components/PasukLineActions";
import { NotesDialog } from "@/components/NotesDialog";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";
import { useBookmarks } from "@/contexts/BookmarksContext";
import { getAvailableCommentaries, getPasukSefariaUrl, getMefareshSefariaUrl } from "@/utils/sefariaCommentaries";
import { SefariaCommentary } from "@/types/sefaria";
import type { Sefer } from "@/types/torah";
import { formatTorahText } from "@/utils/textUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { CommentaryDisplaySettings } from "@/components/CommentaryDisplaySettings";

export const Commentaries = () => {
  const { seferId, perek, pasuk } = useParams<{ seferId: string; perek: string; pasuk: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useFontAndColorSettings();
  const { toggleBookmark } = useBookmarks();
  
  const [commentaries, setCommentaries] = useState<SefariaCommentary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pasukText, setPasukText] = useState<string>("");
  const [seferName, setSeferName] = useState<string>("");
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const selectedMefaresh = searchParams.get('mefaresh');

  const numSeferId = Number(seferId);
  const numPerek = Number(perek);
  const numPasuk = Number(pasuk);
  const pasukId = `${numSeferId}-${numPerek}-${numPasuk}`;
  console.log('🔍 Commentaries - pasukId:', pasukId);

  useEffect(() => {
    const loadData = async () => {
      if (!seferId || !perek || !pasuk) return;

      setLoading(true);

      // Load the pasuk text from the original data
      try {
        const seferFiles: Record<number, string> = {
          1: "bereishit",
          2: "shemot",
          3: "vayikra",
          4: "bamidbar",
          5: "devarim"
        };
        
        const seferFileName = seferFiles[numSeferId];
        const seferData: Sefer = await import(`@/data/${seferFileName}.json`).then(m => m.default);
        
        setSeferName(seferData.sefer_name);

        // Find the pasuk
        for (const parsha of seferData.parshiot) {
          for (const perekData of parsha.perakim) {
            if (perekData.perek_num === numPerek) {
              const foundPasuk = perekData.pesukim.find(p => p.pasuk_num === numPasuk);
              if (foundPasuk) {
                setPasukText(foundPasuk.text);
              }
              break;
            }
          }
        }
      } catch (error) {
        console.error("Error loading pasuk text:", error);
      }

      // Load Sefaria commentaries
      try {
        const sefariaCommentaries = await getAvailableCommentaries(numSeferId, numPerek, numPasuk);
        setCommentaries(sefariaCommentaries);
        setError(null);
      } catch (err) {
        console.error("Error loading commentaries:", err);
        setError("שגיאה בטעינת הפרשנים");
        setCommentaries([]);
      }
      
      setLoading(false);

      // Scroll to selected mefaresh if provided
      if (selectedMefaresh) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const element = document.querySelector(`[data-mefaresh="${selectedMefaresh}"]`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        });
      }
    };

    loadData();
  }, [seferId, perek, pasuk, numSeferId, numPerek, numPasuk, selectedMefaresh]);

  const handleBack = () => {
    navigate("/");
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setSelectedForCompare([]);
  };

  const toggleCommentarySelect = (id: number) => {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const selectedCommentaries = useMemo(
    () => commentaries.filter(c => selectedForCompare.includes(c.id)),
    [commentaries, selectedForCompare]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה
            </Button>
            <div className="flex items-center gap-3">
              <CommentaryDisplaySettings />
              <Badge variant="outline" className="text-lg px-4 py-2">
                {seferName} - פרק {toHebrewNumber(numPerek)} פסוק {toHebrewNumber(numPasuk)}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Pasuk Display */}
        <Card className="mb-8 border-r-4 border-r-primary shadow-lg">
          <CardHeader className="bg-gradient-to-l from-secondary/30 to-card">
            <div className="flex items-center justify-between mb-3">
              <NotesDialog 
                pasukId={pasukId} 
                pasukText={pasukText}
                open={notesDialogOpen}
                onOpenChange={setNotesDialogOpen}
              />
              <a
                href={getPasukSefariaUrl(numSeferId, numPerek, numPasuk)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
            {pasukText && (
              <PasukLineActions 
                text={pasukText}
                onBookmark={() => toggleBookmark(pasukId, pasukText)}
                onAddNote={() => setNotesDialogOpen(true)}
              >
                <div>
                  <TextHighlighter
                    text={pasukText}
                    pasukId={pasukId}
                    fontFamily={settings.pasukFont}
                    fontSize={settings.pasukSize}
                    color={settings.pasukColor}
                    fontWeight={settings.pasukBold ? 'bold' : 'normal'}
                  />
                </div>
              </PasukLineActions>
            )}
          </CardHeader>
        </Card>

        {/* Commentaries Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">פרשנים נוספים מספריא</h2>
              <Badge variant="secondary" className="text-sm">
                {toHebrewNumber(commentaries.length)} פרשנים
              </Badge>
            </div>
            <Button 
              variant={compareMode ? "default" : "outline"}
              onClick={toggleCompareMode}
              className="gap-2"
            >
              <GitCompare className="h-4 w-4" />
              {compareMode ? "סיים השוואה" : "השווה פרשנים"}
              {compareMode && selectedForCompare.length > 0 && (
                <Badge variant="secondary" className="mr-1">
                  {toHebrewNumber(selectedForCompare.length)}
                </Badge>
              )}
            </Button>
          </div>

          {loading ? (
            <Card className="p-8">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div className="text-center text-muted-foreground">
                  טוען פרשנים...
                </div>
              </div>
            </Card>
          ) : error ? (
            <Card className="p-8 border-destructive/50">
              <div className="text-center text-destructive">
                {error}
              </div>
            </Card>
          ) : commentaries.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                לא נמצאו פרשנים נוספים לפסוק זה
              </div>
            </Card>
          ) : compareMode && selectedForCompare.length > 0 ? (
            <div className="space-y-6">
              {/* Comparison View */}
              <div className={`grid gap-4 ${selectedCommentaries.length === 2 ? 'sm:grid-cols-1 md:grid-cols-2' : selectedCommentaries.length === 3 ? 'sm:grid-cols-1 lg:grid-cols-3' : 'md:grid-cols-1'}`}>
                {selectedCommentaries.map((commentary) => (
                  <Card key={commentary.id} className="border-2 border-primary/50 animate-fade-in min-w-0 overflow-hidden w-full max-w-full">
                    <CardHeader className="bg-gradient-to-b from-primary/10 to-transparent pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="default" className="text-base font-bold px-3 py-1">
                          {commentary.mefaresh}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCommentarySelect(commentary.id)}
                          className="h-7 w-7 p-0"
                          aria-label={`הסר ${commentary.mefaresh} מההשוואה`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 overflow-hidden w-full max-w-full">
                      <PasukLineActions text={commentary.text}>
                        <p
                          className="break-words w-full"
                          style={{
                            fontFamily: settings.commentaryFont,
                            fontSize: `${settings.commentarySize}px`,
                            color: settings.commentaryColor,
                            fontWeight: settings.commentaryBold ? 'bold' : 'normal',
                            lineHeight: settings.commentaryLineHeight === 'normal' ? '1.6' : settings.commentaryLineHeight === 'relaxed' ? '1.9' : '2.2',
                            maxWidth: settings.commentaryMaxWidth === 'narrow' ? '600px' : settings.commentaryMaxWidth === 'medium' ? '800px' : settings.commentaryMaxWidth === 'wide' ? '1000px' : '100%',
                            margin: '0 auto',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            hyphens: 'auto',
                            textAlign: 'justify',
                            textAlignLast: 'right',
                            direction: 'rtl',
                            whiteSpace: 'normal'
                          }}
                        >
                          {formatTorahText(commentary.text)}
                        </p>
                      </PasukLineActions>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Selection List */}
              <Card className="p-4">
                <h3 className="font-bold mb-3 text-right">בחר פרשנים להשוואה (עד 3):</h3>
                <div className="space-y-2">
                  {commentaries.map((commentary) => (
                    <div
                      key={commentary.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`compare-${commentary.id}`}
                        checked={selectedForCompare.includes(commentary.id)}
                        onCheckedChange={() => toggleCommentarySelect(commentary.id)}
                        disabled={!selectedForCompare.includes(commentary.id) && selectedForCompare.length >= 3}
                      />
                      <label
                        htmlFor={`compare-${commentary.id}`}
                        className="flex-1 text-right cursor-pointer font-medium"
                      >
                        {commentary.mefaresh}
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            commentaries.map((commentary) => (
              <CommentarySection
                key={commentary.id}
                commentary={commentary}
                seferId={numSeferId}
                perek={numPerek}
                pasuk={numPasuk}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

interface CommentarySectionProps {
  commentary: SefariaCommentary;
  seferId: number;
  perek: number;
  pasuk: number;
}

const CommentarySection = ({ commentary, seferId, perek, pasuk }: CommentarySectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useFontAndColorSettings();

  return (
    <Card className="overflow-hidden border-r-2 border-r-accent w-full max-w-full" data-mefaresh={commentary.mefaresh}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-base font-bold px-3 py-1">
                {commentary.mefaresh}
              </Badge>
              <a
                href={getMefareshSefariaUrl(seferId, perek, pasuk, commentary.mefaresh)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden w-full">
          <CardContent className="pt-0 pb-4 overflow-hidden w-full max-w-full">
            <div className="bg-card rounded-md border-r-2 border-accent p-4 overflow-hidden min-w-0 w-full max-w-full">
              <PasukLineActions text={commentary.text}>
                <p
                  className="break-words w-full"
                  style={{
                    fontFamily: settings.commentaryFont,
                    fontSize: `${settings.commentarySize}px`,
                    color: settings.commentaryColor,
                    fontWeight: settings.commentaryBold ? 'bold' : 'normal',
                    lineHeight: settings.commentaryLineHeight === 'normal' ? '1.6' : settings.commentaryLineHeight === 'relaxed' ? '1.9' : '2.2',
                    maxWidth: settings.commentaryMaxWidth === 'narrow' ? '600px' : settings.commentaryMaxWidth === 'medium' ? '800px' : settings.commentaryMaxWidth === 'wide' ? '1000px' : '100%',
                    margin: '0 auto',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    hyphens: 'auto',
                    textAlign: 'justify',
                    textAlignLast: 'right',
                    direction: 'rtl',
                    whiteSpace: 'normal'
                  }}
                >
                  {formatTorahText(commentary.text)}
                </p>
              </PasukLineActions>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default Commentaries;
