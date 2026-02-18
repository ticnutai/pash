import { useState, useEffect, useCallback } from "react";
import { Download, Trash2, HardDrive, CheckCircle2, Loader2, Database, BookOpen, MessageSquare, Bookmark, Palette, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { torahDB } from "@/utils/torahDB";
import { downloadAllSefarim, clearAllSeferCache } from "@/utils/lazyLoadSefer";
import { downloadAllCommentaries, clearCommentaryCache } from "@/utils/sefariaCommentaries";

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
  commentaryKeys: string[];
  totalSizeMB: number;
}

/**
 * LocalDBManager — inline storage management panel.
 * Shows storage stats, download buttons for sefarim & commentaries, and clear buttons.
 * Designed to be embedded directly inside a Settings tab.
 */
export const LocalDBManager = () => {
  const [status, setStatus] = useState<DataStatus>({
    sefarim: [],
    userDataKeys: [],
    commentaryCount: 0,
    commentaryKeys: [],
    totalSizeMB: 0,
  });
  const [downloading, setDownloading] = useState(false);
  const [downloadingCommentaries, setDownloadingCommentaries] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ completed: 0, total: 5, current: '' });
  const [commentaryProgress, setCommentaryProgress] = useState({ completed: 0, total: 45, current: '' });
  const [initialized, setInitialized] = useState(false);

  const loadStatus = useCallback(async () => {
    const [sefarim, totalSizeMB, commentaryCount, commentaryKeys] = await Promise.all([
      torahDB.getStoredSefarim(),
      torahDB.getTotalSize(),
      torahDB.getCommentaryCount(),
      torahDB.getStoredCommentaryKeys(),
    ]);

    const userDataKeys: string[] = [];
    for (const key of ['highlights', 'notes', 'personal_questions', 'bookmarks', 'content']) {
      const hasData = await torahDB.hasUserData(key);
      if (hasData) userDataKeys.push(key);
    }

    setStatus({
      sefarim,
      userDataKeys,
      commentaryCount,
      commentaryKeys,
      totalSizeMB: Math.round(totalSizeMB * 10) / 10,
    });
  }, []);

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      loadStatus();
    }
  }, [initialized, loadStatus]);

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
      clearCommentaryCache();
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
      clearCommentaryCache();
      toast.success("מפרשים מקומיים נמחקו");
      await loadStatus();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  const handleDownloadCommentaries = async () => {
    setDownloadingCommentaries(true);
    setCommentaryProgress({ completed: 0, total: 45, current: '' });
    
    try {
      await downloadAllCommentaries((completed, total, current) => {
        setCommentaryProgress({ completed, total, current });
      });
      
      toast.success("כל המפרשים הזמינים נשמרו בהצלחה!");
      await loadStatus();
    } catch (error) {
      console.error('Commentary download error:', error);
      toast.error("שגיאה בהורדת המפרשים");
    } finally {
      setDownloadingCommentaries(false);
    }
  };

  const allSefarimStored = status.sefarim.length === 5;
  const progressPercent = (downloadProgress.completed / downloadProgress.total) * 100;
  const commentaryProgressPercent = (commentaryProgress.completed / commentaryProgress.total) * 100;
  const hasAnyData = status.sefarim.length > 0 || status.userDataKeys.length > 0 || status.commentaryCount > 0;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Summary Card */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3 justify-end">
          <h3 className="font-semibold text-base">סטטוס אחסון מקומי</h3>
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2.5 bg-muted/50 rounded-lg text-center">
            <div className="font-mono text-lg font-bold text-primary">{status.totalSizeMB} MB</div>
            <div className="text-xs text-muted-foreground">סה"כ נפח</div>
          </div>
          <div className="p-2.5 bg-muted/50 rounded-lg text-center">
            <div className="font-mono text-lg font-bold text-primary">{status.sefarim.length}/5</div>
            <div className="text-xs text-muted-foreground">חומשים</div>
          </div>
          <div className="p-2.5 bg-muted/50 rounded-lg text-center">
            <div className="font-mono text-lg font-bold text-primary">{status.commentaryCount}</div>
            <div className="text-xs text-muted-foreground">מפרשים</div>
          </div>
          <div className="p-2.5 bg-muted/50 rounded-lg text-center">
            <div className="font-mono text-lg font-bold text-primary">{status.userDataKeys.length}</div>
            <div className="text-xs text-muted-foreground">נתוני משתמש</div>
          </div>
        </div>
      </Card>

      {/* Sefarim Section */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearSefarim}
            disabled={status.sefarim.length === 0 || downloading}
            className="text-destructive hover:text-destructive h-7 px-2"
          >
            <Trash2 className="h-3 w-3 ml-1" />
            <span className="text-xs">מחק</span>
          </Button>
          <h4 className="font-semibold flex items-center gap-1.5">
            <span>חומשים</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </h4>
        </div>
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {SEFER_NAMES.map((name, i) => {
            const stored = status.sefarim.find(s => s.seferId === i + 1);
            return (
              <div
                key={i}
                className={`text-center text-xs p-2 rounded-lg transition-colors ${
                  stored 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                    : 'bg-muted text-muted-foreground border border-transparent'
                }`}
              >
                {stored ? <CheckCircle2 className="h-3.5 w-3.5 mx-auto mb-0.5" /> : null}
                {name}
              </div>
            );
          })}
        </div>
        <Button
          onClick={handleDownloadAll}
          disabled={downloading || downloadingCommentaries || allSefarimStored}
          className="w-full gap-2"
          size="sm"
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

        {downloading && (
          <div className="space-y-2 mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono">{downloadProgress.completed}/{downloadProgress.total}</span>
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                מוריד: {downloadProgress.current}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}
      </Card>

      {/* Commentaries Section */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearCommentaries}
            disabled={status.commentaryCount === 0 || downloadingCommentaries}
            className="text-destructive hover:text-destructive h-7 px-2"
          >
            <Trash2 className="h-3 w-3 ml-1" />
            <span className="text-xs">מחק</span>
          </Button>
          <h4 className="font-semibold flex items-center gap-1.5">
            <span>מפרשים</span>
            <MessageSquare className="h-4 w-4 text-primary" />
          </h4>
        </div>
        <div className="text-xs text-muted-foreground mb-3">
          {status.commentaryCount > 0
            ? `${status.commentaryCount} רשומות מפרשים מאוחסנות מקומית`
            : 'אין מפרשים מאוחסנים — הורדה תאפשר גישה מהירה ואופליין'
          }
        </div>
        <Button
          onClick={handleDownloadCommentaries}
          disabled={downloadingCommentaries || downloading}
          className="w-full gap-2"
          size="sm"
          variant="outline"
        >
          {downloadingCommentaries ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          <span>הורד את כל המפרשים הזמינים</span>
        </Button>

        {downloadingCommentaries && (
          <div className="space-y-2 mt-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono">{commentaryProgress.completed}/{commentaryProgress.total}</span>
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                מוריד: {commentaryProgress.current}
              </span>
            </div>
            <Progress value={commentaryProgressPercent} className="h-2" />
          </div>
        )}
      </Card>

      {/* User Data Section */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearUserData}
            disabled={status.userDataKeys.length === 0}
            className="text-destructive hover:text-destructive h-7 px-2"
          >
            <Trash2 className="h-3 w-3 ml-1" />
            <span className="text-xs">מחק</span>
          </Button>
          <h4 className="font-semibold flex items-center gap-1.5">
            <span>נתוני משתמש (קאש מקומי)</span>
            <FileText className="h-4 w-4 text-primary" />
          </h4>
        </div>
        <div className="text-xs text-muted-foreground">
          {status.userDataKeys.length > 0 
            ? `מאוחסן: ${status.userDataKeys.join(', ')}`
            : 'אין נתוני משתמש מקומיים'
          }
        </div>
      </Card>

      {/* Clear All */}
      <div className="flex justify-center pt-1">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearAll}
          disabled={downloading || downloadingCommentaries || !hasAnyData}
          className="gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>מחק את כל הנתונים המקומיים</span>
        </Button>
      </div>

      {/* Info */}
      <div className="text-sm text-muted-foreground text-right p-4 bg-muted/30 rounded-lg space-y-2">
        <p className="font-semibold">💾 מידע על אחסון מקומי</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>הנתונים נשמרים ב-IndexedDB של הדפדפן</li>
          <li>הורדה מאפשרת גישה מהירה ללא חיבור לאינטרנט</li>
          <li>מפרשים שנטענו מ-API נשמרים אוטומטית לשימוש חוזר</li>
          <li>ניתן למחוק נתונים מקומיים בכל עת — הנתונים בשרת לא ייפגעו</li>
        </ul>
      </div>
    </div>
  );
};
