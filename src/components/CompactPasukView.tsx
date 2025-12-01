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
            onClick={() => {
              console.log('CompactPasukView: card clicked', { pasukId: pasuk.id });
              togglePasuk(pasuk.id);
            }}
          >
            {/* Compact Pasuk Display - Clickable */}
            <div
              className={cn(
                "w-full p-4 sm:p-6 transition-all duration-200 group touch-manipulation",
                !isExpanded && "hover:bg-accent/30"
              )}
            >
              {/* Header - Single Row Layout */}
              <div className="flex items-center justify-between gap-4 mb-3 pointer-events-none" dir="rtl">
                {/* Right Side - Pasuk Number + Metadata (horizontal) */}
                <div className="flex items-center gap-3">
                  {/* Pasuk Number in Circle */}
                  <div className={cn(
                    "w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 transition-all duration-200",
                    "group-hover:bg-primary/20"
                  )}>
                    <span className="font-bold text-primary text-xl font-['Frank_Ruhl_Libre']">
                      {toHebrewNumber(pasuk.pasuk_num)}
                    </span>
                  </div>
                  
                  {/* Metadata - Horizontal Display */}
                  <div className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                    {pasuk.parsha_name} • פרק {toHebrewNumber(pasuk.perek)} • פסוק {toHebrewNumber(pasuk.pasuk_num)}
                  </div>
                </div>

                {/* Left Side - Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Always Visible Icons (green box) */}
                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleCommentaries(e, pasuk)}
                      className="h-9 w-9 hover:bg-accent/50 transition-colors"
                      title="פרשנים נוספים"
                    >
                      <BookOpen className="h-4 w-4" />
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
                      onClick={(e) => handleBookmark(e, pasuk)}
                      className="h-9 w-9 hover:bg-accent/50 transition-colors"
                      title={isBookmarked(`${seferId}-${pasuk.perek}-${pasuk.pasuk_num}`) ? "הסר סימניה" : "הוסף סימניה"}
                    >
                      {isBookmarked(`${seferId}-${pasuk.perek}-${pasuk.pasuk_num}`) ? (
                        <BookmarkCheck className="h-4 w-4 fill-primary text-primary" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Hover-Only Icons (red box) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleAddContent(e, pasuk)}
                      className="h-8 w-8 hover:bg-accent/50 transition-colors"
                      title="הוסף תוכן"
                    >
                      <StickyNote className="h-4 w-4" />
                    </Button>
                    
                    <div className="cursor-pointer">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-primary" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Pasuk Text - Only when not expanded */}
              {!isExpanded && (
                <div className="mt-3" style={{ textAlign: displayStyles.textAlign }}>
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
                </div>
              )}
            </div>

            {/* Expanded Content */}
            {isExpanded && !forceMinimized && (
              <div
                className="border-t border-border animate-accordion-down"
                onClick={(e) => {
                  console.log('CompactPasukView: click inside PasukDisplay wrapper', { pasukId: pasuk.id });
                  e.stopPropagation();
                }}
              >
                <PasukDisplay
                  pasuk={pasuk}
                  seferId={seferId}
                  forceMinimized={false}
                  hideHeaderActions={true}
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
