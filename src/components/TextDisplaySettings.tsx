import { AlignRight, AlignCenter, AlignLeft, Space, Palette, AlignJustify, Type, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";

export const TextDisplaySettings = () => {
  const { settings, updateSettings } = useFontAndColorSettings();

  const alignmentLabels: Record<string, string> = {
    right: "ימין",
    center: "מרכז",
    left: "שמאל",
  };

  const spacingLabels: Record<string, string> = {
    compact: "צפוף",
    normal: "רגיל",
    comfortable: "נוח",
    spacious: "מרווח",
  };

  const lineHeightLabels: Record<string, string> = {
    tight: "צמוד",
    normal: "רגיל",
    relaxed: "רגוע",
    loose: "רפוי",
  };

  const widthLabels: Record<string, string> = {
    narrow: "צר",
    normal: "רגיל",
    wide: "רחב",
    full: "מלא",
  };

  const letterSpacingLabels: Record<string, string> = {
    tight: "צמוד",
    normal: "רגיל",
    wide: "רחב",
    wider: "רחב יותר",
  };

  const alignmentValues = ["right", "center", "left"] as const;
  const spacingValues = ["compact", "normal", "comfortable", "spacious"] as const;
  const lineHeightValues = ["tight", "normal", "relaxed", "loose"] as const;
  const widthValues = ["narrow", "normal", "wide", "full"] as const;
  const letterSpacingValues = ["tight", "normal", "wide", "wider"] as const;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white hover:text-white hover:bg-white/10"
          title="הגדרות תצוגת טקסט"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-right">תצוגת טקסט</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Text Alignment */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-right">
            <AlignRight className="ml-2 h-4 w-4" />
            יישור טקסט
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{alignmentLabels[settings.textAlignment]}</span>
                <div className="flex gap-2">
                  <AlignRight className="h-4 w-4 text-muted-foreground" />
                  <AlignCenter className="h-4 w-4 text-muted-foreground" />
                  <AlignLeft className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <Slider
                value={[alignmentValues.indexOf(settings.textAlignment)]}
                onValueChange={([value]) => updateSettings({ textAlignment: alignmentValues[value] })}
                min={0}
                max={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>שמאל</span>
                <span>מרכז</span>
                <span>ימין</span>
              </div>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Content Spacing */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-right">
            <Space className="ml-2 h-4 w-4" />
            מרווח תוכן
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {settings.contentSpacing === "custom" 
                    ? `מותאם: ${settings.contentSpacingCustom}rem`
                    : spacingLabels[settings.contentSpacing]}
                </span>
              </div>
              <Slider
                value={[settings.contentSpacing === "custom" 
                  ? spacingValues.length 
                  : spacingValues.indexOf(settings.contentSpacing as typeof spacingValues[number])]}
                onValueChange={([value]) => {
                  if (value < spacingValues.length) {
                    updateSettings({ contentSpacing: spacingValues[value] });
                  } else {
                    updateSettings({ contentSpacing: "custom" });
                  }
                }}
                min={0}
                max={spacingValues.length}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>מותאם</span>
                <span>מרווח</span>
                <span>צפוף</span>
              </div>
              {settings.contentSpacing === "custom" && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">{(settings.contentSpacingCustom ?? 1).toFixed(2)} rem</span>
                  </div>
                  <Slider
                    value={[settings.contentSpacingCustom ?? 1]}
                    onValueChange={([value]) => updateSettings({ contentSpacingCustom: value })}
                    min={0}
                    max={5}
                    step={0.25}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Line Height */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-right">
            <AlignJustify className="ml-2 h-4 w-4" />
            גובה שורה
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {settings.lineHeight === "custom"
                    ? `מותאם: ${settings.lineHeightCustom}`
                    : lineHeightLabels[settings.lineHeight]}
                </span>
              </div>
              <Slider
                value={[settings.lineHeight === "custom"
                  ? lineHeightValues.length
                  : lineHeightValues.indexOf(settings.lineHeight as typeof lineHeightValues[number])]}
                onValueChange={([value]) => {
                  if (value < lineHeightValues.length) {
                    updateSettings({ lineHeight: lineHeightValues[value] });
                  } else {
                    updateSettings({ lineHeight: "custom" });
                  }
                }}
                min={0}
                max={lineHeightValues.length}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>מותאם</span>
                <span>רפוי</span>
                <span>צמוד</span>
              </div>
              {settings.lineHeight === "custom" && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">{(settings.lineHeightCustom ?? 1.5).toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[settings.lineHeightCustom ?? 1.5]}
                    onValueChange={([value]) => updateSettings({ lineHeightCustom: value })}
                    min={1}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Content Width */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-right">
            <Maximize2 className="ml-2 h-4 w-4" />
            רוחב תוכן
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{widthLabels[settings.contentWidth]}</span>
              </div>
              <Slider
                value={[widthValues.indexOf(settings.contentWidth)]}
                onValueChange={([value]) => updateSettings({ contentWidth: widthValues[value] })}
                min={0}
                max={3}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>מלא</span>
                <span>רחב</span>
                <span>רגיל</span>
                <span>צר</span>
              </div>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Letter Spacing */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-right">
            <Type className="ml-2 h-4 w-4" />
            מרווח בין אותיות
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {settings.letterSpacing === "custom"
                    ? `מותאם: ${settings.letterSpacingCustom}em`
                    : letterSpacingLabels[settings.letterSpacing]}
                </span>
              </div>
              <Slider
                value={[settings.letterSpacing === "custom"
                  ? letterSpacingValues.length
                  : letterSpacingValues.indexOf(settings.letterSpacing as typeof letterSpacingValues[number])]}
                onValueChange={([value]) => {
                  if (value < letterSpacingValues.length) {
                    updateSettings({ letterSpacing: letterSpacingValues[value] });
                  } else {
                    updateSettings({ letterSpacing: "custom" });
                  }
                }}
                min={0}
                max={letterSpacingValues.length}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>מותאם</span>
                <span>רחב יותר</span>
                <span>צמוד</span>
              </div>
              {settings.letterSpacing === "custom" && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">{(settings.letterSpacingCustom ?? 0).toFixed(2)} em</span>
                  </div>
                  <Slider
                    value={[settings.letterSpacingCustom ?? 0]}
                    onValueChange={([value]) => updateSettings({ letterSpacingCustom: value })}
                    min={-0.1}
                    max={0.5}
                    step={0.01}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-right">גודל טקסט</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Pasuk Font Size */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-right">
            <Type className="ml-2 h-4 w-4" />
            פסוקים
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{settings.pasukSize}px</span>
              </div>
              <Slider
                value={[settings.pasukSize]}
                onValueChange={([value]) => updateSettings({ pasukSize: value })}
                min={12}
                max={36}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>36</span>
                <span>24</span>
                <span>12</span>
              </div>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Title Font Size */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-right">
            <Type className="ml-2 h-4 w-4" />
            כותרות
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{settings.titleSize}px</span>
              </div>
              <Slider
                value={[settings.titleSize]}
                onValueChange={([value]) => updateSettings({ titleSize: value })}
                min={12}
                max={36}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>36</span>
                <span>24</span>
                <span>12</span>
              </div>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Question Font Size */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-right">
            <Type className="ml-2 h-4 w-4" />
            שאלות
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{settings.questionSize}px</span>
              </div>
              <Slider
                value={[settings.questionSize]}
                onValueChange={([value]) => updateSettings({ questionSize: value })}
                min={12}
                max={36}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>36</span>
                <span>24</span>
                <span>12</span>
              </div>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Commentary Font Size */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-right">
            <Type className="ml-2 h-4 w-4" />
            מפרשים
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{settings.commentarySize}px</span>
              </div>
              <Slider
                value={[settings.commentarySize]}
                onValueChange={([value]) => updateSettings({ commentarySize: value })}
                min={12}
                max={36}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>36</span>
                <span>24</span>
                <span>12</span>
              </div>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
