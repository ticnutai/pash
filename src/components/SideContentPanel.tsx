import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bookmark as BookmarkIcon, 
  StickyNote, 
  Highlighter, 
  HelpCircle, 
  X,
  ExternalLink,
  Trash2,
  ChevronDown,
  User,
  BookOpen
} from "lucide-react";
import { useBookmarks } from "@/contexts/BookmarksContext";
import { useNotes } from "@/contexts/NotesContext";
import { useHighlights } from "@/contexts/HighlightsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { parsePasukId } from "@/utils/names";
import { FlatPasuk } from "@/types/torah";
import { PasukDisplay } from "@/components/PasukDisplay";
import { toHebrewNumber } from "@/utils/hebrewNumbers";
import { Bookmark as BookmarkType } from "@/contexts/BookmarksContext";
import { Note, PersonalQuestion } from "@/contexts/NotesContext";
import { Highlight } from "@/contexts/HighlightsContext";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { NavigateFunction } from "react-router-dom";
import { useDevice } from "@/contexts/DeviceContext";

type PanelMode = "user" | "pasuk";

interface SideContentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mode: PanelMode;
  onModeChange: (mode: PanelMode) => void;
  selectedPasuk: FlatPasuk | null;
  seferId: number;
  inGrid?: boolean;
}

export const SideContentPanel = ({ 
  isOpen, 
  onClose, 
  mode, 
  onModeChange,
  selectedPasuk,
  seferId,
  inGrid = false
}: SideContentPanelProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useDevice();
  const { bookmarks, removeBookmark } = useBookmarks();
  const { notes, questions, deleteNote, deleteQuestion } = useNotes();
  const { highlights, removeHighlight } = useHighlights();

  const [expandedSections, setExpandedSections] = useState({
    bookmarks: true,
    notes: true,
    questions: true,
    highlights: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const navigateToPasuk = (pasukId: string) => {
    const parsed = parsePasukId(pasukId);
    if (parsed) {
      navigate(`/?sefer=${parsed.sefer}&perek=${parsed.perek}&pasuk=${parsed.pasuk}`);
    }
  };

  const formatPasukLocation = (pasukId: string) => {
    const parsed = parsePasukId(pasukId);
    if (parsed) {
      return `פרק ${parsed.perek} פסוק ${parsed.pasuk}`;
    }
    return pasukId;
  };

  const totalUserItems = bookmarks.length + notes.length + questions.length + highlights.length;

  const panelContent = (
    <div className="flex flex-col h-full space-y-4" dir="rtl">
      {/* Header with mode toggle - only for desktop (mobile gets SheetHeader) */}
      {!isMobile && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2">
            <Button
              variant={mode === "pasuk" ? "default" : "outline"}
              size="sm"
              onClick={() => onModeChange("pasuk")}
              className={cn("gap-2 font-semibold", mode === "pasuk" ? "shadow-sm" : "")}
            >
              <BookOpen className="h-4 w-4" />
              פירושים
            </Button>
            <Button
              variant={mode === "user" ? "default" : "outline"}
              size="sm"
              onClick={() => onModeChange("user")}
              className={cn("gap-2 font-semibold", mode === "user" ? "shadow-sm" : "")}
            >
              <User className="h-4 w-4" />
              שלי ({totalUserItems})
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive rounded-full h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Mobile mode tabs inside sheet */}
      {isMobile && (
        <div className="flex gap-2 px-3 pt-2 pb-2 border-b border-border flex-shrink-0">
          <Button
            variant={mode === "pasuk" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange("pasuk")}
            className={cn("flex-1 gap-2 font-semibold", mode === "pasuk" ? "shadow-sm" : "")}
          >
            <BookOpen className="h-4 w-4" />
            פירושים
          </Button>
          <Button
            variant={mode === "user" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange("user")}
            className={cn("flex-1 gap-2 font-semibold", mode === "user" ? "shadow-sm" : "")}
          >
            <User className="h-4 w-4" />
            שלי ({totalUserItems})
          </Button>
        </div>
      )}

      {/* Content based on mode */}
      <div className="flex-1 overflow-hidden">
        {mode === "pasuk" ? (
          <PasukContentView pasuk={selectedPasuk} seferId={seferId} />
        ) : (
          <UserContentView
            user={user}
            bookmarks={bookmarks}
            notes={notes}
            questions={questions}
            highlights={highlights}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            navigateToPasuk={navigateToPasuk}
            formatPasukLocation={formatPasukLocation}
            removeBookmark={removeBookmark}
            deleteNote={deleteNote}
            deleteQuestion={deleteQuestion}
            removeHighlight={removeHighlight}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  );

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          dir="rtl"
          className="h-[85vh] p-0 border-t border-border bg-card text-foreground rounded-t-lg flex flex-col"
        >
          <div className="flex justify-center pt-2 pb-1 flex-shrink-0" aria-hidden="true">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </div>
          <SheetHeader className="px-4 pt-4 pb-0 flex-shrink-0">
            <SheetTitle className="text-right text-foreground flex items-center justify-end gap-2">
              <span>{mode === "pasuk" ? "פירושים" : "התוכן שלי"}</span>
              {mode === "pasuk" ? <BookOpen className="h-5 w-5 text-accent" /> : <User className="h-5 w-5 text-accent" />}
            </SheetTitle>
          </SheetHeader>
          {panelContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: in-grid panel (overlaid on left margin, same height as verse cards & quick selector)
  if (inGrid) {
    if (!isOpen) return null;
    return (
      <Card
        dir="rtl"
        data-layout="side-panel" data-layout-label="\ud83d\udccb \u05e4\u05d0\u05e0\u05dc \u05ea\u05d5\u05db\u05df \u05e6\u05d3\u05d9"
        className="p-4 h-fit w-full animate-fade-in flex flex-col overflow-y-auto"
      >
        {panelContent}
      </Card>
    );
  }

  // Desktop: side panel (legacy fixed position)
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-30 md:hidden animate-fade-in"
        onClick={onClose}
      />
      <Card
        dir="rtl"
        data-layout="side-panel" data-layout-label="\ud83d\udccb \u05e4\u05d0\u05e0\u05dc \u05ea\u05d5\u05db\u05df \u05e6\u05d3\u05d9"
        className="fixed left-0 top-[460px] md:top-[470px] w-80 md:w-96 max-h-[calc(100vh-470px)] p-4 z-40 animate-fade-in flex flex-col overflow-y-auto ml-1"
      >
        {panelContent}
      </Card>
    </>
  );
};

// Pasuk content view component
const PasukContentView = ({ 
  pasuk, 
  seferId 
}: { 
  pasuk: FlatPasuk | null; 
  seferId: number;
}) => {
  if (!pasuk) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center h-full" dir="rtl">
        <div className="text-muted-foreground space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-accent/60" />
          </div>
          <p className="text-lg font-semibold">בחר פסוק</p>
          <p className="text-sm leading-relaxed">לחץ על פסוק בטקסט כדי לראות<br/>את הפירושים והשאלות</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 sm:p-5" dir="rtl">
        {/* Selected pasuk header */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
          <div className="text-sm text-muted-foreground mb-2 font-medium">
            {pasuk.parsha_name} • פרק {toHebrewNumber(pasuk.perek)} • פסוק {toHebrewNumber(pasuk.pasuk_num)}
          </div>
          <div className="text-lg font-['Frank_Ruhl_Libre'] leading-relaxed">
            {pasuk.text}
          </div>
        </div>

        {/* Pasuk content (titles, questions, commentaries) */}
        {pasuk.content && pasuk.content.length > 0 ? (
          <PasukDisplay 
            pasuk={pasuk} 
            seferId={seferId}
            forceMinimized={false}
          />
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">אין תוכן לפסוק זה</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

// User content view component
interface UserContentViewProps {
  user: SupabaseUser | null;
  bookmarks: BookmarkType[];
  notes: Note[];
  questions: PersonalQuestion[];
  highlights: Highlight[];
  expandedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
  navigateToPasuk: (pasukId: string) => void;
  formatPasukLocation: (pasukId: string) => string;
  removeBookmark: (id: string) => void;
  deleteNote: (id: string) => void;
  deleteQuestion: (id: string) => void;
  removeHighlight: (id: string) => void;
  navigate: NavigateFunction;
}

const UserContentView = ({
  user,
  bookmarks,
  notes,
  questions,
  highlights,
  expandedSections,
  toggleSection,
  navigateToPasuk,
  formatPasukLocation,
  removeBookmark,
  deleteNote,
  deleteQuestion,
  removeHighlight,
  navigate,
}: UserContentViewProps) => {
  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full" dir="rtl">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-5">
          <User className="h-8 w-8 text-accent/60" />
        </div>
        <p className="text-muted-foreground mb-5 text-sm leading-relaxed">יש להתחבר כדי לצפות בתוכן שלך</p>
        <Button onClick={() => navigate("/auth")} className="shadow-md">התחברות</Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4" dir="rtl">
        {/* Bookmarks Section */}
        <Collapsible open={expandedSections.bookmarks} onOpenChange={() => toggleSection('bookmarks')}>
          <Card className="overflow-hidden border-border shadow-sm">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between px-3 py-3 h-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookmarkIcon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-sm">סימניות</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">({bookmarks.length})</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform text-muted-foreground", expandedSections.bookmarks && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-2.5 max-h-52 overflow-y-auto">
                {bookmarks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">אין סימניות</p>
                ) : (
                  bookmarks.map((bookmark) => (
                    <div key={bookmark.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 text-sm group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{formatPasukLocation(bookmark.pasukId)}</p>
                        <p className="truncate text-foreground">{bookmark.pasukText?.slice(0, 50)}...</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => navigateToPasuk(bookmark.pasukId)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10" onClick={() => removeBookmark(bookmark.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Notes Section */}
        <Collapsible open={expandedSections.notes} onOpenChange={() => toggleSection('notes')}>
          <Card className="overflow-hidden border-border shadow-sm">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between px-3 py-3 h-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <StickyNote className="h-4 w-4 text-yellow-500" />
                  </div>
                  <span className="font-semibold text-sm">הערות</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">({notes.length})</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform text-muted-foreground", expandedSections.notes && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-2.5 max-h-52 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">אין הערות</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 text-sm group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{formatPasukLocation(note.pasukId)}</p>
                        <p className="truncate text-foreground">{note.content}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => navigateToPasuk(note.pasukId)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10" onClick={() => deleteNote(note.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Questions Section */}
        <Collapsible open={expandedSections.questions} onOpenChange={() => toggleSection('questions')}>
          <Card className="overflow-hidden border-border shadow-sm">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between px-3 py-3 h-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <HelpCircle className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="font-semibold text-sm">שאלות</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">({questions.length})</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform text-muted-foreground", expandedSections.questions && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-2.5 max-h-52 overflow-y-auto">
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">אין שאלות</p>
                ) : (
                  questions.map((question) => (
                    <div key={question.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 text-sm group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{formatPasukLocation(question.pasukId)}</p>
                        <p className="truncate text-foreground">{question.question}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => navigateToPasuk(question.pasukId)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10" onClick={() => deleteQuestion(question.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Highlights Section */}
        <Collapsible open={expandedSections.highlights} onOpenChange={() => toggleSection('highlights')}>
          <Card className="overflow-hidden border-border shadow-sm">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between px-3 py-3 h-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Highlighter className="h-4 w-4 text-orange-500" />
                  </div>
                  <span className="font-semibold text-sm">הדגשות</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">({highlights.length})</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform text-muted-foreground", expandedSections.highlights && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-2.5 max-h-52 overflow-y-auto">
                {highlights.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">אין הדגשות</p>
                ) : (
                  highlights.map((highlight) => (
                    <div key={highlight.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 text-sm group">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: highlight.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{formatPasukLocation(highlight.pasukId)}</p>
                        <p className="truncate text-foreground">{highlight.text}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10" onClick={() => removeHighlight(highlight.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </ScrollArea>
  );
};
