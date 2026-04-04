import { useEffect, useMemo, useState } from "react";
import { Sparkles, CalendarDays, LayoutGrid, Table2, Rows3, Palette, Share2, Mail, MessageCircle, Bell, BellOff, Plus, Trash2, Clock, Smartphone, MonitorSmartphone, Send, Home } from "lucide-react";
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
  const {
    allThemes,
    activeTheme,
    activeId: activeThemeId,
    selectTheme,
    addCustomTheme,
    updateCustomTheme,
    removeCustomTheme,
    duplicateTheme,
  } = useOmerThemes();
  const { user } = useAuth();
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

  const openPrayerDialog = (day: (typeof board.days)[number]) => {
    setSelectedDay(day);
    setPrayerDialogOpen(true);
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

        <div className={cn("px-3 sm:px-5 pb-4 sm:pb-5 pt-3 sm:pt-4 max-h-[74vh] sm:max-h-[72vh] overflow-y-auto overflow-x-hidden space-y-3 sm:space-y-4", activeDesign.boardBg)}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {board.days.map((day) => (
                <button
                  key={day.day}
                  type="button"
                  onClick={() => openPrayerDialog(day)}
                  className={cn(
                    "w-full p-3 border transition-all text-right rounded-lg",
                    day.isToday
                      ? activeDesign.today
                      : activeDesign.card,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-right">
                      <p className="text-sm opacity-70">יום</p>
                      <p className="text-xl font-bold leading-none">{day.weekdayHebrew}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold">{day.hebrewDay} לעומר</p>
                      <p className="text-sm">{day.hebrewDate}</p>
                      <p className="text-xs opacity-70 mt-1">{day.gregorianDate}</p>
                      {day.shabbatReading && (
                        <p className="text-xs opacity-70 mt-1 font-medium">פרשת השבוע: {day.shabbatReading}</p>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs opacity-70 text-right">{day.sefira}</p>
                </button>
              ))}
            </div>
          )}

          {viewMode === "table" && (
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: activeDesign.accentColor }}>
              <table className="w-full min-w-[620px] text-right text-sm">
                <thead className={activeDesign.header}>
                  <tr>
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
                      onClick={() => openPrayerDialog(day)}
                      className={cn(
                        "border-t cursor-pointer",
                        day.isToday ? activeDesign.today : activeDesign.card,
                      )}
                    >
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
            <div className="space-y-2">
              {board.days.map((day) => (
                <button
                  key={day.day}
                  type="button"
                  onClick={() => openPrayerDialog(day)}
                  className={cn(
                    "w-full px-3 py-3 border flex items-center justify-between text-right rounded-lg",
                    day.isToday ? activeDesign.today : activeDesign.card,
                  )}
                >
                  <div className="text-right">
                    <p className="text-xs opacity-70">יום {day.weekdayHebrew}</p>
                    <p className="text-sm font-semibold">{day.hebrewDay} לעומר</p>
                    <p className="text-xs opacity-70">{day.hebrewDate}</p>
                    {day.shabbatReading && (
                      <p className="text-xs opacity-70 mt-1 font-medium">פרשה: {day.shabbatReading}</p>
                    )}
                  </div>
                  <p className="text-xs opacity-70">{day.gregorianDate}</p>
                </button>
              ))}
            </div>
          )}

          {viewMode === "weekly" && (
            <div className="space-y-3">
              {weeklyGroups.map((group) => (
                <Card key={group.week} className={cn("p-3", activeDesign.card)}>
                  <p className="text-sm font-bold mb-2 text-right">שבוע {toHebrewNumber(group.week)} לעומר</p>
                  <div className="space-y-2">
                    {group.days.map((day) => (
                      <button
                        key={day.day}
                        type="button"
                        onClick={() => openPrayerDialog(day)}
                        className={cn(
                          "w-full rounded-md border px-3 py-2 text-right",
                          day.isToday ? activeDesign.today : activeDesign.card,
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{day.hebrewDay} לעומר</p>
                          <p className="text-xs opacity-70">יום {day.weekdayHebrew}</p>
                        </div>
                        <p className="text-xs opacity-70">{day.hebrewDate} | {day.gregorianDate}</p>
                        {day.shabbatReading && <p className="text-xs font-medium mt-1">פרשת השבוע: {day.shabbatReading}</p>}
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={prayerDialogOpen} onOpenChange={setPrayerDialogOpen}>
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

              <Card className={cn("p-4", activeDesign.card)}>
                <p className={cn("text-sm mb-2", activeDesign.textMuted)}>הברכה לפני הספירה</p>
                <p className="text-base font-semibold">{omerBlessing}</p>
              </Card>

              <Card className={cn("p-4", activeDesign.today)}>
                <p className={cn("text-sm mb-2", activeDesign.textMuted)}>הספירה של היום</p>
                <p className="text-lg font-bold">{selectedDay?.countText ?? ""}</p>
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
            </div>

            <div className={cn("sticky bottom-0 pt-2 pb-1 flex justify-start", activeDesign.dialogBg)}>
              <DialogClose asChild>
                <Button variant="outline" className="min-h-10 px-5" style={{ borderColor: activeDesign.accentColor }}>
                  סגור
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
