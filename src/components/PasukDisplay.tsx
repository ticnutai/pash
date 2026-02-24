import { useEffect, useMemo, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronDown, 
  ChevronUp, 
  MessageCircle, 
  MessageSquare, 
  BookOpen, 
  Sparkles, 
  Pencil,
  Trash2,
  Share2,
  Mail,
  Link2
} from "lucide-react";
import { FlatPasuk } from "@/types/torah";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toHebrewNumber } from "@/utils/hebrewNumbers";
import { normalizeMefareshName } from "@/utils/names";
import { fixText } from "@/utils/fixData";
import { formatTorahText } from "@/utils/textUtils";
import { sharePasukWhatsApp, sharePasukEmail, sharePasukLink } from "@/utils/shareUtils";
import { ClickableText } from "@/components/ClickableText";
import { PasukLineActions } from "@/components/PasukLineActions";
import { NotesDialog } from "@/components/NotesDialog";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";
import { useDisplayMode, DisplayMode } from "@/contexts/DisplayModeContext";
import { ContentEditor } from "@/components/ContentEditor";
import { useTextDisplayStyles } from "@/hooks/useTextDisplayStyles";
import { AddContentButton } from "@/components/AddContentButton";
import { TextSelectionShare } from "@/components/TextSelectionShare";
import { useContent } from "@/contexts/ContentContext";
import { MinimizeButton } from "@/components/MinimizeButton";
import { useBookmarks } from "@/contexts/BookmarksContext";

interface PasukDisplayProps {
  pasuk: FlatPasuk;
  seferId: number;
  forceMinimized?: boolean;
  hideHeaderActions?: boolean; // Hide actions when displayed in CompactPasukView
}

const PasukDisplayBase = ({ pasuk, seferId, forceMinimized = false, hideHeaderActions = false }: PasukDisplayProps) => {
  const navigate = useNavigate();
  const { settings } = useFontAndColorSettings();
  const { displaySettings } = useDisplayMode();
  const displayMode: DisplayMode = displaySettings?.mode || 'full';
  const displayStyles = useTextDisplayStyles();
  const { 
    titles: userTitles, 
    questions: userQuestions, 
    answers: userAnswers,
    updateTitle,
    updateQuestion,
    updateAnswer,
    deleteTitle,
    deleteQuestion,
    deleteAnswer,
    loading 
  } = useContent();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedInMinimizedMode, setExpandedInMinimizedMode] = useState(false);
  const [editorContext, setEditorContext] = useState<{
    type: "title" | "question" | "answer";
    titleId?: number;
    questionId?: number;
    defaultTab?: "title" | "question" | "answer";
  } | undefined>(undefined);

  // Edit states
  const [editingTitle, setEditingTitle] = useState<{ id: number; title: string } | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ id: number; text: string } | null>(null);
  const [editingAnswer, setEditingAnswer] = useState<{ id: number; text: string; mefaresh: string } | null>(null);
  
  // Delete confirmation states
  const [deletingTitle, setDeletingTitle] = useState<number | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<number | null>(null);
  const [deletingAnswer, setDeletingAnswer] = useState<number | null>(null);

  const effectiveMinimized = forceMinimized || isMinimized || (displayMode === "minimized" && !expandedInMinimizedMode);

  useEffect(() => {
    if (displayMode !== "minimized") {
      setExpandedInMinimizedMode(false);
    }
  }, [displayMode]);

  useEffect(() => {
    if (isMinimized) {
      setExpandedInMinimizedMode(false);
    }
  }, [isMinimized]);
  
  // Safety check: ensure content exists and is an array
  const content = pasuk.content || [];
  
  // Format the pasuk text
  const formattedPasukText = formatTorahText(pasuk.text);
  
  const totalQuestions = content.reduce((sum, content) => sum + content.questions.length, 0);
  const totalAnswers = content.reduce(
    (sum, content) => sum + content.questions.reduce((qSum, q) => qSum + q.perushim.length, 0),
    0
  );
  const pasukId = `${seferId}-${pasuk.perek}-${pasuk.pasuk_num}`;
  const bookmarked = isBookmarked(pasukId);

  const openAddTitle = () => {
    setEditorContext({ type: "title", defaultTab: "title" });
    setEditorOpen(true);
  };

  // פונקציה למציאת מיקום הכותרת בפסוק (מתעלמת מניקוד)
  const findTitlePositionInPasuk = (title: string, pasukText: string): number => {
    // הסרת ניקוד לצורך השוואה
    const normalizedTitle = title.replace(/[\u0591-\u05C7]/g, '').trim();
    const normalizedPasuk = pasukText.replace(/[\u0591-\u05C7]/g, '');
    
    const position = normalizedPasuk.indexOf(normalizedTitle);
    return position >= 0 ? position : Number.MAX_VALUE;
  };

  // מיזוג תוכן סטטי עם תוכן משתמשים
  const mergedContent = useMemo(() => {
    const merged = [...content];
    
    // הוסף כותרות משתמשים לפסוק
    const pasukUserTitles = userTitles.filter(t => t.pasukId === pasukId);
    
    pasukUserTitles.forEach(title => {
      const titleQuestions = userQuestions
        .filter(q => q.titleId === title.id)
        .map(q => ({
          id: q.id,
          text: q.text,
          perushim: userAnswers
            .filter(a => a.questionId === q.id)
            .map(a => ({
              id: a.id,
              mefaresh: a.mefaresh,
              text: a.text
            }))
        }));
      
      // הצג כותרות גם ללא שאלות (כותרות ריקות)
      merged.push({
        id: title.id,
        title: title.title,
        questions: titleQuestions
      });
    });
    
    // מיון לפי מיקום בפסוק
    merged.sort((a, b) => {
      const posA = findTitlePositionInPasuk(a.title, formattedPasukText);
      const posB = findTitlePositionInPasuk(b.title, formattedPasukText);
      return posA - posB;
    });
    
    return merged;
  }, [content, userTitles, userQuestions, userAnswers, pasukId, formattedPasukText]);

  // פונקציה לבדוק אם כותרת היא מ-Supabase (של המשתמש או משותפת)
  const isSupabaseTitle = (titleId: number) => {
    return userTitles.some(t => t.id === titleId && t.pasukId === pasukId);
  };

  // Split pasuk text into words for individual highlighting
  const pasukWords = useMemo(() => {
    return formattedPasukText.split(' ').map((word, index) => ({
      text: word,
      id: `${pasukId}-word-${index}`
    }));
  }, [formattedPasukText, pasukId]);

  // Don't show if no questions
  if (totalQuestions === 0) return null;

  // Full mode or verses-questions mode
  return (
    <>
      <Card 
        className="overflow-hidden border-r-4 border-r-accent shadow-md transition-all w-full group"
        style={{
          maxWidth: displayStyles.maxWidth,
          margin: displayStyles.margin,
          padding: displayStyles.isMobile ? "0.5rem" : undefined,
          width: "100%",
          overflowX: "hidden",
        }}
        onClick={() => {
          if (displayMode === "minimized" && !expandedInMinimizedMode && !forceMinimized) {
            setExpandedInMinimizedMode(true);
          }
        }}
      >
        <CardHeader 
          className="bg-secondary/30 relative group"
          style={{ padding: displayStyles.isMobile ? "0.75rem" : undefined }}
        >
          <div className="absolute top-2 left-2 z-10 flex gap-1">
            <AddContentButton 
              type="title"
              onClick={openAddTitle}
            />
            <MinimizeButton
              variant="individual"
              isMinimized={effectiveMinimized}
              onClick={() => setIsMinimized(!isMinimized)}
            />
          </div>
          <div 
            className={`flex items-start gap-2 ${displayStyles.isMobile ? 'flex-col' : 'justify-between gap-4'}`}
            style={{ textAlign: displayStyles.textAlign }}
          >
            <div className="flex-1 w-full min-w-0 overflow-hidden">
              <div className={`flex items-center gap-2 mb-2 ${displayStyles.isMobile ? "flex-wrap" : "justify-between"}`}>
                {!hideHeaderActions && (
                  <>
                    <div className="flex gap-1 flex-wrap">
                      <NotesDialog pasukId={pasukId} pasukText={formattedPasukText} />
                      <Button
                        variant="ghost"
                        size={displayStyles.isMobile ? "icon" : "sm"}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/commentaries/${seferId}/${pasuk.perek}/${pasuk.pasuk_num}`);
                        }}
                        className={displayStyles.isMobile ? "h-8 w-8" : "gap-2 h-8"}
                        title="פרשנים נוספים מספריא (נפתח בטאב חדש)"
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size={displayStyles.isMobile ? "icon" : "sm"}
                        onClick={(e) => {
                          e.stopPropagation();
                          sharePasukWhatsApp({
                            seferId,
                            perek: pasuk.perek,
                            pasukNum: pasuk.pasuk_num,
                            pasukText: formattedPasukText,
                            content: mergedContent,
                          });
                        }}
                        className={displayStyles.isMobile ? "h-8 w-8" : "gap-2 h-8"}
                        title="שתף בוואטסאפ"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size={displayStyles.isMobile ? "icon" : "sm"}
                        onClick={(e) => {
                          e.stopPropagation();
                          sharePasukEmail({
                            seferId,
                            perek: pasuk.perek,
                            pasukNum: pasuk.pasuk_num,
                            pasukText: formattedPasukText,
                            content: mergedContent,
                          });
                        }}
                        className={displayStyles.isMobile ? "h-8 w-8" : "gap-2 h-8"}
                        title="שתף במייל"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size={displayStyles.isMobile ? "icon" : "sm"}
                        onClick={(e) => {
                          e.stopPropagation();
                          sharePasukLink(seferId, pasuk.perek, pasuk.pasuk_num, formattedPasukText);
                        }}
                        className={displayStyles.isMobile ? "h-8 w-8" : "gap-2 h-8"}
                        title="שתף קישור לפסוק"
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Badge variant="outline" className={`font-bold flex-shrink-0 ${displayStyles.isMobile ? "text-xs" : ""}`}>
                      פרק {toHebrewNumber(pasuk.perek)} פסוק {toHebrewNumber(pasuk.pasuk_num)}
                    </Badge>
                  </>
                )}
              </div>
                <div className="w-full overflow-hidden" style={{ maxWidth: "100%" }}>
                  <PasukLineActions 
                    text={formattedPasukText}
                    onBookmark={() => toggleBookmark(pasukId, formattedPasukText)}
                  >
                    <ClickableText 
                      text={formattedPasukText} 
                      pasukId={pasukId}
                      fontFamily={settings.pasukFont}
                      fontSize={`${settings.pasukSize}px`}
                      color={settings.pasukColor}
                      fontWeight={settings.pasukBold ? "bold" : "normal"}
                      className="w-full block"
                      style={{
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal",
                        maxWidth: "100%",
                      }}
                    />
                  </PasukLineActions>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <MessageCircle className="h-3 w-3" />
                  {toHebrewNumber(totalQuestions)}
                </Badge>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <MessageSquare className="h-3 w-3" />
                  {toHebrewNumber(totalAnswers)}
                </Badge>
              </div>
          </div>
        </CardHeader>

        <CardContent 
          className="pt-4" 
          style={{
            display: "flex",
            flexDirection: "column",
            gap: displayStyles.gap,
            padding: displayStyles.isMobile ? "0.75rem" : "1rem",
            maxWidth: "100%",
            overflowX: "hidden",
          }}
        >
        {!effectiveMinimized && mergedContent.map((contentItem) => {
          const hasQuestions = contentItem.questions.length > 0;
          const isUserTitle = contentItem.title && typeof contentItem.id === 'number';
          
          // הצג אם יש שאלות או אם זו כותרת משתמש (גם בלי שאלות)
          if (!hasQuestions && !isUserTitle) return null;
          
          return (
            <div key={contentItem.id} className="space-y-3 w-full overflow-hidden" style={{ maxWidth: "100%" }}>
              {contentItem.title && (
                <div className="w-full overflow-hidden group/title relative hover:bg-muted/30 rounded-md transition-colors" style={{ maxWidth: "100%" }}>
                  {/* כותרות מ-Supabase (של המשתמש או משותפות) יכולות לקבל שאלות */}
                  {isSupabaseTitle(contentItem.id) && (
                    <div className="absolute top-0 left-0 flex gap-1">
                      <AddContentButton 
                        type="question"
                        onClick={(e) => {
                          e?.stopPropagation?.();
                          setEditorContext({ 
                            type: "question", 
                            titleId: contentItem.id,
                            defaultTab: "question" 
                          });
                          setEditorOpen(true);
                        }}
                      />
                      {/* Edit and Delete buttons - show only on hover if it's the user's title */}
                      {userTitles.find(t => t.id === contentItem.id) && (
                        <>
                           <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 opacity-0 group-hover/title:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTitle({ id: contentItem.id as number, title: contentItem.title || "" });
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 opacity-0 group-hover/title:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingTitle(contentItem.id as number);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                  <div className="w-full overflow-hidden pr-8 pl-20" style={{ maxWidth: "100%" }}>
                    <ClickableText
                      text={fixText(contentItem.title)}
                      pasukId={`${pasukId}-title-${String(contentItem.id)}`}
                      fontFamily={settings.titleFont}
                      fontSize={`${settings.titleSize}px`}
                      color={settings.titleColor}
                      fontWeight={settings.titleBold ? 'bold' : 'normal'}
                      className="text-sm border-r-2 border-accent pr-2 md:pr-3 block w-full"
                      style={{
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal",
                        maxWidth: "100%",
                      }}
                    />
                  </div>
                </div>
              )}
              
              {hasQuestions ? (
                contentItem.questions.map((question) => (
                  <QuestionSection 
                    key={question.id} 
                    question={question} 
                    showAnswers={true}
                    seferId={seferId}
                    perek={pasuk.perek}
                    pasukNum={pasuk.pasuk_num}
                    onAddAnswer={(questionId) => {
                      setEditorContext({ 
                        type: "answer", 
                        questionId,
                        defaultTab: "answer" 
                      });
                      setEditorOpen(true);
                    }}
                    onEditQuestion={(id, text) => setEditingQuestion({ id, text })}
                    onDeleteQuestion={(id) => setDeletingQuestion(id)}
                    onEditAnswer={(id, text, mefaresh) => setEditingAnswer({ id, text, mefaresh })}
                    onDeleteAnswer={(id) => setDeletingAnswer(id)}
                    displayMode={displayMode}
                    userQuestions={userQuestions}
                    userAnswers={userAnswers}
                  />
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-md bg-muted/30">
                  <p>אין שאלות עדיין לכותרת זו</p>
                  <p className="text-xs mt-1">לחץ על כפתור + ליד הכותרת להוספת שאלה</p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
    
    <ContentEditor
      pasukId={pasukId}
      pasukText={formattedPasukText}
      open={editorOpen}
      onOpenChange={setEditorOpen}
      initialContext={editorContext}
      defaultTab={editorContext?.defaultTab}
    />

    {/* Edit Dialogs */}
    <Dialog open={!!editingTitle} onOpenChange={(open) => !open && setEditingTitle(null)}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת כותרת</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label>כותרת</Label>
          <Input 
            value={editingTitle?.title || ""} 
            onChange={(e) => setEditingTitle(prev => prev ? {...prev, title: e.target.value} : null)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingTitle(null)}>ביטול</Button>
          <Button onClick={() => {
            if (editingTitle) {
              updateTitle(editingTitle.id, editingTitle.title);
              setEditingTitle(null);
            }
          }}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת שאלה</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label>שאלה</Label>
          <Textarea 
            value={editingQuestion?.text || ""} 
            onChange={(e) => setEditingQuestion(prev => prev ? {...prev, text: e.target.value} : null)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingQuestion(null)}>ביטול</Button>
          <Button onClick={() => {
            if (editingQuestion) {
              updateQuestion(editingQuestion.id, editingQuestion.text);
              setEditingQuestion(null);
            }
          }}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!editingAnswer} onOpenChange={(open) => !open && setEditingAnswer(null)}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת תשובה</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label>שם המפרש</Label>
            <Input 
              value={editingAnswer?.mefaresh || ""} 
              onChange={(e) => setEditingAnswer(prev => prev ? {...prev, mefaresh: e.target.value} : null)}
            />
          </div>
          <div>
            <Label>תשובה</Label>
            <Textarea 
              value={editingAnswer?.text || ""} 
              onChange={(e) => setEditingAnswer(prev => prev ? {...prev, text: e.target.value} : null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingAnswer(null)}>ביטול</Button>
          <Button onClick={() => {
            if (editingAnswer) {
              updateAnswer(editingAnswer.id, editingAnswer.text, editingAnswer.mefaresh);
              setEditingAnswer(null);
            }
          }}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialogs */}
    <AlertDialog open={!!deletingTitle} onOpenChange={(open) => !open && setDeletingTitle(null)}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>האם למחוק את הכותרת?</AlertDialogTitle>
          <AlertDialogDescription>
            פעולה זו לא ניתנת לביטול. כל השאלות והתשובות תחת כותרת זו יימחקו.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            if (deletingTitle) {
              deleteTitle(deletingTitle);
              setDeletingTitle(null);
            }
          }}>מחק</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!deletingQuestion} onOpenChange={(open) => !open && setDeletingQuestion(null)}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>האם למחוק את השאלה?</AlertDialogTitle>
          <AlertDialogDescription>
            פעולה זו לא ניתנת לביטול. כל התשובות לשאלה זו יימחקו.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            if (deletingQuestion) {
              deleteQuestion(deletingQuestion);
              setDeletingQuestion(null);
            }
          }}>מחק</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!deletingAnswer} onOpenChange={(open) => !open && setDeletingAnswer(null)}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>האם למחוק את התשובה?</AlertDialogTitle>
          <AlertDialogDescription>
            פעולה זו לא ניתנת לביטול.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            if (deletingAnswer) {
              deleteAnswer(deletingAnswer);
              setDeletingAnswer(null);
            }
          }}>מחק</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

const QuestionSection = memo(({ 
  question, 
  showAnswers = true,
  seferId,
  perek,
  pasukNum,
  onAddAnswer,
  onEditQuestion,
  onDeleteQuestion,
  onEditAnswer,
  onDeleteAnswer,
  displayMode,
  userQuestions,
  userAnswers,
}: { 
  question: any; 
  showAnswers?: boolean;
  seferId: number;
  perek: number;
  pasukNum: number;
  onAddAnswer?: (questionId: number) => void;
  onEditQuestion?: (id: number, text: string) => void;
  onDeleteQuestion?: (id: number) => void;
  onEditAnswer?: (id: number, text: string, mefaresh: string) => void;
  onDeleteAnswer?: (id: number) => void;
  displayMode?: string;
  userQuestions?: any[];
  userAnswers?: any[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useFontAndColorSettings();
  const displayStyles = useTextDisplayStyles();
  
  const isUserQuestion = userQuestions?.some(q => q.id === question.id);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
      }}
      className="space-y-2 w-full overflow-hidden"
      style={{ maxWidth: "100%" }}
    >
      <CollapsibleTrigger asChild>
        <div className="relative group/question">
          <Button
            variant="ghost"
            className="w-full justify-between h-auto text-right bg-muted/50 overflow-hidden hover:bg-muted/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsOpen(!isOpen);
            }}
            style={{
              padding: displayStyles.isMobile ? "0.75rem" : "1rem",
              maxWidth: "100%",
            }}
          >
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <Badge variant="outline" className="gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                {toHebrewNumber(question.perushim.length)}
              </Badge>
              {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            </div>
            <div className="flex-1 text-right min-w-0 overflow-hidden pr-2">
              <ClickableText
                text={fixText(question.text)}
                pasukId={`${question.id}-question`}
                fontFamily={settings.questionFont}
                fontSize={`${settings.questionSize}px`}
                color={settings.questionColor}
                fontWeight={settings.questionBold ? 'bold' : 'normal'}
                className="text-right w-full"
                style={{
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  whiteSpace: "normal",
                  maxWidth: "100%",
                  display: "block",
                }}
              />
            </div>
          </Button>
          {isUserQuestion && onEditQuestion && onDeleteQuestion && (
            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover/question:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditQuestion(question.id, question.text);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteQuestion(question.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CollapsibleTrigger>

      {showAnswers && (
        <CollapsibleContent className="space-y-3 pr-2 md:pr-4 w-full overflow-hidden" style={{ maxWidth: "100%" }}>
          {question.perushim.map((perush: any) => (
            <AnswerSection 
              key={perush.id} 
              perush={perush} 
              parentOpen={isOpen}
              seferId={seferId}
              perek={perek}
              pasukNum={pasukNum}
              onAddAnswer={onAddAnswer ? () => onAddAnswer(parseInt(question.id)) : undefined}
              onEditAnswer={onEditAnswer}
              onDeleteAnswer={onDeleteAnswer}
              userAnswers={userAnswers}
            />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
});

const AnswerSection = memo(({ 
  perush, 
  parentOpen,
  seferId,
  perek,
  pasukNum,
  onAddAnswer,
  onEditAnswer,
  onDeleteAnswer,
  userAnswers,
}: { 
  perush: any; 
  parentOpen?: boolean;
  seferId: number;
  perek: number;
  pasukNum: number;
  onAddAnswer?: () => void;
  onEditAnswer?: (id: number, text: string, mefaresh: string) => void;
  onDeleteAnswer?: (id: number) => void;
  userAnswers?: any[];
}) => {
  const { settings } = useFontAndColorSettings();
  const displayStyles = useTextDisplayStyles();
  // Always open when parent question is open
  const isOpen = parentOpen || false;
  
  const isUserAnswer = userAnswers?.some(a => a.id === perush.id);

  return (
    <div className="space-y-2 w-full overflow-hidden group/answer relative hover:bg-muted/20 rounded-md transition-colors p-2" style={{ maxWidth: "100%" }}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {onAddAnswer && (
            <AddContentButton 
              type="answer"
              onClick={(e) => {
                e?.stopPropagation?.(); // מונע מהקליק להעביר לפסוק הראשי
                onAddAnswer();
              }}
            />
          )}
          <Badge className="font-bold bg-yellow-400/80 text-gray-900 border-0 px-2 md:px-3 py-1 text-xs md:text-sm break-words">
            {normalizeMefareshName(perush.mefaresh)}
          </Badge>
          {isUserAnswer && onEditAnswer && onDeleteAnswer && (
            <div className="flex gap-1 opacity-0 group-hover/answer:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditAnswer(perush.id, perush.text, perush.mefaresh);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAnswer(perush.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
      </div>
      
      <TextSelectionShare
        seferId={seferId}
        perek={perek}
        pasukNum={pasukNum}
        mefaresh={normalizeMefareshName(perush.mefaresh)}
      >
        <div 
          className="bg-card rounded-md border-r-2 border-accent w-full overflow-hidden"
          style={{
            padding: displayStyles.isMobile ? "0.75rem" : "1rem",
            maxWidth: "100%",
          }}
        >
          <ClickableText
            text={fixText(perush.text)}
            pasukId={`${perush.id}-answer`}
            fontFamily={settings.commentaryFont}
            fontSize={`${settings.commentarySize}px`}
            color={settings.commentaryColor}
            fontWeight={settings.commentaryBold ? 'bold' : 'normal'}
            className="leading-relaxed w-full block"
            style={{
              wordWrap: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "normal",
              lineHeight: settings.commentaryLineHeight === 'normal' ? '1.6' : settings.commentaryLineHeight === 'relaxed' ? '1.9' : '2.2',
              maxWidth: settings.commentaryMaxWidth === 'narrow' ? '600px' : settings.commentaryMaxWidth === 'medium' ? '800px' : settings.commentaryMaxWidth === 'wide' ? '1000px' : '100%',
              margin: '0 auto',
            }}
          />
        </div>
      </TextSelectionShare>
    </div>
  );
});

export const PasukDisplay = memo(PasukDisplayBase);
export default PasukDisplay;
