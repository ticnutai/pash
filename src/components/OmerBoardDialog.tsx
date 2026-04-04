import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, CalendarDays, LayoutGrid, Table2, Rows3, Palette, Share2, Mail, MessageCircle, Bell, BellOff, Plus, Trash2, Clock, Smartphone, MonitorSmartphone, Send, Home, Type, CheckCircle2, Circle, Trophy, Flame, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getCalendarPreference } from "@/utils/parshaUtils";
import { getOmerBoardData } from "@/utils/omerUtils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toHebrewNumber } from "@/utils/hebrewNumbers";
import { useOmerReminders, type OmerChannel } from "@/hooks/useOmerReminders";
import { useOmerThemes } from "@/hooks/useOmerThemes";
import { useOmerChecklist } from "@/hooks/useOmerChecklist";
import { OmerThemeDialog } from "@/components/OmerThemeDialog";
import { TimePickerDialog } from "@/components/TimePickerDialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface OmerBoardDialogProps {
  buttonClassName?: string;
  iconClassName?: string;
  defaultOpen?: boolean;
}

type OmerViewMode = "grid" | "table" | "compact" | "weekly";
type OmerNusach = "sefarad" | "ashkenaz" | "edot";

const OMER_NUSACH_KEY = "omer-nusach";
const OMER_TOOLTIP_DISMISSED_KEY = "omer-tooltip-dismissed";

const normalizeNusach = (value: unknown): OmerNusach => {
  if (value === "ashkenaz" || value === "edot" || value === "sefarad") return value;
  return "sefarad";
};

const parseNusach = (value: unknown): OmerNusach | null => {
  if (value === "ashkenaz" || value === "edot" || value === "sefarad") return value;
  return null;
};

export function OmerBoardDialog({ buttonClassName, iconClassName, defaultOpen }: OmerBoardDialogProps) {
  const [dialogOpen, setDialogOpen] = useState(defaultOpen ?? false);
  const board = useMemo(() => getOmerBoardData(getCalendarPreference()), []);
  const [viewMode, setViewMode] = useState<OmerViewMode>("grid");
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [timePickerFor, setTimePickerFor] = useState<string | null>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const todayCardRef = useRef<HTMLElement>(null);
  const {
    allThemes,
    activeTheme,
    activeId: activeThemeId,
    selectTheme,
    addCustomTheme,
    updateCustomTheme,
    removeCustomTheme,
    duplicateTheme,
    typography: typo,
    updateTypography: updateTypo,
    resetTypography: resetTypo,
  } = useOmerThemes();
  const { user } = useAuth();
  const {
    toggleDay,
    markDay,
    isCounted,
    stats: omerStats,
  } = useOmerChecklist(board.hebrewYear, board.currentDay);
  const {
    reminders: omerReminders,
    addReminder: addOmerReminder,
    updateReminder: updateOmerReminder,
    removeReminder: removeOmerReminder,
    toggleChannel,
    permission,
    askPermission,
    sendTest,
    supported: notifSupported,
  } = useOmerReminders();
  const [nusach, setNusach] = useState<OmerNusach>(() => {
    try {
      return normalizeNusach(localStorage.getItem(OMER_NUSACH_KEY));
    } catch {
      return "sefarad";
    }
  });
  const [selectedDay, setSelectedDay] = useState<(typeof board.days)[number] | null>(null);
  const [prayerDialogOpen, setPrayerDialogOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [blessingAnimated, setBlessingAnimated] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(OMER_NUSACH_KEY, nusach);
    } catch {
      // Ignore storage write errors.
    }
  }, [nusach]);

  useEffect(() => {
    const cloudNusach = parseNusach(user?.user_metadata?.omer_nusach);
    if (user && cloudNusach && cloudNusach !== nusach) {
      setNusach(cloudNusach);
      return;
    }

    if (!user) {
      try {
        const saved = normalizeNusach(localStorage.getItem(OMER_NUSACH_KEY));
        if (saved !== nusach) setNusach(saved);
      } catch {
        // Ignore storage read errors.
      }
    }
  }, [user, nusach]);

  useEffect(() => {
    const syncNusachToCloud = async () => {
      if (!user) return;
      const cloudNusach = parseNusach(user.user_metadata?.omer_nusach);
      if (cloudNusach === nusach) return;

      const nextMetadata = {
        ...(user.user_metadata ?? {}),
        omer_nusach: nusach,
      };

      const { error } = await supabase.auth.updateUser({ data: nextMetadata });
      if (error) {
        console.error("Failed to sync omer nusach to cloud:", error);
      }
    };

    void syncNusachToCloud();
  }, [user, nusach]);

  // Auto-scroll to today's card when dialog opens
  useEffect(() => {
    if (!dialogOpen || !board.currentDay) return;
    const timer = setTimeout(() => {
      todayCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(timer);
  }, [dialogOpen, board.currentDay, viewMode]);

  // Show first-time tooltip after scroll settles
  useEffect(() => {
    if (!dialogOpen || !board.currentDay) return;
    try {
      if (localStorage.getItem(OMER_TOOLTIP_DISMISSED_KEY) === "true") return;
    } catch { /* ignore */ }
    const showTimer = setTimeout(() => setShowTooltip(true), 600);
    // Auto-open prayer dialog after 10 seconds if tooltip still visible
    const autoOpenTimer = setTimeout(() => {
      const todayEntry = board.days.find((d) => d.day === board.currentDay);
      if (todayEntry) {
        setSelectedDay(todayEntry);
        setBlessingAnimated(true);
        setPrayerDialogOpen(true);
        setShowTooltip(false);
      }
    }, 10_000);
    return () => { clearTimeout(showTimer); clearTimeout(autoOpenTimer); };
  }, [dialogOpen, board.currentDay]);

  const todayHebrewDay = board.currentDay
    ? board.days.find((day) => day.day === board.currentDay)?.hebrewDay ?? ""
    : "";

  const cycleViewMode = () => {
    setViewMode((prev) => {
      if (prev === "grid") return "table";
      if (prev === "table") return "compact";
      if (prev === "compact") return "weekly";
      return "grid";
    });
  };



  const currentViewIcon =
    viewMode === "grid" ? <LayoutGrid className="h-4 w-4" /> :
    viewMode === "table" ? <Table2 className="h-4 w-4" /> :
    viewMode === "compact" ? <Rows3 className="h-4 w-4" /> :
    <CalendarDays className="h-4 w-4" />;

  const currentViewLabel =
    viewMode === "grid" ? "רשת" :
    viewMode === "table" ? "טבלה" :
    viewMode === "compact" ? "קומפקטי" :
    "שבועי";

  const currentDesignLabel = activeTheme.name;

  const viewOptions: Array<{ value: OmerViewMode; label: string }> = [
    { value: "grid", label: "רשת" },
    { value: "table", label: "טבלה" },
    { value: "compact", label: "קומפקטי" },
    { value: "weekly", label: "שבועי" },
  ];

  const weeklyGroups = useMemo(() => {
    const groups: Array<{ week: number; days: typeof board.days }> = [];
    for (let i = 0; i < board.days.length; i += 7) {
      groups.push({ week: Math.floor(i / 7) + 1, days: board.days.slice(i, i + 7) });
    }
    return groups;
  }, [board.days]);

  const activeDesign = activeTheme.colors;
  const cardBorderRadius = activeDesign.borderRadius ?? 8;
  const cardShadowMap: Record<string, string> = { none: "none", sm: "0 1px 3px rgba(0,0,0,0.12)", md: "0 2px 8px rgba(0,0,0,0.18)", lg: "0 4px 16px rgba(0,0,0,0.25)" };
  const cardBoxShadow = cardShadowMap[activeDesign.cardShadow ?? "none"];

  const openPrayerDialog = (day: (typeof board.days)[number]) => {
    setSelectedDay(day);
    setBlessingAnimated(true);
    setPrayerDialogOpen(true);
    if (showTooltip) setShowTooltip(false);
  };

  const dismissTooltipForever = () => {
    setShowTooltip(false);
    try { localStorage.setItem(OMER_TOOLTIP_DISMISSED_KEY, "true"); } catch { /* ignore */ }
  };

  const omerBlessing = "בָּרוּךְ אַתָּה ה׳ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל סְפִירַת הָעוֹמֶר.";
  const nusachOptions: Array<{ value: OmerNusach; label: string }> = [
    { value: "sefarad", label: "נוסח ספרד" },
    { value: "ashkenaz", label: "נוסח אשכנז" },
    { value: "edot", label: "עדות המזרח" },
  ];

  const afterCountByNusach: Record<OmerNusach, { note: string; sections: Array<{ title: string; text: string }> }> = {
    sefarad: {
      note: "נוסח נפוץ בקהילות ספרד וחסידים.",
      sections: [
        {
          title: "הרחמן",
          text: "הָרַחֲמָן הוּא יַחֲזִיר לָנוּ עֲבוֹדַת בֵּית הַמִּקְדָּשׁ לִמְקוֹמָהּ בִּמְהֵרָה בְיָמֵינוּ אָמֵן סֶלָה.",
        },
        {
          title: "ריבונו של עולם",
          text: "רִבּוֹנוֹ שֶׁל עוֹלָם, אַתָּה צִוִּיתָנוּ עַל יְדֵי מֹשֶׁה עַבְדֶּךָ לִסְפּוֹר סְפִירַת הָעוֹמֶר, כְּדֵי לְטַהֲרֵנוּ מִקְּלִפּוֹתֵינוּ וּמִטֻּמְאוֹתֵינוּ. וְעַל יְדֵי זֶה יֻשְׁפַּע שֶׁפַע רַב בְּכָל הָעוֹלָמוֹת וּלְתַקֵּן אֶת נַפְשׁוֹתֵינוּ. אָבִינוּ שֶׁבַּשָּׁמַיִם, יְהִי רָצוֹן מִלְּפָנֶיךָ שֶׁיִּבָּנֶה בֵּית הַמִּקְדָּשׁ בִּמְהֵרָה בְיָמֵינוּ וְתֵן חֶלְקֵנוּ בְּתוֹרָתֶךָ.",
        },
        {
          title: "אנא בכח",
          text: "אָנָּא בְּכֹחַ גְּדֻלַּת יְמִינֶךָ תַּתִּיר צְרוּרָה. קַבֵּל רִנַּת עַמְּךָ שַׂגְּבֵנוּ טַהֲרֵנוּ נוֹרָא. נָא גִבּוֹר דּוֹרְשֵׁי יִחוּדְךָ כְּבָבַת שָׁמְרֵם. בָּרְכֵם טַהֲרֵם רַחֲמֵי צִדְקָתֶךָ תָּמִיד גָּמְלֵם. חֲסִין קָדוֹשׁ בְּרוֹב טוּבְךָ נַהֵל עֲדָתֶךָ. יָחִיד גֵּאֶה לְעַמְּךָ פְּנֵה זוֹכְרֵי קְדֻשָּׁתֶךָ. שַׁוְעָתֵנוּ קַבֵּל וּשְׁמַע צַעֲקָתֵנוּ יוֹדֵעַ תַּעֲלֻמוֹת.",
        },
      ],
    },
    ashkenaz: {
      note: "נוסח נפוץ בקהילות אשכנז.",
      sections: [
        {
          title: "יהי רצון",
          text: "יְהִי רָצוֹן מִלְּפָנֶיךָ ה׳ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ שֶׁיִּבָּנֶה בֵּית הַמִּקְדָּשׁ בִּמְהֵרָה בְיָמֵינוּ וְתֵן חֶלְקֵנוּ בְּתוֹרָתֶךָ.",
        },
        {
          title: "הרחמן",
          text: "הָרַחֲמָן הוּא יַחֲזִיר לָנוּ עֲבוֹדַת בֵּית הַמִּקְדָּשׁ לִמְקוֹמָהּ בִּמְהֵרָה בְיָמֵינוּ אָמֵן.",
        },
      ],
    },
    edot: {
      note: "נוסח נפוץ בעדות המזרח.",
      sections: [
        {
          title: "לשם ייחוד",
          text: "לְשֵׁם יִחוּד קוּדְשָׁא בְּרִיךְ הוּא וּשְׁכִינְתֵּהּ, הֲרֵינִי מוּכָן וּמְזוּמָן לְקַיֵּם מִצְוַת סְפִירַת הָעוֹמֶר כַּכָּתוּב בַּתּוֹרָה.",
        },
        {
          title: "הרחמן",
          text: "הָרַחֲמָן הוּא יַחֲזִיר לָנוּ עֲבוֹדַת בֵּית הַמִּקְדָּשׁ לִמְקוֹמָהּ בִּמְהֵרָה בְיָמֵינוּ אָמֵן סֶלָה.",
        },
        {
          title: "ריבונו של עולם",
          text: "רִבּוֹנוֹ שֶׁל עוֹלָם, בִּזְכוּת סְפִירַת הָעוֹמֶר שֶׁסָּפַרְנוּ הַיּוֹם, יִתְקַשְּׁרוּ הַשְּׁפָעוֹת הַטּוֹבוֹת וְתִתְקַבֵּל תְּפִלָּתֵנוּ בְּרַחֲמִים וּבְרָצוֹן.",
        },
      ],
    },
  };

  const selectedNusach = afterCountByNusach[nusach] ?? afterCountByNusach.sefarad;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("text-accent", buttonClassName)}
          title="לוח ספירת העומר"
        >
          <Sparkles className={cn("h-4 w-4", iconClassName)} />
        </Button>
      </DialogTrigger>

      <DialogContent className={cn("w-[98vw] sm:w-auto sm:max-w-5xl p-0 overflow-hidden overflow-x-hidden border-2 max-h-[94vh] pb-[max(0.25rem,env(safe-area-inset-bottom))]", activeDesign.dialogBorder, activeDesign.dialogBg, activeDesign.textColor)}>
        <div className={cn("sticky top-0 z-10 px-3 sm:px-5 py-3 sm:py-5 border-b", activeDesign.dialogBg, activeDesign.textColor)} style={{ borderColor: activeDesign.accentColor + "70" }}>
          <DialogHeader className="text-right">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("h-9 w-9 sm:h-8 sm:w-8", activeDesign.textColor)}
                      style={{ borderColor: activeDesign.accentColor }}
                      title="שתף ספירת העומר"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="direction-rtl">
                    <DropdownMenuItem onClick={() => {
                      const text = board.currentDay
                        ? `🕯️ היום ${todayHebrewDay} לעומר\n\nספירת העומר - ${board.startGregorian} עד ${board.endGregorian}`
                        : `🕯️ לוח ספירת העומר\n\n${board.startGregorian} - ${board.endGregorian}`;
                      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                      window.open(url, '_blank');
                    }}>
                      <MessageCircle className="h-4 w-4 ml-2" />
                      <span>שלח בוואטסאפ</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const subject = board.currentDay
                        ? `היום ${todayHebrewDay} לעומר`
                        : 'לוח ספירת העומר';
                      const body = board.currentDay
                        ? `🕯️ היום ${todayHebrewDay} לעומר\n\nספירת העומר - ${board.startGregorian} עד ${board.endGregorian}`
                        : `🕯️ לוח ספירת העומר\n\n${board.startGregorian} - ${board.endGregorian}`;
                      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                    }}>
                      <Mail className="h-4 w-4 ml-2" />
                      <span>שלח במייל</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* ── Omer Reminder Bell ── */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("h-9 w-9 sm:h-8 sm:w-8 relative", activeDesign.textColor)}
                      style={{ borderColor: activeDesign.accentColor }}
                      title="תזכורות ספירת העומר"
                    >
                      <Bell className="h-4 w-4" />
                      {omerReminders.filter((r) => r.enabled).length > 0 && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 border-2 border-background animate-pulse" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[340px] max-h-[75vh] p-0 direction-rtl"
                    dir="rtl"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                  >
                    <div className="max-h-[75vh] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
                    {/* Header */}
                    <div className="bg-gradient-to-l from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-3 border-b sticky top-0 z-10">
                      <div className="flex items-center justify-between">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-7 rounded-full border-amber-300 hover:bg-amber-50"
                          onClick={() => addOmerReminder()}
                        >
                          <Plus className="h-3 w-3" />
                          תזכורת חדשה
                        </Button>
                        <h4 className="font-bold text-sm flex items-center gap-1.5">
                          <span className="text-base">🕯️</span>
                          תזכורות ספירת העומר
                        </h4>
                      </div>
                    </div>

                    <div className="p-3 space-y-3">
                      {/* Permission prompt */}
                      {!notifSupported && (
                        <div className="text-center text-xs text-destructive p-2 rounded-md bg-destructive/5 border border-destructive/20">
                          הדפדפן אינו תומך בהתראות
                        </div>
                      )}

                      {notifSupported && permission !== "granted" && (
                        <Button
                          size="sm"
                          className="w-full text-xs h-8 rounded-full bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                          onClick={askPermission}
                        >
                          <Bell className="h-3 w-3 ml-1" />
                          אפשר התראות
                        </Button>
                      )}

                      {/* Empty state */}
                      {omerReminders.length === 0 && (
                        <div className="text-center py-6 space-y-2">
                          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                            <BellOff className="h-6 w-6 text-amber-400" />
                          </div>
                          <p className="text-sm text-muted-foreground">אין תזכורות עומר</p>
                          <p className="text-xs text-muted-foreground/70">הוסף תזכורת כדי שלא לשכוח לספור!</p>
                        </div>
                      )}

                      {/* Reminder cards */}
                      {omerReminders.map((reminder) => (
                        <div
                          key={reminder.id}
                          className={cn(
                            "rounded-xl border-2 overflow-hidden transition-all",
                            reminder.enabled
                              ? "border-amber-300 dark:border-amber-600 bg-gradient-to-l from-amber-50/50 to-white dark:from-amber-900/10 dark:to-background shadow-sm"
                              : "border-muted bg-muted/30 opacity-70"
                          )}
                        >
                          {/* Card header */}
                          <div className="flex items-center justify-between p-2.5 pb-1.5">
                            <button
                              className="text-destructive/60 hover:text-destructive transition-colors p-1 rounded-full hover:bg-destructive/10"
                              onClick={() => removeOmerReminder(reminder.id)}
                              title="מחק תזכורת"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={reminder.enabled}
                                disabled={permission !== "granted"}
                                onCheckedChange={(v) => updateOmerReminder(reminder.id, { enabled: v })}
                                className="scale-75"
                              />
                              <span className="font-semibold text-sm">{reminder.label}</span>
                              {reminder.enabled
                                ? <Bell className="h-3.5 w-3.5 text-amber-500" />
                                : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                          </div>

                          {/* Time picker */}
                          <div className="flex items-center gap-1.5 justify-end px-2.5 pb-1.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <button
                              type="button"
                              onClick={() => setTimePickerFor(reminder.id)}
                              className="flex items-center gap-0.5 px-2.5 py-1 rounded-md border bg-background hover:bg-accent/50 transition-colors cursor-pointer"
                              dir="ltr"
                            >
                              <span className="font-mono text-sm font-semibold tabular-nums">
                                {String(reminder.hour).padStart(2, "0")}:{String(reminder.minute).padStart(2, "0")}
                              </span>
                            </button>
                            <TimePickerDialog
                              open={timePickerFor === reminder.id}
                              onOpenChange={(open) => { if (!open) setTimePickerFor(null); }}
                              hour={reminder.hour}
                              minute={reminder.minute}
                              onConfirm={(h, m) => updateOmerReminder(reminder.id, { hour: h, minute: m })}
                            />
                          </div>

                          {/* Message */}
                          <div className="px-2.5 pb-1.5">
                            <Input
                              value={reminder.message}
                              onChange={(e) => updateOmerReminder(reminder.id, { message: e.target.value })}
                              className="text-right text-xs h-7 rounded-md"
                              dir="rtl"
                              placeholder="הודעת תזכורת..."
                            />
                          </div>

                          {/* Channel selection */}
                          <div className="px-2.5 pb-2">
                            <p className="text-[10px] text-muted-foreground font-medium mb-1.5 text-right">ערוצי התראה:</p>
                            <div className="flex gap-1.5 justify-end flex-wrap">
                              {([
                                { ch: "push" as OmerChannel, icon: <Smartphone className="h-3 w-3" />, label: "פוש" },
                                { ch: "popup" as OmerChannel, icon: <MonitorSmartphone className="h-3 w-3" />, label: "פופ-אפ" },
                                { ch: "whatsapp" as OmerChannel, icon: <MessageCircle className="h-3 w-3" />, label: "וואטסאפ" },
                                { ch: "email" as OmerChannel, icon: <Mail className="h-3 w-3" />, label: "מייל" },
                              ]).map(({ ch, icon, label }) => {
                                const active = reminder.channels.includes(ch);
                                return (
                                  <button
                                    key={ch}
                                    onClick={() => toggleChannel(reminder.id, ch)}
                                    className={cn(
                                      "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all",
                                      active
                                        ? "bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-300 shadow-sm"
                                        : "bg-muted/50 border-transparent text-muted-foreground hover:border-muted-foreground/30"
                                    )}
                                    title={label}
                                  >
                                    {icon}
                                    <span>{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Label edit */}
                          <div className="px-2.5 pb-2.5">
                            <Input
                              value={reminder.label}
                              onChange={(e) => updateOmerReminder(reminder.id, { label: e.target.value })}
                              className="text-right text-[10px] h-6 rounded-md text-muted-foreground"
                              dir="rtl"
                              placeholder="שם התזכורת"
                            />
                          </div>
                        </div>
                      ))}

                      {/* Test button */}
                      {omerReminders.length > 0 && notifSupported && permission === "granted" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-xs h-7 text-muted-foreground hover:text-foreground gap-1"
                          onClick={sendTest}
                        >
                          <Send className="h-3 w-3" />
                          שלח התראת בדיקה
                        </Button>
                      )}
                    </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setThemeDialogOpen(true)}
                  className={cn("h-9 w-9 sm:h-8 sm:w-8", activeDesign.textColor)}
                  style={{ borderColor: activeDesign.accentColor }}
                  title="ערכות נושא"
                >
                  <Palette className="h-4 w-4" />
                </Button>
                <OmerThemeDialog
                  open={themeDialogOpen}
                  onOpenChange={setThemeDialogOpen}
                  allThemes={allThemes}
                  activeId={activeThemeId}
                  onSelect={selectTheme}
                  onAdd={addCustomTheme}
                  onUpdate={updateCustomTheme}
                  onRemove={removeCustomTheme}
                  onDuplicate={duplicateTheme}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("h-9 w-9 sm:h-8 sm:w-8", activeDesign.textColor)}
                      style={{ borderColor: activeDesign.accentColor }}
                      title="טיפוגרפיה"
                    >
                      <Type className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 space-y-3" dir="rtl" align="start">
                    <h4 className="font-bold text-sm text-right">טיפוגרפיה</h4>
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{typo.fontSize}px</span>
                          <span>גודל טקסט ראשי</span>
                        </div>
                        <input type="range" min={10} max={24} step={1} value={typo.fontSize}
                          onChange={(e) => updateTypo("fontSize", Number(e.target.value))}
                          className="w-full accent-amber-500 h-1.5" dir="ltr" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{typo.subFontSize}px</span>
                          <span>גודל טקסט משני</span>
                        </div>
                        <input type="range" min={8} max={18} step={1} value={typo.subFontSize}
                          onChange={(e) => updateTypo("subFontSize", Number(e.target.value))}
                          className="w-full accent-amber-500 h-1.5" dir="ltr" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{typo.cardGap}px</span>
                          <span>מרווח בין כרטיסים</span>
                        </div>
                        <input type="range" min={2} max={20} step={1} value={typo.cardGap}
                          onChange={(e) => updateTypo("cardGap", Number(e.target.value))}
                          className="w-full accent-amber-500 h-1.5" dir="ltr" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{typo.cardPadding}px</span>
                          <span>מרווח פנימי</span>
                        </div>
                        <input type="range" min={4} max={24} step={1} value={typo.cardPadding}
                          onChange={(e) => updateTypo("cardPadding", Number(e.target.value))}
                          className="w-full accent-amber-500 h-1.5" dir="ltr" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{typo.lineHeight.toFixed(1)}</span>
                          <span>גובה שורה</span>
                        </div>
                        <input type="range" min={1} max={2.2} step={0.1} value={typo.lineHeight}
                          onChange={(e) => updateTypo("lineHeight", Number(e.target.value))}
                          className="w-full accent-amber-500 h-1.5" dir="ltr" />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-xs h-7 text-muted-foreground"
                        onClick={() => resetTypo()}
                      >
                        איפוס ברירת מחדל
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={cycleViewMode}
                  className={cn("h-9 w-9 sm:h-8 sm:w-8", activeDesign.textColor)}
                  style={{ borderColor: activeDesign.accentColor }}
                  title="החלף תצוגה"
                >
                  {currentViewIcon}
                </Button>
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("h-9 w-9 sm:h-8 sm:w-8", activeDesign.textColor)}
                    style={{ borderColor: activeDesign.accentColor }}
                    title="חזרה לאתר"
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
              <DialogTitle className={cn("text-right text-xl sm:text-2xl font-bold flex items-center justify-end gap-2", activeDesign.textColor)}>
                <span>לוח ספירת העומר</span>
                <CalendarDays className="h-5 w-5" style={{ color: activeDesign.accentColor }} />
              </DialogTitle>
            </div>
            <DialogDescription className={cn("text-right", activeDesign.textMuted)}>
              {board.isInSeason
                ? `היום ${todayHebrewDay} לעומר`
                : `טווח העומר: ${board.startGregorian} - ${board.endGregorian}`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div ref={boardScrollRef} className={cn("px-3 sm:px-5 pb-4 sm:pb-5 pt-3 sm:pt-4 max-h-[74vh] sm:max-h-[72vh] overflow-y-auto overflow-x-hidden space-y-3 sm:space-y-4 omer-scrollbar", activeDesign.boardBg)}>
          <Card className={cn("p-3 sm:p-4", activeDesign.card)}>
            <div className="flex items-center justify-between gap-2">
              <p className={cn("text-xs sm:text-sm", activeDesign.textMuted)}>
                שנה עברית: {board.hebrewYear}
              </p>
              <p className={cn("text-sm sm:text-base font-semibold text-right", activeDesign.textColor)}>
                {board.isInSeason && board.currentDay
                  ? `היום ${todayHebrewDay} לעומר`
                  : "מחוץ לימי הספירה"}
              </p>
            </div>
            <p className={cn("text-xs mt-2 text-right", activeDesign.textMuted)}>תצוגה: {currentViewLabel} | עיצוב: {currentDesignLabel}</p>

            {/* ── Stats Bar ── */}
            {board.isInSeason && board.currentDay && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3 justify-end flex-wrap text-xs">
                  <span className="flex items-center gap-1" style={{ color: activeDesign.accentColor }}>
                    <Trophy className="h-3.5 w-3.5" />
                    {omerStats.totalCounted}/{omerStats.totalDays} נספרו ({omerStats.percentage}%)
                  </span>
                  {omerStats.streak > 0 && (
                    <span className="flex items-center gap-1 text-orange-500">
                      <Flame className="h-3.5 w-3.5" />
                      רצף: {omerStats.streak} {omerStats.streak === 1 ? "יום" : "ימים"}
                    </span>
                  )}
                  {omerStats.missedAny && (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      סופרים בלי ברכה
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: activeDesign.accentColor + "25" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${omerStats.percentage}%`, backgroundColor: activeDesign.accentColor }}
                  />
                </div>
              </div>
            )}

            <div className="mt-3 sm:hidden space-y-2">
              <div className="flex flex-wrap gap-2 justify-end">
                {viewOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setViewMode(option.value)}
                    className={cn(
                      "min-h-9",
                      viewMode === option.value ? "font-semibold" : "",
                    )}
                    style={{ borderColor: activeDesign.accentColor }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setThemeDialogOpen(true)}
                  className="min-h-9 gap-1"
                  style={{ borderColor: activeDesign.accentColor }}
                >
                  <Palette className="h-3.5 w-3.5" />
                  {currentDesignLabel}
                </Button>
              </div>
            </div>
          </Card>

          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: `${typo.cardGap}px` }}>
              {board.days.map((day) => (
                <div
                  key={day.day}
                  ref={day.isToday ? (todayCardRef as React.RefObject<HTMLDivElement>) : undefined}
                  className={cn(
                    "w-full border transition-all text-right relative",
                    day.isToday
                      ? activeDesign.today
                      : activeDesign.card,
                    day.isToday && showTooltip && "ring-2 ring-amber-400 animate-pulse",
                  )}
                  style={{ padding: `${typo.cardPadding}px`, lineHeight: typo.lineHeight, borderRadius: cardBorderRadius, boxShadow: cardBoxShadow }}
                >
                  {/* First-time tooltip */}
                  {day.isToday && showTooltip && (
                    <div
                      className="absolute -top-14 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap animate-bounce"
                      style={{ direction: "rtl" }}
                    >
                      <div className="bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                        <span>👆 לחץ כאן כדי לספור!</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); dismissTooltipForever(); }}
                          className="hover:bg-amber-600 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="w-3 h-3 bg-amber-500 rotate-45 mx-auto -mt-1.5" />
                    </div>
                  )}
                  {/* Checkmark toggle */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleDay(day.day); }}
                    className="absolute top-1.5 left-1.5 p-0.5 rounded-full transition-all hover:scale-110"
                    title={isCounted(day.day) ? "סומן כנספר" : "סמן כנספר"}
                    style={{ color: isCounted(day.day) ? "#22c55e" : activeDesign.accentColor + "60" }}
                  >
                    {isCounted(day.day) ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPrayerDialog(day)}
                    className="w-full text-right"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-right">
                        <p style={{ fontSize: `${typo.subFontSize}px` }} className="opacity-70">יום</p>
                        <p className="font-bold leading-none" style={{ fontSize: `${typo.fontSize * 1.4}px` }}>{day.weekdayHebrew}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold" style={{ fontSize: `${typo.fontSize}px` }}>{day.hebrewDay} לעומר</p>
                        <p style={{ fontSize: `${typo.subFontSize + 1}px` }}>{day.hebrewDate}</p>
                        <p className="opacity-70 mt-1" style={{ fontSize: `${typo.subFontSize - 1}px` }}>{day.gregorianDate}</p>
                        {day.shabbatReading && (
                          <p className="opacity-70 mt-1 font-medium" style={{ fontSize: `${typo.subFontSize - 1}px` }}>פרשת השבוע: {day.shabbatReading}</p>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 opacity-70 text-right" style={{ fontSize: `${typo.subFontSize}px` }}>{day.sefira}</p>
                  </button>
                </div>
              ))}
            </div>
          )}

          {viewMode === "table" && (
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: activeDesign.accentColor }}>
              <table className="w-full min-w-[620px] text-right" style={{ fontSize: `${typo.fontSize}px`, lineHeight: typo.lineHeight }}>
                <thead className={activeDesign.header}>
                  <tr>
                    <th className="px-3 py-2 font-semibold w-10">✓</th>
                    <th className="px-3 py-2 font-semibold">יום בשבוע</th>
                    <th className="px-3 py-2 font-semibold">יום לעומר</th>
                    <th className="px-3 py-2 font-semibold">תאריך עברי</th>
                    <th className="px-3 py-2 font-semibold">לועזי</th>
                  </tr>
                </thead>
                <tbody>
                  {board.days.map((day) => (
                    <tr
                      key={day.day}
                      ref={day.isToday ? (todayCardRef as React.RefObject<HTMLTableRowElement>) : undefined}
                      onClick={() => openPrayerDialog(day)}
                      className={cn(
                        "border-t cursor-pointer",
                        day.isToday ? activeDesign.today : activeDesign.card,
                      )}
                    >
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleDay(day.day); }}
                          className="transition-all hover:scale-110"
                          style={{ color: isCounted(day.day) ? "#22c55e" : activeDesign.accentColor + "60" }}
                        >
                          {isCounted(day.day) ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-semibold">{day.weekdayHebrew}</td>
                      <td className="px-3 py-2 font-semibold">
                        <div>{day.hebrewDay} לעומר</div>
                        {day.shabbatReading && (
                          <div className="text-xs opacity-70 font-medium mt-1">פרשה: {day.shabbatReading}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">{day.hebrewDate}</td>
                      <td className="px-3 py-2 text-xs opacity-70">{day.gregorianDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === "compact" && (
            <div style={{ display: "flex", flexDirection: "column", gap: `${typo.cardGap}px` }}>
              {board.days.map((day) => (
                <div
                  key={day.day}
                  ref={day.isToday ? (todayCardRef as React.RefObject<HTMLDivElement>) : undefined}
                  className={cn(
                    "w-full border flex items-center justify-between text-right relative",
                    day.isToday ? activeDesign.today : activeDesign.card,
                  )}
                  style={{ padding: `${typo.cardPadding}px`, lineHeight: typo.lineHeight, borderRadius: cardBorderRadius, boxShadow: cardBoxShadow }}
                >
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleDay(day.day); }}
                    className="shrink-0 p-0.5 rounded-full transition-all hover:scale-110"
                    style={{ color: isCounted(day.day) ? "#22c55e" : activeDesign.accentColor + "60" }}
                  >
                    {isCounted(day.day) ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPrayerDialog(day)}
                    className="flex-1 flex items-center justify-between text-right"
                  >
                    <p className="opacity-70" style={{ fontSize: `${typo.subFontSize}px` }}>{day.gregorianDate}</p>
                    <div className="text-right">
                      <p className="opacity-70" style={{ fontSize: `${typo.subFontSize}px` }}>יום {day.weekdayHebrew}</p>
                      <p className="font-semibold" style={{ fontSize: `${typo.fontSize}px` }}>{day.hebrewDay} לעומר</p>
                      <p className="opacity-70" style={{ fontSize: `${typo.subFontSize}px` }}>{day.hebrewDate}</p>
                      {day.shabbatReading && (
                        <p className="opacity-70 mt-1 font-medium" style={{ fontSize: `${typo.subFontSize}px` }}>פרשה: {day.shabbatReading}</p>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}

          {viewMode === "weekly" && (
            <div className="space-y-3">
              {weeklyGroups.map((group) => (
                <Card key={group.week} className={cn("p-3", activeDesign.card)}>
                  <p className="font-bold mb-2 text-right" style={{ fontSize: `${typo.fontSize}px` }}>שבוע {toHebrewNumber(group.week)} לעומר</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: `${typo.cardGap}px` }}>
                    {group.days.map((day) => (
                      <div
                        key={day.day}
                        ref={day.isToday ? (todayCardRef as React.RefObject<HTMLDivElement>) : undefined}
                        className={cn(
                          "w-full border text-right relative",
                          day.isToday ? activeDesign.today : activeDesign.card,
                        )}
                        style={{ padding: `${typo.cardPadding * 0.7}px ${typo.cardPadding}px`, lineHeight: typo.lineHeight, borderRadius: cardBorderRadius, boxShadow: cardBoxShadow }}
                      >
                        <button
                          type="button"
                          onClick={() => openPrayerDialog(day)}
                          className="w-full text-right"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleDay(day.day); }}
                                className="shrink-0 p-0.5 rounded-full transition-all hover:scale-110"
                                style={{ color: isCounted(day.day) ? "#22c55e" : activeDesign.accentColor + "60" }}
                              >
                                {isCounted(day.day) ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                              </button>
                              <p className="font-semibold" style={{ fontSize: `${typo.fontSize}px` }}>{day.hebrewDay} לעומר</p>
                            </div>
                            <p className="opacity-70" style={{ fontSize: `${typo.subFontSize}px` }}>יום {day.weekdayHebrew}</p>
                          </div>
                          <p className="opacity-70" style={{ fontSize: `${typo.subFontSize}px` }}>{day.hebrewDate} | {day.gregorianDate}</p>
                          {day.shabbatReading && <p className="font-medium mt-1" style={{ fontSize: `${typo.subFontSize}px` }}>פרשת השבוע: {day.shabbatReading}</p>}
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={prayerDialogOpen} onOpenChange={(open) => { setPrayerDialogOpen(open); if (!open) setBlessingAnimated(false); }}>
          <DialogContent className={cn("w-[96vw] sm:w-auto sm:max-w-2xl border-2 overflow-x-hidden max-h-[94vh] pb-[max(0.25rem,env(safe-area-inset-bottom))]", activeDesign.dialogBorder, activeDesign.dialogBg, activeDesign.textColor)}>
            <DialogHeader className="text-right">
              <DialogTitle className={cn("text-right text-xl font-bold", activeDesign.textColor)}>
                {selectedDay ? `${selectedDay.hebrewDay} לעומר` : "ספירת העומר"}
              </DialogTitle>
              <DialogDescription className={cn("text-right", activeDesign.textMuted)}>
                {selectedDay ? `יום ${selectedDay.weekdayHebrew} | ${selectedDay.hebrewDate} | ${selectedDay.gregorianDate}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[74vh] sm:max-h-[70vh] overflow-y-auto overflow-x-hidden space-y-3 sm:space-y-4 text-right leading-8 pr-1">
              {selectedDay?.shabbatReading && (
                <Card className={cn("p-4", activeDesign.card)}>
                  <p className={cn("text-sm mb-1", activeDesign.textMuted)}>קריאת שבת</p>
                  <p className="text-base font-semibold">פרשת השבוע: {selectedDay.shabbatReading}</p>
                </Card>
              )}

              <Card
                className={cn("p-4 transition-all duration-700", activeDesign.card)}
                style={blessingAnimated ? { animation: "omer-blessing-in 0.8s ease-out both" } : undefined}
              >
                <p className={cn("text-sm mb-2", activeDesign.textMuted)}>🕯️ הברכה לפני הספירה</p>
                <p className="text-lg font-bold leading-relaxed">{omerBlessing}</p>
              </Card>

              <Card
                className={cn("p-4 transition-all duration-700", activeDesign.today)}
                style={blessingAnimated ? { animation: "omer-blessing-in 0.8s ease-out 0.4s both" } : undefined}
              >
                <p className={cn("text-sm mb-2", activeDesign.textMuted)}>✨ הספירה של היום</p>
                <p className="text-xl font-bold">{selectedDay?.countText ?? ""}</p>
              </Card>

              <Card className={cn("p-3", activeDesign.card)}>
                <p className={cn("text-sm mb-2", activeDesign.textMuted)}>בחירת נוסח</p>
                <div className="flex flex-wrap gap-2 justify-end">
                  {nusachOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setNusach(option.value)}
                      className={cn(
                        nusach === option.value ? "font-semibold" : "",
                      )}
                      style={{ borderColor: activeDesign.accentColor }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <p className={cn("text-xs mt-2", activeDesign.textMuted)}>{selectedNusach.note}</p>
              </Card>

              {selectedNusach.sections.map((section) => (
                <Card key={section.title} className={cn("p-4", activeDesign.card)}>
                  <p className={cn("text-sm mb-2", activeDesign.textMuted)}>{section.title}</p>
                  <p className="text-base font-semibold">{section.text}</p>
                </Card>
              ))}

              <p className={cn("text-xs px-1", activeDesign.textMuted)}>
                הערה: קיימים הבדלים בין סידורים שונים, והנוסחים כאן מוצגים בתצוגה כללית ומסודרת.
              </p>

              {/* Missed day warning */}
              {selectedDay && omerStats.missedAny && omerStats.firstMissed !== null && selectedDay.day > omerStats.firstMissed && (
                <Card className="p-3 border-red-400/50 bg-red-50/50 dark:bg-red-900/10">
                  <div className="flex items-center gap-2 justify-end text-sm text-red-600 dark:text-red-400">
                    <span>פיספסת יום {toHebrewNumber(omerStats.firstMissed)} — יש לספור בלי ברכה</span>
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                  </div>
                </Card>
              )}
            </div>

            <div className={cn("sticky bottom-0 pt-2 pb-1 space-y-1", activeDesign.dialogBg)}>
              <div className="flex justify-between items-center gap-2">
                <DialogClose asChild>
                  <Button variant="outline" className="min-h-10 px-5" style={{ borderColor: activeDesign.accentColor }}>
                    סגור
                  </Button>
                </DialogClose>
                {selectedDay && (
                  <Button
                    onClick={() => { markDay(selectedDay.day); }}
                    className={cn("min-h-10 px-5 gap-2 transition-all", isCounted(selectedDay.day) ? "opacity-70" : "")}
                    style={{
                      backgroundColor: isCounted(selectedDay.day) ? "#22c55e" : activeDesign.accentColor,
                      color: "#fff",
                  }}
                >
                  {isCounted(selectedDay.day) ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      נספר ✓
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4" />
                      סמן כנספר
                    </>
                  )}
                </Button>
              )}
              </div>
              {/* Don't show tooltip again */}
              {blessingAnimated && (() => { try { return localStorage.getItem(OMER_TOOLTIP_DISMISSED_KEY) !== "true"; } catch { return false; } })() && (
                <button
                  type="button"
                  onClick={dismissTooltipForever}
                  className={cn("text-xs w-full text-center py-0.5 hover:underline", activeDesign.textMuted)}
                >
                  לא להציג הנחיה שוב
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
