import { useState } from "react";
import { FlatPasuk } from "@/types/torah";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Bookmark, BookmarkCheck, BookOpen, StickyNote } from "lucide-react";
import { toHebrewNumber } from "@/utils/hebrewNumbers";
import { formatTorahText } from "@/utils/textUtils";
import { PasukDisplay } from "@/components/PasukDisplay";
import { useTextDisplayStyles } from "@/hooks/useTextDisplayStyles";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { useBookmarks } from "@/contexts/BookmarksContext";
import { Button } from "@/components/ui/button";
import { NotesDialog } from "@/components/NotesDialog";
import { ContentEditor } from "@/components/ContentEditor";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CompactPasukViewProps {
  pesukim: FlatPasuk[];
  seferId: number;
  forceMinimized?: boolean;
}

export const CompactPasukView = ({ pesukim, seferId, forceMinimized = false }: CompactPasukViewProps) => {
  const [expandedPasukId, setExpandedPasukId] = useState<number | null>(null);
  const [editorPasukId, setEditorPasukId] = useState<string | null>(null);
  const displayStyles = useTextDisplayStyles();
  const { settings } = useFontAndColorSettings();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const navigate = useNavigate();

  const togglePasuk = (pasukId: number) => {
    setExpandedPasukId(expandedPasukId === pasukId ? null : pasukId);
  };

  const handleBookmark = (e: React.MouseEvent, pasuk: FlatPasuk) => {
    e.stopPropagation();
    const pasukId = `${seferId}-${pasuk.perek}-${pasuk.pasuk_num}`;
    toggleBookmark(pasukId, pasuk.text);
    toast.success(isBookmarked(pasukId) ? "הסימניה הוסרה" : "הסימניה נוספה");
  };

  const handleCommentaries = (e: React.MouseEvent, pasuk: FlatPasuk) => {
    e.stopPropagation();
    navigate(`/commentaries?sefer=${seferId}&perek=${pasuk.perek}&pasuk=${pasuk.pasuk_num}`);
  };

  const handleAddContent = (e: React.MouseEvent, pasuk: FlatPasuk) => {
    e.stopPropagation();
    const pasukId = `${seferId}-${pasuk.perek}-${pasuk.pasuk_num}`;
    console.log('🔍 CompactPasukView - Opening editor with pasukId:', pasukId);
    setEditorPasukId(pasukId);
  };

  return (
    <div 
      className="flex flex-col animate-fade-in"
      style={{ gap: displayStyles.gap }}
    >
      {pesukim.map((pasuk) => {
        const isExpanded = expandedPasukId === pasuk.id;
        
        return (
          <Card 
            key={pasuk.id} 
            className={cn(
              "overflow-hidden w-full transition-all duration-300 border-r-4 cursor-pointer",
              isExpanded ? "border-r-primary shadow-xl ring-2 ring-primary/50" : "border-r-accent shadow-sm hover:shadow-md"
            )}
            style={{
              maxWidth: displayStyles.maxWidth,
              margin: displayStyles.margin,
              wordWrap: "break-word",
              overflowWrap: "break-word",
              minHeight: isExpanded ? 'auto' : '100px',
              contain: 'layout style',
            }}
            onClick={() => togglePasuk(pasuk.id)}
          >
            {/* Compact Pasuk Display - Clickable */}
            <div
              className={cn(
                "w-full text-right p-4 sm:p-6 transition-all duration-200 group overflow-hidden touch-manipulation",
                !isExpanded && "hover:bg-accent/30",
                isExpanded ? "min-h-[60px]" : "min-h-[80px]"
              )}
            >
              <div className="flex items-start gap-3 sm:gap-4 w-full pointer-events-none">
                {/* Pasuk Number */}
                <div className={cn(
                  "flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-200",
                  isExpanded ? "w-12 h-12 sm:w-14 sm:h-14" : "w-14 h-14 sm:w-16 sm:h-16 group-hover:bg-primary/20"
                )}>
                  <span className={cn(
                    "font-bold text-primary font-['Frank_Ruhl_Libre'] transition-colors duration-200",
                    isExpanded ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
                  )}>
                    {toHebrewNumber(pasuk.pasuk_num)}
                  </span>
                </div>

                {/* Pasuk Text or Info */}
                <div className="flex-1 overflow-hidden" style={{ textAlign: displayStyles.textAlign }}>
                  <div className="text-sm sm:text-base text-muted-foreground mb-2 font-medium transition-colors duration-200">
                    {pasuk.parsha_name} • פרק {toHebrewNumber(pasuk.perek)} • פסוק {toHebrewNumber(pasuk.pasuk_num)}
                  </div>
                  
                  {/* Always show text in compact view */}
                  <p 
                    className="text-lg sm:text-xl leading-relaxed font-['Frank_Ruhl_Libre'] line-clamp-3 font-medium transition-all duration-200"
                    style={{ 
                      fontFamily: settings.pasukFont,
                      fontSize: `calc(${settings.pasukSize}px * ${displayStyles.fontScale})`,
                      color: settings.pasukColor,
                      fontWeight: settings.pasukBold ? "bold" : "normal",
                      lineHeight: displayStyles.lineHeight,
                      letterSpacing: displayStyles.letterSpacing,
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      direction: "rtl",
                      textAlign: 'justify',
                      textAlignLast: 'right',
                    }}
                  >
                    {formatTorahText(pasuk.text)}
                  </p>
                  
                  {/* Action Buttons */}
                  <div className={cn(
                    "flex items-center gap-1 pointer-events-auto mt-3"
                  )}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleBookmark(e, pasuk)}
                      title="סימניה"
                    >
                      {isBookmarked(`${seferId}-${pasuk.perek}-${pasuk.pasuk_num}`) ? (
                        <BookmarkCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <div onClick={(e) => e.stopPropagation()}>
                      <NotesDialog
                        pasukId={`${seferId}-${pasuk.perek}-${pasuk.pasuk_num}`}
                        pasukText={pasuk.text}
                      />
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleAddContent(e, pasuk)}
                      title="הוסף תוכן"
                    >
                      <StickyNote className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleCommentaries(e, pasuk)}
                      title="פרשנים נוספים"
                    >
                      <BookOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expand/Collapse Icon */}
                <div className="flex-shrink-0 pt-2 transition-colors duration-200">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary transition-colors duration-200" />
                  ) : (
                    <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && !forceMinimized && (
              <div className="border-t border-border animate-accordion-down">
                <PasukDisplay 
                  pasuk={pasuk} 
                  seferId={seferId}
                  forceMinimized={false}
                />
              </div>
            )}
          </Card>
        );
      })}

      {pesukim.length === 0 && (
        <Card className="p-12 text-center animate-fade-in">
          <p className="text-lg text-muted-foreground">
            אין פסוקים להצגה
          </p>
        </Card>
      )}

      {editorPasukId && (
        <ContentEditor
          pasukId={editorPasukId}
          pasukText={pesukim.find(p => `${seferId}-${p.perek}-${p.pasuk_num}` === editorPasukId)?.text || ""}
          open={!!editorPasukId}
          onOpenChange={(open) => !open && setEditorPasukId(null)}
        />
      )}
    </div>
  );
};

export default memo(CompactPasukView);
