import { useState, useMemo, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toHebrewNumber } from "@/utils/hebrewNumbers";
import { Sefer } from "@/types/torah";
import { Circle, ArrowRight, Home } from "lucide-react";
import { useDevice } from "@/contexts/DeviceContext";

type SelectionLevel = "parsha" | "perek" | "pasuk";

interface FloatingQuickSelectorProps {
  sefer: Sefer | null;
  selectedParsha: number | null;
  onParshaSelect: (parsha: number | null) => void;
  selectedPerek: number | null;
  onPerekSelect: (perek: number | null) => void;
  totalPesukimInPerek: number;
  selectedPasuk: number | null;
  onPasukSelect: (pasuk: number | null) => void;
}

export const FloatingQuickSelector = ({
  sefer,
  selectedParsha,
  onParshaSelect,
  selectedPerek,
  onPerekSelect,
  totalPesukimInPerek,
  selectedPasuk,
  onPasukSelect,
}: FloatingQuickSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<SelectionLevel>("parsha");
  const { isMobile } = useDevice();

  // Reset to parsha level when sefer changes
  useEffect(() => {
    setCurrentLevel("parsha");
    setOpen(false);
  }, [sefer?.sefer_id]);

  // Keep the dialog in sync with the actual selection state
  useEffect(() => {
    if (!open) return;

    if (selectedParsha === null) {
      setCurrentLevel("parsha");
      return;
    }

    if (selectedPerek === null) {
      setCurrentLevel("perek");
      return;
    }

    setCurrentLevel("pasuk");
  }, [open, selectedParsha, selectedPerek]);

  // Get perakim for the selected parsha only
  const perakimToShow = useMemo(() => {
    if (!sefer || selectedParsha === null) return [];
    const parsha = sefer.parshiot.find(p => p.parsha_id === selectedParsha);
    return parsha?.perakim || [];
  }, [sefer, selectedParsha]);

  const selectedParshaName = useMemo(() => {
    if (!sefer || selectedParsha === null) return null;
    return sefer.parshiot.find(p => p.parsha_id === selectedParsha)?.parsha_name ?? null;
  }, [sefer, selectedParsha]);

  const pesukimWithContent = useMemo(() => {
    if (!sefer || selectedPerek === null) return new Set<number>();
    
    const contentSet = new Set<number>();
    for (const parsha of sefer.parshiot) {
      for (const perek of parsha.perakim) {
        if (perek.perek_num === selectedPerek) {
          perek.pesukim.forEach(pasuk => {
            if (pasuk.content && pasuk.content.length > 0) {
              contentSet.add(pasuk.pasuk_num);
            }
          });
        }
      }
    }
    return contentSet;
  }, [sefer, selectedPerek]);

  const handleParshaSelect = (parshaId: number) => {
    onParshaSelect(parshaId);
    onPerekSelect(null);
    onPasukSelect(null);
    setCurrentLevel("perek");
  };

  const handlePerekSelect = (perekNum: number) => {
    onPerekSelect(perekNum);
    onPasukSelect(null);
    setCurrentLevel("pasuk");
  };

  const handlePasukSelect = (pasukNum: number) => {
    onPasukSelect(pasukNum);
    setOpen(false); // Close popover after selecting a pasuk
  };

  const handleBack = () => {
    if (currentLevel === "pasuk") {
      setCurrentLevel("perek");
      onPasukSelect(null);
    } else if (currentLevel === "perek") {
      setCurrentLevel("parsha");
      onPerekSelect(null);
      onPasukSelect(null);
    }
  };

  const handleReset = () => {
    setCurrentLevel("parsha");
    onParshaSelect(null);
    onPerekSelect(null);
    onPasukSelect(null);
  };

  const getCurrentTitle = () => {
    if (currentLevel === "parsha") {
      return "בחר פרשה";
    } else if (currentLevel === "perek") {
      const parsha = sefer?.parshiot.find(p => p.parsha_id === selectedParsha);
      return `בחר פרק - ${parsha?.parsha_name || ""}`;
    } else {
      return `בחר פסוק - פרק ${toHebrewNumber(selectedPerek || 0)}`;
    }
  };

  if (!sefer) return null;

  const selectedButtonClass = "border-accent text-primary";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          className={cn(
            "fixed bottom-4 left-4 rounded-full shadow-xl z-50 touch-manipulation",
            "bg-primary hover:bg-primary/90 text-white active:scale-95 border-2 border-white",
            "transition-colors duration-200",
            isMobile ? "h-14 w-14" : "h-11 w-11"
          )}
          aria-label="פתח בחירה מהירה"
        >
          <Circle className={cn(isMobile ? "h-3.5 w-3.5" : "h-3 w-3", "text-white stroke-[3]")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        dir="rtl"
        className="w-[320px] max-h-[400px] p-0 overflow-hidden border border-accent bg-card text-foreground"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b p-3 flex items-center justify-between gap-2" dir="rtl">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {currentLevel !== "parsha" && (
              <Button
                size="sm"
                onClick={handleBack}
                className="h-8 px-3 flex-shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
              >
                <ArrowRight className="h-4 w-4 ml-1" />
                חזור
              </Button>
            )}
            <h3 className="font-semibold text-sm break-words flex-1 text-right">{getCurrentTitle()}</h3>
          </div>
          {currentLevel !== "parsha" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2 flex-shrink-0"
            >
              <Home className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Breadcrumb tabs: Sefer / Parsha / Perek */}
        <div className="px-3 py-2 border-b bg-card" dir="rtl">
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className={cn("h-9 px-4 font-bold whitespace-nowrap", selectedButtonClass)}
              title="חזרה לבחירת פרשה"
            >
              {sefer.sefer_name}
            </Button>

            {selectedParshaName && (
              <>
                <span className="text-muted-foreground select-none">›</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onPerekSelect(null);
                    onPasukSelect(null);
                    setCurrentLevel("perek");
                  }}
                  className={cn("h-9 px-4 font-bold whitespace-nowrap", selectedButtonClass)}
                  title="חזרה לבחירת פרק"
                >
                  {selectedParshaName}
                </Button>
              </>
            )}

            {selectedPerek !== null && (
              <>
                <span className="text-muted-foreground select-none">›</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onPasukSelect(null);
                    setCurrentLevel("pasuk");
                  }}
                  className={cn("h-9 px-4 font-bold whitespace-nowrap", selectedButtonClass)}
                  title="חזרה לבחירת פסוק"
                >
                  פרק {toHebrewNumber(selectedPerek)}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[320px]">
          <div className="p-3 space-y-2" dir="rtl">
            {currentLevel === "parsha" && (
              <>
                {sefer.parshiot.map((parsha) => (
                  <Button
                    key={parsha.parsha_id}
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-right h-auto py-3 px-4 touch-manipulation break-words whitespace-normal",
                      selectedParsha === parsha.parsha_id && selectedButtonClass
                    )}
                    onClick={() => handleParshaSelect(parsha.parsha_id)}
                  >
                    <span className="font-semibold break-words">{parsha.parsha_name}</span>
                  </Button>
                ))}
              </>
            )}

            {currentLevel === "perek" && selectedParsha !== null && (
              <>
                {perakimToShow.map((perek) => (
                  <Button
                    key={perek.perek_num}
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-right h-auto py-3 px-4 touch-manipulation",
                      selectedPerek === perek.perek_num && selectedButtonClass
                    )}
                    onClick={() => handlePerekSelect(perek.perek_num)}
                  >
                    <span className="font-semibold">
                      פרק {toHebrewNumber(perek.perek_num)}
                    </span>
                  </Button>
                ))}
              </>
            )}

            {currentLevel === "pasuk" && selectedPerek !== null && (
              <>
                {Array.from({ length: totalPesukimInPerek }, (_, i) => i + 1).map((pasukNum) => {
                  const hasContent = pesukimWithContent.has(pasukNum);
                  return (
                    <Button
                      key={pasukNum}
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right h-auto py-3 px-4 touch-manipulation",
                        selectedPasuk === pasukNum && selectedButtonClass,
                        !hasContent && "opacity-50"
                      )}
                      onClick={() => handlePasukSelect(pasukNum)}
                      disabled={!hasContent}
                    >
                      <span className="font-semibold">
                        פסוק {toHebrewNumber(pasukNum)}
                      </span>
                      {hasContent && (
                        <span className="h-2 w-2 rounded-full bg-accent" />
                      )}
                    </Button>
                  );
                })}
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
