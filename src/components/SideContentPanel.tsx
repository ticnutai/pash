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

type PanelMode = "user" | "pasuk";

interface SideContentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mode: PanelMode;
  onModeChange: (mode: PanelMode) => void;
  selectedPasuk: FlatPasuk | null;
  seferId: number;
}

export const SideContentPanel = ({ 
  isOpen, 
  onClose, 
  mode, 
  onModeChange,
  selectedPasuk,
  seferId
}: SideContentPanelProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  if (!isOpen) return null;

  const totalUserItems = bookmarks.length + notes.length + questions.length + highlights.length;

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/40 z-30 md:hidden animate-fade-in"
        onClick={onClose}
      />
      <div 
        dir="rtl"
        className="fixed left-0 top-[140px] md:top-[160px] w-80 md:w-96 h-[calc(100vh-140px)] md:h-[calc(100vh-160px)] bg-background border-2 border-[#C5A55A]/60 rounded-l-xl shadow-2xl z-40 animate-fade-in flex flex-col overflow-hidden"
      >
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#C5A55A]/30 bg-gradient-to-l from-amber-50/40 to-transparent dark:from-amber-900/10">
        <div className="flex gap-2">
          <Button
            variant={mode === "pasuk" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange("pasuk")}
            className={cn("gap-2 font-semibold", mode === "pasuk" ? "shadow-md" : "border-[#C5A55A]/40 hover:bg-amber-50/50 dark:hover:bg-amber-900/20")}
          >
            <BookOpen className={cn("h-4 w-4", mode === "pasuk" ? "text-white" : "text-[#C5A55A]")} />
            פירושים
          </Button>
          <Button
            variant={mode === "user" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange("user")}
            className={cn("gap-2 font-semibold", mode === "user" ? "shadow-md" : "border-[#C5A55A]/40 hover:bg-amber-50/50 dark:hover:bg-amber-900/20")}
          >
            <User className={cn("h-4 w-4", mode === "user" ? "text-white" : "text-[#C5A55A]")} />
            שלי ({totalUserItems})
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive rounded-full">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content based on mode */}
      {mode === "pasuk" ? (
        <PasukContentView 
          pasuk={selectedPasuk} 
          seferId={seferId} 
        />
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
      <div className="flex-1 flex items-center justify-center p-8 text-center" dir="rtl">
        <div className="text-muted-foreground space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#C5A55A]/10 flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-[#C5A55A]/60" />
          </div>
          <p className="text-lg font-semibold">בחר פסוק</p>
          <p className="text-sm leading-relaxed">לחץ על פסוק בטקסט כדי לראות<br/>את הפירושים והשאלות</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-5" dir="rtl">
        {/* Selected pasuk header */}
        <div className="mb-5 p-4 bg-gradient-to-l from-primary/8 to-primary/3 rounded-xl border border-[#C5A55A]/30 shadow-sm">
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" dir="rtl">
        <div className="w-16 h-16 rounded-full bg-[#C5A55A]/10 flex items-center justify-center mb-5">
          <User className="h-8 w-8 text-[#C5A55A]/60" />
        </div>
        <p className="text-muted-foreground mb-5 text-sm leading-relaxed">יש להתחבר כדי לצפות בתוכן שלך</p>
        <Button onClick={() => navigate("/auth")} className="shadow-md">התחברות</Button>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4" dir="rtl">
        {/* Bookmarks Section */}
        <Collapsible open={expandedSections.bookmarks} onOpenChange={() => toggleSection('bookmarks')}>
          <Card className="overflow-hidden border-[#C5A55A]/20 shadow-sm">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between px-4 py-3.5 h-auto hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
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
                    <div key={bookmark.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 text-sm group hover:bg-muted/70 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{formatPasukLocation(bookmark.pasukId)}</p>
                        <p className="truncate text-foreground">{bookmark.pasukText?.slice(0, 50)}...</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <Card className="overflow-hidden border-[#C5A55A]/20 shadow-sm">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between px-4 py-3.5 h-auto hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
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
                    <div key={note.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 text-sm group hover:bg-muted/70 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{formatPasukLocation(note.pasukId)}</p>
                        <p className="truncate text-foreground">{note.content}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <Card className="overflow-hidden border-[#C5A55A]/20 shadow-sm">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between px-4 py-3.5 h-auto hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
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
                    <div key={question.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 text-sm group hover:bg-muted/70 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{formatPasukLocation(question.pasukId)}</p>
                        <p className="truncate text-foreground">{question.question}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <Card className="overflow-hidden border-[#C5A55A]/20 shadow-sm">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between px-4 py-3.5 h-auto hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
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
                    <div key={highlight.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 text-sm group hover:bg-muted/70 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{formatPasukLocation(highlight.pasukId)}</p>
                        <p className={cn("truncate rounded-md px-1.5 py-0.5", highlight.color)}>{highlight.text}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => navigateToPasuk(highlight.pasukId)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10" onClick={() => removeHighlight(highlight.id)}>
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
      </div>
    </ScrollArea>
  );
};
