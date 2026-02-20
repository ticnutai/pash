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
    <div className="fixed left-0 top-[140px] md:top-[160px] w-80 md:w-96 h-[calc(100vh-160px)] bg-background border-r border-border shadow-lg z-40 animate-fade-in flex flex-col">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex gap-1">
          <Button
            variant={mode === "pasuk" ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange("pasuk")}
            className="gap-1.5"
          >
            <BookOpen className="h-4 w-4" />
            פירושים
          </Button>
          <Button
            variant={mode === "user" ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange("user")}
            className="gap-1.5"
          >
            <User className="h-4 w-4" />
            שלי ({totalUserItems})
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
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
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">בחר פסוק</p>
          <p className="text-sm mt-2">לחץ על פסוק בטקסט כדי לראות את הפירושים והשאלות</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4">
        {/* Selected pasuk header */}
        <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="text-sm text-muted-foreground mb-1">
            {pasuk.parsha_name} • פרק {toHebrewNumber(pasuk.perek)} • פסוק {toHebrewNumber(pasuk.pasuk_num)}
          </div>
          <div className="text-lg font-['Frank_Ruhl_Libre'] leading-relaxed" dir="rtl">
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
          <div className="text-center py-8 text-muted-foreground">
            <p>אין תוכן לפסוק זה</p>
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <User className="h-12 w-12 mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground mb-4">יש להתחבר כדי לצפות בתוכן שלך</p>
        <Button onClick={() => navigate("/auth")}>התחברות</Button>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-3">
        {/* Bookmarks Section */}
        <Collapsible open={expandedSections.bookmarks} onOpenChange={() => toggleSection('bookmarks')}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between p-3 h-auto">
                <div className="flex items-center gap-2">
                  <BookmarkIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">סימניות</span>
                  <span className="text-xs text-muted-foreground">({bookmarks.length})</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.bookmarks && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto">
                {bookmarks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">אין סימניות</p>
                ) : (
                  bookmarks.map((bookmark) => (
                    <div key={bookmark.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{formatPasukLocation(bookmark.pasukId)}</p>
                        <p className="truncate" dir="rtl">{bookmark.pasukText?.slice(0, 50)}...</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateToPasuk(bookmark.pasukId)}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeBookmark(bookmark.id)}>
                          <Trash2 className="h-3 w-3" />
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
          <Card className="overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between p-3 h-auto">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">הערות</span>
                  <span className="text-xs text-muted-foreground">({notes.length})</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.notes && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">אין הערות</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{formatPasukLocation(note.pasukId)}</p>
                        <p className="truncate" dir="rtl">{note.content}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateToPasuk(note.pasukId)}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteNote(note.id)}>
                          <Trash2 className="h-3 w-3" />
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
          <Card className="overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between p-3 h-auto">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">שאלות</span>
                  <span className="text-xs text-muted-foreground">({questions.length})</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.questions && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto">
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">אין שאלות</p>
                ) : (
                  questions.map((question) => (
                    <div key={question.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{formatPasukLocation(question.pasukId)}</p>
                        <p className="truncate" dir="rtl">{question.question}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateToPasuk(question.pasukId)}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteQuestion(question.id)}>
                          <Trash2 className="h-3 w-3" />
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
          <Card className="overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between p-3 h-auto">
                <div className="flex items-center gap-2">
                  <Highlighter className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">הדגשות</span>
                  <span className="text-xs text-muted-foreground">({highlights.length})</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.highlights && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto">
                {highlights.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">אין הדגשות</p>
                ) : (
                  highlights.map((highlight) => (
                    <div key={highlight.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{formatPasukLocation(highlight.pasukId)}</p>
                        <p className={cn("truncate rounded px-1", highlight.color)} dir="rtl">{highlight.text}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateToPasuk(highlight.pasukId)}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeHighlight(highlight.id)}>
                          <Trash2 className="h-3 w-3" />
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
