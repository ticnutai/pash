import { useEffect, useMemo, useState } from "react";
import { Sparkles, CalendarDays, LayoutGrid, Table2, Rows3, Palette, Share2, Mail, MessageCircle, Bell, BellOff, Plus, Trash2, Clock } from "lucide-react";
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
import { useNotifications, createDefaultReminder } from "@/hooks/useNotifications";
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
type OmerDesignMode = "classic" | "parchment" | "clean" | "golden" | "dark" | "colorful";

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
  const [designMode, setDesignMode] = useState<OmerDesignMode>("classic");
  const { user } = useAuth();
  const { settings: notifSettings, addReminder, updateReminder, removeReminder, permission, requestPermission, supported: notifSupported } = useNotifications();
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

  const cycleDesignMode = () => {
    setDesignMode((prev) => {
      if (prev === "classic") return "parchment";
      if (prev === "parchment") return "clean";
      if (prev === "clean") return "golden";
      if (prev === "golden") return "dark";
      if (prev === "dark") return "colorful";
      return "classic";
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

  const currentDesignLabel =
    designMode === "classic" ? "קלאסי" :
    designMode === "parchment" ? "קלף" :
    designMode === "clean" ? "נקי" :
    designMode === "golden" ? "זהב מלכותי" :
    designMode === "dark" ? "לילה" :
    "צבעוני";

  const viewOptions: Array<{ value: OmerViewMode; label: string }> = [
    { value: "grid", label: "רשת" },
    { value: "table", label: "טבלה" },
    { value: "compact", label: "קומפקטי" },
    { value: "weekly", label: "שבועי" },
  ];

  const designOptions: Array<{ value: OmerDesignMode; label: string }> = [
    { value: "classic", label: "קלאסי" },
    { value: "parchment", label: "קלף" },
    { value: "clean", label: "נקי" },
    { value: "golden", label: "זהב מלכותי" },
    { value: "dark", label: "לילה" },
    { value: "colorful", label: "צבעוני" },
  ];

  const weeklyGroups = useMemo(() => {
    const groups: Array<{ week: number; days: typeof board.days }> = [];
    for (let i = 0; i < board.days.length; i += 7) {
      groups.push({ week: Math.floor(i / 7) + 1, days: board.days.slice(i, i + 7) });
    }
    return groups;
  }, [board.days]);

  const designStyles = {
    classic: {
      boardBg: "bg-white",
      card: "border-[#D6B66A]/70 bg-white",
      today: "border-[#C8A44D] bg-[#F7F1E1] ring-2 ring-[#C8A44D]/60",
      header: "bg-[#F7F1E1]",
      dialogBorder: "border-[#C8A44D]",
      dialogBg: "bg-white",
      textColor: "text-[#0B1F4A]",
      textMuted: "text-[#0B1F4A]/70",
      accentColor: "#C8A44D",
    },
    parchment: {
      boardBg: "bg-[#FFFDF7]",
      card: "border-[#B89B57]/70 bg-[#FFFCF0]",
      today: "border-[#B89B57] bg-[#F2E7C9] ring-2 ring-[#B89B57]/60",
      header: "bg-[#EFE4C8]",
      dialogBorder: "border-[#B89B57]",
      dialogBg: "bg-[#FFFDF7]",
      textColor: "text-[#3B2F1A]",
      textMuted: "text-[#3B2F1A]/70",
      accentColor: "#B89B57",
    },
    clean: {
      boardBg: "bg-white",
      card: "border-[#CBD5E1] bg-[#F8FAFC]",
      today: "border-[#64748B] bg-[#E2E8F0] ring-2 ring-[#64748B]/50",
      header: "bg-[#EEF2F7]",
      dialogBorder: "border-[#CBD5E1]",
      dialogBg: "bg-white",
      textColor: "text-[#1E293B]",
      textMuted: "text-[#64748B]",
      accentColor: "#64748B",
    },
    golden: {
      boardBg: "bg-gradient-to-b from-[#1A0F00] to-[#2D1A00]",
      card: "border-[#DAA520]/60 bg-gradient-to-br from-[#2D1A00] to-[#3D2400] shadow-md shadow-[#DAA520]/10",
      today: "border-[#FFD700] bg-gradient-to-br from-[#3D2400] to-[#4D2E00] ring-2 ring-[#FFD700]/70 shadow-lg shadow-[#FFD700]/20",
      header: "bg-gradient-to-r from-[#2D1A00] to-[#3D2400]",
      dialogBorder: "border-[#DAA520]",
      dialogBg: "bg-gradient-to-b from-[#1A0F00] to-[#2D1A00]",
      textColor: "text-[#F5DEB3]",
      textMuted: "text-[#DAA520]/80",
      accentColor: "#FFD700",
    },
    dark: {
      boardBg: "bg-[#0F172A]",
      card: "border-[#334155] bg-[#1E293B]",
      today: "border-[#60A5FA] bg-[#1E3A5F] ring-2 ring-[#60A5FA]/50 shadow-lg shadow-[#60A5FA]/10",
      header: "bg-[#1E293B]",
      dialogBorder: "border-[#334155]",
      dialogBg: "bg-[#0F172A]",
      textColor: "text-[#E2E8F0]",
      textMuted: "text-[#94A3B8]",
      accentColor: "#60A5FA",
    },
    colorful: {
      boardBg: "bg-gradient-to-br from-[#FFF7ED] via-[#FEF3C7] to-[#ECFDF5]",
      card: "border-[#F59E0B]/40 bg-white/80 backdrop-blur-sm",
      today: "border-[#8B5CF6] bg-gradient-to-br from-[#EDE9FE] to-[#FEF3C7] ring-2 ring-[#8B5CF6]/50 shadow-lg",
      header: "bg-gradient-to-r from-[#FEF3C7] to-[#ECFDF5]",
      dialogBorder: "border-[#F59E0B]",
      dialogBg: "bg-gradient-to-br from-[#FFF7ED] via-[#FEF3C7] to-[#ECFDF5]",
      textColor: "text-[#1C1917]",
      textMuted: "text-[#78716C]",
      accentColor: "#8B5CF6",
    },
  } as const;

  const activeDesign = designStyles[designMode];

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

                {/* ── Reminder Bell ── */}
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
                      {notifSettings.reminders.filter((r) => r.enabled).length > 0 && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 max-h-[70vh] overflow-y-auto p-4 direction-rtl" dir="rtl">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => addReminder({ label: "תזכורת עומר", message: "🕯️ זמן לספור ספירת העומר!" })}>
                          <Plus className="h-3 w-3" />
                          הוסף
                        </Button>
                        <h4 className="font-semibold text-sm flex items-center gap-1">
                          <Bell className="h-4 w-4 text-primary" />
                          תזכורות
                        </h4>
                      </div>
                      <Separator />

                      {!notifSupported && (
                        <p className="text-xs text-destructive">הדפדפן אינו תומך בהתראות</p>
                      )}

                      {notifSupported && permission !== "granted" && (
                        <Button size="sm" className="w-full text-xs h-7" onClick={requestPermission}>
                          <Bell className="h-3 w-3 ml-1" />
                          אפשר התראות
                        </Button>
                      )}

                      {notifSettings.reminders.length === 0 && (
                        <div className="text-center text-muted-foreground text-xs py-3">
                          <BellOff className="h-5 w-5 mx-auto mb-1 opacity-50" />
                          <p>אין תזכורות</p>
                        </div>
                      )}

                      {notifSettings.reminders.map((reminder) => (
                        <div key={reminder.id} className="p-2 rounded-md border space-y-2 bg-card text-xs">
                          <div className="flex items-center justify-between">
                            <button
                              className="text-destructive hover:text-destructive/80"
                              onClick={() => removeReminder(reminder.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={reminder.enabled}
                                disabled={permission !== "granted"}
                                onCheckedChange={(v) => updateReminder(reminder.id, { enabled: v })}
                                className="scale-75"
                              />
                              <span className="font-medium">{reminder.label}</span>
                              {reminder.enabled ? <Bell className="h-3 w-3 text-primary" /> : <BellOff className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 justify-end">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <Input
                              type="number" min={0} max={23}
                              value={reminder.hour}
                              onChange={(e) => updateReminder(reminder.id, { hour: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })}
                              className="w-12 text-center text-xs h-6 px-1"
                            />
                            <span>:</span>
                            <Input
                              type="number" min={0} max={59}
                              value={reminder.minute}
                              onChange={(e) => updateReminder(reminder.id, { minute: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                              className="w-12 text-center text-xs h-6 px-1"
                            />
                          </div>

                          <Input
                            value={reminder.message}
                            onChange={(e) => updateReminder(reminder.id, { message: e.target.value })}
                            className="text-right text-xs h-6"
                            dir="rtl"
                          />

                          <div className="flex gap-0.5 justify-end">
                            {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map((dayLabel, idx) => {
                              const active = reminder.days.includes(idx);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    const days = active
                                      ? reminder.days.filter((d) => d !== idx)
                                      : [...reminder.days, idx];
                                    updateReminder(reminder.id, { days });
                                  }}
                                  className={`w-6 h-6 rounded-full text-[10px] font-medium transition-colors ${
                                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                                  }`}
                                >
                                  {dayLabel}
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between">
                            <Switch
                              checked={reminder.popup}
                              onCheckedChange={(v) => updateReminder(reminder.id, { popup: v })}
                              className="scale-75"
                            />
                            <span className="text-muted-foreground">פופ-אפ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={cycleDesignMode}
                  className={cn("h-9 w-9 sm:h-8 sm:w-8", activeDesign.textColor)}
                  style={{ borderColor: activeDesign.accentColor }}
                  title="החלף עיצוב"
                >
                  <Palette className="h-4 w-4" />
                </Button>
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
                {designOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDesignMode(option.value)}
                    className={cn(
                      "min-h-9",
                      designMode === option.value ? "font-semibold" : "",
                    )}
                    style={{ borderColor: activeDesign.accentColor }}
                  >
                    {option.label}
                  </Button>
                ))}
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
