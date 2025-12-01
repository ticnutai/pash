import { useState } from "react";
import { StickyNote, Plus, Trash2, Edit2, HelpCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useNotes } from "@/contexts/NotesContext";
import { toast } from "sonner";

interface NotesDialogProps {
  pasukId: string;
  pasukText: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const NotesDialog = ({ pasukId, pasukText, open: externalOpen, onOpenChange }: NotesDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [noteContent, setNoteContent] = useState("");
  const [questionContent, setQuestionContent] = useState("");
  const [answerContent, setAnswerContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const {
    addNote,
    updateNote,
    deleteNote,
    getNotesForPasuk,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    getQuestionsForPasuk,
  } = useNotes();

  const notes = getNotesForPasuk(pasukId);
  const questions = getQuestionsForPasuk(pasukId);

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    
    if (editingNoteId) {
      updateNote(editingNoteId, noteContent);
      toast.success("ההערה עודכנה");
      setEditingNoteId(null);
    } else {
      addNote(pasukId, noteContent);
      toast.success("ההערה נוספה בהצלחה");
    }
    setNoteContent("");
  };

  const handleAddQuestion = () => {
    if (!questionContent.trim()) return;

    if (editingQuestionId) {
      updateQuestion(editingQuestionId, questionContent, answerContent);
      toast.success("השאלה עודכנה");
      setEditingQuestionId(null);
    } else {
      addQuestion(pasukId, questionContent);
      toast.success("השאלה נוספה בהצלחה");
    }
    setQuestionContent("");
    setAnswerContent("");
  };

  const startEditNote = (noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setNoteContent(content);
  };

  const startEditQuestion = (questionId: string, question: string, answer?: string) => {
    setEditingQuestionId(questionId);
    setQuestionContent(question);
    setAnswerContent(answer || "");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <StickyNote className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-2xl max-h-[600px] overflow-y-auto text-right"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-end">
            <span>הערות ושאלות אישיות</span>
            <StickyNote className="h-5 w-5" />
          </DialogTitle>
          <DialogDescription className="text-right">
            <span className="hebrew-text text-sm">{pasukText}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="notes" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes">
              <StickyNote className="h-4 w-4 ml-2" />
              הערות ({notes.length})
            </TabsTrigger>
            <TabsTrigger value="questions">
              <HelpCircle className="h-4 w-4 ml-2" />
              שאלות ({questions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>הוסף הערה חדשה</Label>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="כתוב את ההערה שלך כאן..."
                className="min-h-[100px] text-right"
              />
              <Button onClick={handleAddNote} className="w-full">
                <Plus className="h-4 w-4 ml-2" />
                {editingNoteId ? "עדכן הערה" : "הוסף הערה"}
              </Button>
            </div>

            <div className="space-y-2">
              {notes.map((note) => (
                <Card key={note.id} className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEditNote(note.id, note.content)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          deleteNote(note.id);
                          toast.success("ההערה נמחקה");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm flex-1 text-right">{note.content}</p>
                  </div>
                </Card>
              ))}
              {notes.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  עדיין לא הוספת הערות לפסוק זה
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>הוסף שאלה חדשה</Label>
              <Textarea
                value={questionContent}
                onChange={(e) => setQuestionContent(e.target.value)}
                placeholder="כתוב את השאלה שלך..."
                className="min-h-[80px] text-right"
              />
              <Label>תשובה (אופציונלי)</Label>
              <Textarea
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                placeholder="כתוב תשובה לשאלה..."
                className="min-h-[80px] text-right"
              />
              <Button onClick={handleAddQuestion} className="w-full">
                <Plus className="h-4 w-4 ml-2" />
                {editingQuestionId ? "עדכן שאלה" : "הוסף שאלה"}
              </Button>
            </div>

            <div className="space-y-2">
              {questions.map((q) => (
                <Card key={q.id} className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEditQuestion(q.id, q.question, q.answer)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          deleteQuestion(q.id);
                          toast.success("השאלה נמחקה");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="flex items-start gap-2 mb-2">
                        <HelpCircle className="h-4 w-4 text-accent shrink-0 mt-1" />
                        <p className="text-sm font-semibold">{q.question}</p>
                      </div>
                      {q.answer && (
                        <div className="flex items-start gap-2 mr-6 text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-1" />
                          <p className="text-sm">{q.answer}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {questions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  עדיין לא הוספת שאלות לפסוק זה
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
