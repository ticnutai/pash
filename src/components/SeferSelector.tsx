import { useState, useMemo, useCallback } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sefer } from "@/types/torah";
import { toHebrewNumber } from "@/utils/hebrewNumbers";

interface SeferSelectorProps {
  sefer: Sefer | null;
  selectedSefer: number;
  onSeferSelect: (seferId: number) => void;
  selectedParsha: number | null;
  onParshaSelect: (parshaId: number | null) => void;
  selectedPerek: number | null;
  onPerekSelect: (perekNum: number | null) => void;
  selectedPasuk: number | null;
  onPasukSelect: (pasukNum: number | null) => void;
}

const SEFARIM = [
  { id: 1, name: "בראשית", color: "from-blue-600 to-blue-800" },
  { id: 2, name: "שמות", color: "from-indigo-600 to-indigo-800" },
  { id: 3, name: "ויקרא", color: "from-purple-600 to-purple-800" },
  { id: 4, name: "במדבר", color: "from-amber-600 to-amber-800" },
  { id: 5, name: "דברים", color: "from-emerald-600 to-emerald-800" },
] as const;

type SelectionLevel = "sefer" | "parsha" | "perek" | "pasuk";

export const SeferSelector = ({
  sefer,
  selectedSefer,
  onSeferSelect,
  selectedParsha,
  onParshaSelect,
  selectedPerek,
  onPerekSelect,
  selectedPasuk,
  onPasukSelect,
}: SeferSelectorProps) => {
  const [level, setLevel] = useState<SelectionLevel>("sefer");

  const handleSeferClick = useCallback((seferId: number) => {
    onSeferSelect(seferId);
    onParshaSelect(null);
    onPerekSelect(null);
    onPasukSelect(null);
    setLevel("parsha");
  }, [onSeferSelect, onParshaSelect, onPerekSelect, onPasukSelect]);

  const handleParshaClick = useCallback((parshaId: number) => {
    onParshaSelect(parshaId);
    onPerekSelect(null);
    onPasukSelect(null);
    setLevel("perek");
  }, [onParshaSelect, onPerekSelect, onPasukSelect]);

  const handlePerekClick = useCallback((perekNum: number) => {
    onPerekSelect(perekNum);
    onPasukSelect(null);
    setLevel("pasuk");
  }, [onPerekSelect, onPasukSelect]);

  const handlePasukClick = useCallback((pasukNum: number) => {
    onPasukSelect(pasukNum);
    setLevel("sefer");
  }, [onPasukSelect]);

  const handleBack = useCallback(() => {
    if (level === "pasuk") {
      setLevel("perek");
      onPasukSelect(null);
    } else if (level === "perek") {
      setLevel("parsha");
      onPerekSelect(null);
    } else if (level === "parsha") {
      setLevel("sefer");
      onParshaSelect(null);
      onPerekSelect(null);
      onPasukSelect(null);
    }
  }, [level, onParshaSelect, onPerekSelect, onPasukSelect]);

  const showBack = level !== "sefer";

  return (
    <div className="space-y-3 sm:space-y-4 bg-card rounded-lg shadow-md p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-2" dir="rtl">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button size="sm" onClick={handleBack} className="h-10 px-5 text-sm font-bold bg-accent text-accent-foreground hover:bg-accent/90 border-0">
              חזרה
            </Button>
          )}
          <h2 className="font-bold text-base sm:text-lg">
            {level === "sefer" && "בחר חומש"}
            {level === "parsha" && "בחר פרשה"}
            {level === "perek" && "בחר פרק"}
            {level === "pasuk" && "בחר פסוק"}
          </h2>
        </div>
      </div>

      {level === "sefer" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 animate-fade-in">
          {SEFARIM.map((s) => (
            <Button
              key={s.id}
              variant={selectedSefer === s.id ? "default" : "outline"}
              onClick={() => handleSeferClick(s.id)}
              className={cn(
                "h-auto py-4 sm:py-6 flex flex-col gap-2 transition-all duration-200 touch-manipulation",
                "text-base sm:text-lg min-h-[80px] sm:min-h-[100px]",
                selectedSefer === s.id && "shadow-lg ring-2 ring-primary"
              )}
            >
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-base sm:text-lg font-bold leading-tight whitespace-nowrap">{s.name}</span>
            </Button>
          ))}
        </div>
      )}

      {level === "parsha" && sefer && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 animate-fade-in" dir="rtl">
          {sefer.parshiot.map((parsha) => (
            <Button
              key={parsha.parsha_id}
              variant={selectedParsha === parsha.parsha_id ? "default" : "outline"}
              onClick={() => handleParshaClick(parsha.parsha_id)}
              className="h-auto py-3 sm:py-4 text-sm sm:text-base break-words whitespace-normal transition-all duration-200"
            >
              {parsha.parsha_name}
            </Button>
          ))}
        </div>
      )}

      {level === "perek" && sefer && selectedParsha !== null && (
        <div key={`${selectedSefer}-${selectedParsha}`} className="grid grid-cols-5 sm:grid-cols-8 gap-1.5 sm:gap-2 animate-fade-in" dir="rtl">
          {sefer.parshiot
            .find((p) => p.parsha_id === selectedParsha)?.perakim.map((perek) => (
              <Button
                key={perek.perek_num}
                variant={selectedPerek === perek.perek_num ? "default" : "outline"}
                onClick={() => handlePerekClick(perek.perek_num)}
                className="aspect-square font-bold text-sm sm:text-base transition-all duration-200"
              >
                {toHebrewNumber(perek.perek_num)}
              </Button>
            ))}
        </div>
      )}

      {level === "pasuk" && sefer && selectedParsha !== null && selectedPerek !== null && (
        <div key={`${selectedSefer}-${selectedParsha}-${selectedPerek}`} className="grid grid-cols-5 sm:grid-cols-8 gap-1.5 sm:gap-2 animate-fade-in" dir="rtl">
          {sefer.parshiot
            .find((p) => p.parsha_id === selectedParsha)?.perakim
            .find((p) => p.perek_num === selectedPerek)?.pesukim.map((pasuk) => (
              <Button
                key={pasuk.pasuk_num}
                variant={selectedPasuk === pasuk.pasuk_num ? "default" : "outline"}
                onClick={() => handlePasukClick(pasuk.pasuk_num)}
                className="aspect-square text-xs sm:text-sm font-bold transition-all duration-200"
              >
                {toHebrewNumber(pasuk.pasuk_num)}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
};
