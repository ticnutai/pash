import { useState, useEffect, useCallback } from "react";
import { Download, Trash2, HardDrive, CheckCircle2, Loader2, Database, BookOpen, MessageSquare, Bookmark, Palette, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { torahDB } from "@/utils/torahDB";
import { downloadAllSefarim, clearAllSeferCache } from "@/utils/lazyLoadSefer";

const SEFER_NAMES = ['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים'];

interface StoredInfo {
  seferId: number;
  timestamp: number;
  sizeMB: number;
}

interface DataStatus {
  sefarim: StoredInfo[];
  userDataKeys: string[];
  commentaryCount: number;
  totalSizeMB: number;
}

export const LocalDBManager = () => {
  const [status, setStatus] = useState<DataStatus>({
    sefarim: [],
    userDataKeys: [],
    commentaryCount: 0,
    totalSizeMB: 0,
  });
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ completed: 0, total: 5, current: '' });
  const [open, setOpen] = useState(false);

  const loadStatus = useCallback(async () => {
    const [sefarim, totalSizeMB, commentaryCount] = await Promise.all([
      torahDB.getStoredSefarim(),
      torahDB.getTotalSize(),
      torahDB.getCommentaryCount(),
    ]);

    // Check which user data keys exist
    const userDataKeys: string[] = [];
    for (const key of ['highlights', 'notes', 'personal_questions', 'bookmarks', 'content']) {
      const hasData = await torahDB.hasUserData(key);
      if (hasData) userDataKeys.push(key);
    }

    setStatus({
      sefarim,
      userDataKeys,
      commentaryCount,
      totalSizeMB: Math.round(totalSizeMB * 10) / 10,
    });
  }, []);

  useEffect(() => {
    if (open) {
      loadStatus();
    }
  }, [open, loadStatus]);

  const handleDownloadAll = async () => {
    setDownloading(true);
    setDownloadProgress({ completed: 0, total: 5, current: SEFER_NAMES[0] });
    
    try {
      await downloadAllSefarim((completed, total, currentName) => {
        setDownloadProgress({ completed, total, current: currentName });
      });
      
      toast.success("כל החומשים נשמרו בהצלחה! הטעינה תהיה מהירה מעכשיו");
      await loadStatus();
    } catch (error) {
      console.error('Download error:', error);
      toast.error("שגיאה בהורדת הנתונים");
    } finally {
      setDownloading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      await torahDB.clearAll();
      clearAllSeferCache();
      toast.success("כל הנתונים המקומיים נמחקו");
      await loadStatus();
    } catch (error) {
      toast.error("שגיאה במחיקת הנתונים");
    }
  };

  const handleClearSefarim = async () => {
    try {
      await clearAllSeferCache();
      toast.success("חומשים מקומיים נמחקו");
      await loadStatus();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  const handleClearUserData = async () => {
    try {
      await torahDB.clearUserData();
      toast.success("נתוני משתמש מקומיים נמחקו");
      await loadStatus();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  const handleClearCommentaries = async () => {
    try {
      await torahDB.clearCommentaries();
      toast.success("מפרשים מקומיים נמחקו");
      await loadStatus();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  const allSefarimStored = status.sefarim.length === 5;
  const progressPercent = (downloadProgress.completed / downloadProgress.total) * 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <HardDrive className="h-4 w-4" />
          <span>ניהול אחסון מקומי</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] text-right" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-end">
            <span>אחסון מקומי</span>
            <Database className="h-5 w-5" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
            <div className="flex justify-between">
              <span className="font-mono">{status.totalSizeMB} MB</span>
              <span>סה"כ נפח</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono">{status.sefarim.length}/5</span>
              <span>חומשים מאוחסנים</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono">{status.commentaryCount}</span>
              <span>מפרשים מאוחסנים</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono">{status.userDataKeys.length}</span>
              <span>סוגי נתוני משתמש</span>
            </div>
          </div>

          {/* Sefarim Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearSefarim}
                disabled={status.sefarim.length === 0}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <h4 className="font-semibold flex items-center gap-1">
                <span>חומשים</span>
                <BookOpen className="h-4 w-4" />
              </h4>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {SEFER_NAMES.map((name, i) => {
                const stored = status.sefarim.find(s => s.seferId === i + 1);
                return (
                  <div
                    key={i}
                    className={`text-center text-xs p-1.5 rounded ${
                      stored ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {stored ? <CheckCircle2 className="h-3 w-3 mx-auto mb-0.5" /> : null}
                    {name}
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Data Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearUserData}
                disabled={status.userDataKeys.length === 0}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <h4 className="font-semibold flex items-center gap-1">
                <span>נתוני משתמש (קאש מקומי)</span>
                <FileText className="h-4 w-4" />
              </h4>
            </div>
            <div className="text-xs text-muted-foreground">
              {status.userDataKeys.length > 0 
                ? `מאוחסן: ${status.userDataKeys.join(', ')}`
                : 'אין נתוני משתמש מקומיים'
              }
            </div>
          </div>

          {/* Commentaries Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearCommentaries}
                disabled={status.commentaryCount === 0}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <h4 className="font-semibold flex items-center gap-1">
                <span>מפרשים</span>
                <MessageSquare className="h-4 w-4" />
              </h4>
            </div>
            <div className="text-xs text-muted-foreground">
              {status.commentaryCount > 0
                ? `${status.commentaryCount} קבצי מפרשים מאוחסנים`
                : 'אין מפרשים מאוחסנים'
              }
            </div>
          </div>

          {/* Download Progress */}
          {downloading && (
            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>{downloadProgress.completed}/{downloadProgress.total}</span>
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  מוריד: {downloadProgress.current}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center pt-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              disabled={downloading || (status.sefarim.length === 0 && status.userDataKeys.length === 0 && status.commentaryCount === 0)}
              className="gap-1"
            >
              <Trash2 className="h-3 w-3" />
              <span>מחק הכל</span>
            </Button>
            <Button
              onClick={handleDownloadAll}
              disabled={downloading || allSefarimStored}
              className="gap-1"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : allSefarimStored ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{allSefarimStored ? 'כל החומשים מאוחסנים' : 'הורד את כל החומשים'}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
