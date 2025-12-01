import { Eye, EyeOff, Layers, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDisplayMode, DisplayMode } from "@/contexts/DisplayModeContext";
import { useState } from "react";

interface ViewModeToggleProps {
  seferId: number;
}

export const ViewModeToggle = ({ seferId }: ViewModeToggleProps) => {
  const { displaySettings, updateDisplaySettings } = useDisplayMode();
  const safeSettings = displaySettings || { mode: 'full' as const, pasukCount: 20 };
  const [customCount, setCustomCount] = useState((safeSettings.pasukCount || 20).toString());

  const modes: { value: DisplayMode; label: string; icon: React.ReactNode }[] = [
    { value: "full", label: "הצג הכל", icon: <Eye className="h-4 w-4 ml-2" /> },
    { value: "scroll", label: "תצוגת חומש", icon: <Layers className="h-4 w-4 ml-2" /> },
    { value: "compact", label: "תצוגה רצופה", icon: <Layers className="h-4 w-4 ml-2" /> },
    { value: "verses-only", label: "פסוקים בלבד", icon: <Layers className="h-4 w-4 ml-2" /> },
    { value: "verses-questions", label: "פסוקים ושאלות", icon: <Layers className="h-4 w-4 ml-2" /> },
    { value: "minimized", label: "מזער הכל", icon: <EyeOff className="h-4 w-4 ml-2" /> },
  ];

  const counts = [10, 20, 30];

  const handleCustomCount = () => {
    const num = parseInt(customCount);
    if (num > 0) {
      updateDisplaySettings({ pasukCount: num });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Layers className="h-4 w-4" />
          <span>מצב תצוגה</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-right">בחר מצב תצוגה</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {modes.map((mode) => (
          <DropdownMenuItem
            key={mode.value}
            onClick={() => updateDisplaySettings({ mode: mode.value })}
            className="justify-end"
          >
            <span className="flex items-center">
              {mode.label}
              {mode.icon}
            </span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-right flex items-center gap-2">
          <Hash className="h-4 w-4" />
          <span>כמות פסוקים</span>
        </DropdownMenuLabel>
        
        <div className="px-2 py-1 space-y-2">
          <div className="flex gap-2">
        {counts.map((count) => (
          <Button
            key={count}
            variant={safeSettings.pasukCount === count ? "default" : "outline"}
            size="sm"
            onClick={() => updateDisplaySettings({ pasukCount: count })}
            className="flex-1"
          >
                {count}
              </Button>
            ))}
          </div>
          
          <div className="flex gap-2 items-center">
            <Button onClick={handleCustomCount} size="sm" variant="secondary">
              אישר
            </Button>
            <Input
              type="number"
              value={customCount}
              onChange={(e) => setCustomCount(e.target.value)}
              placeholder="אישי"
              className="flex-1 h-8"
              min="1"
            />
            <Label className="text-xs text-muted-foreground">אישי:</Label>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
