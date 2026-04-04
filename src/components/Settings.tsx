import { Settings as SettingsIcon, Palette, Type, Layout, Database, Calendar, BookmarkCheck, HardDrive, Bell, BellOff, Code, LogOut, MessageSquare, Camera, Eye, EyeOff, Plug, Plus, Trash2, Clock } from "lucide-react";
import { LocalDBManager } from "@/components/LocalDBManager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme, Theme } from "@/contexts/ThemeContext";
import { useFontAndColorSettings } from "@/contexts/FontAndColorSettingsContext";
import { DataManager } from "@/components/DataManager";
import { MigrationManager } from "@/components/MigrationManager";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ColorPicker } from "@/components/ColorPicker";
import { BookmarksDialog } from "@/components/BookmarksDialog";
import { getCalendarPreference, setCalendarPreference } from "@/utils/parshaUtils";
import { useNotifications } from "@/hooks/useNotifications";
import { Input } from "@/components/ui/input";
import { getRememberedCredentials, getAutoLoginEnabled, setAutoLoginEnabled, clearRememberedCredentials } from "@/pages/Auth";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

// ── API Keys cloud sync helpers ──────────────────────────
const API_KEY_FIELDS = [
  'api_openai_key', 'api_google_key', 'api_elevenlabs_key', 'api_anthropic_key',
  'api_twilio_sid', 'api_twilio_token', 'api_twilio_whatsapp_number',
  'api_sendgrid_key', 'api_sendgrid_from', 'api_mailgun_key', 'api_mailgun_domain',
] as const;

type ApiKeys = Partial<Record<string, string>>;

const loadLocalApiKeys = (): ApiKeys => {
  const keys: ApiKeys = {};
  for (const k of API_KEY_FIELDS) {
    const v = localStorage.getItem(k);
    if (v) keys[k] = v;
  }
  return keys;
};

const saveApiKeyLocal = (key: string, value: string) => {
  if (value) localStorage.setItem(key, value);
  else localStorage.removeItem(key);
};

const DEV_CHAT_ENABLED_KEY = "dev-chat-widget-enabled";
const DEV_SCREENSHOT_ENABLED_KEY = "dev-screenshot-tool-enabled";
const DEV_FLOATING_ENABLED_KEY = "dev-floating-buttons-enabled";
const DEV_FEATURES_EVENT = "dev-features:changed";

const getDevFeatureEnabled = (key: string, defaultValue: boolean): boolean => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return raw === "true";
  } catch {
    return defaultValue;
  }
};

const AutoLoginSetting = () => {
  const remembered = getRememberedCredentials();
  const autoLogin = getAutoLoginEnabled();
  const { user } = useAuth();

  if (!remembered && !user) return null;

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-lg mb-2">כניסה אוטומטית</h3>
        <p className="text-sm text-muted-foreground">
          הגדר כניסה אוטומטית לחשבון שנשמר
        </p>
      </div>
      
      <Separator />

      {remembered && (
        <>
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
            <div className="flex-1 text-right">
              <Label htmlFor="auto-login-toggle" className="text-base font-semibold cursor-pointer">
                כניסה אוטומטית
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                כאשר מופעל, תיכנס אוטומטית בלי לראות את דף הכניסה
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                חשבון שמור: {remembered.email}
              </p>
            </div>
            <Switch
              id="auto-login-toggle"
              checked={autoLogin}
              onCheckedChange={(checked) => {
                setAutoLoginEnabled(checked);
                toast.success(checked ? "כניסה אוטומטית הופעלה" : "כניסה אוטומטית כובתה");
              }}
            />
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              clearRememberedCredentials();
              toast.success("החשבון השמור נמחק. בכניסה הבאה תצטרך להזין פרטים מחדש.");
              // Force re-render
              window.location.reload();
            }}
          >
            <LogOut className="h-4 w-4" />
            <span>נתק חשבון שמור (שכח אותי)</span>
          </Button>
        </>
      )}

      {!remembered && user && (
        <div className="p-4 bg-muted/30 rounded-lg text-right">
          <p className="text-sm text-muted-foreground">
            כדי להפעיל כניסה אוטומטית, סמן "זכור אותי" בפעם הבאה שתתחבר.
          </p>
        </div>
      )}
    </Card>
  );
};

const themes = [
  { id: "light" as Theme, name: "בהיר", description: "נושא בהיר ונקי" },
  { id: "classic" as Theme, name: "קלאסי", description: "נושא מסורתי בגווני כחול וזהב" },
  { id: "royal-gold" as Theme, name: "זהב מלכותי", description: "נושא יוקרתי בגווני זהב ובורדו" },
  { id: "gold-silver" as Theme, name: "זהב-אפור", description: "נושא אלגנטי בגווני זהב ואפור" },
  { id: "elegant-night" as Theme, name: "לילה אלגנטי", description: "נושא כהה ומתוחכם" },
  { id: "ancient-scroll" as Theme, name: "מגילה עתיקה", description: "נושא בגווני קלף ודיו" },
];

const fonts = [
  { value: "David", label: "דוד" },
  { value: "Frank Ruehl Libre", label: "פרנק רוהל" },
  { value: "Miriam Libre", label: "מרים" },
  { value: "Rubik", label: "רוביק" },
  { value: "Heebo", label: "היבו" },
  { value: "Alef", label: "אלף" },
  { value: "Varela Round", label: "וארלה" },
  { value: "Arial", label: "אריאל" },
  { value: "Times New Roman", label: "טיימס" },
];

export const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useFontAndColorSettings();
  const [isIsrael, setIsIsrael] = useState(getCalendarPreference());
  const { settings: notifSettings, updateSettings: updateNotif, addReminder, updateReminder, removeReminder, permission, requestPermission, sendTestNotification, supported: notifSupported } = useNotifications();
  const { user } = useAuth();
  const [devFloatingEnabled, setDevFloatingEnabled] = useState(() => getDevFeatureEnabled(DEV_FLOATING_ENABLED_KEY, true));
  const [devChatEnabled, setDevChatEnabled] = useState(() => getDevFeatureEnabled(DEV_CHAT_ENABLED_KEY, true));
  const [devScreenshotEnabled, setDevScreenshotEnabled] = useState(() => getDevFeatureEnabled(DEV_SCREENSHOT_ENABLED_KEY, true));
  const [apiKeys, setApiKeys] = useState<ApiKeys>(loadLocalApiKeys);

  // Load API keys from cloud on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('user_settings')
        .select('api_keys')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.api_keys && typeof data.api_keys === 'object') {
        const cloud = data.api_keys as ApiKeys;
        // Merge cloud → local (cloud wins)
        for (const [k, v] of Object.entries(cloud)) {
          if (v) {
            localStorage.setItem(k, v);
          }
        }
        setApiKeys({ ...loadLocalApiKeys(), ...cloud });
      }
    })();
  }, [user]);

  const handleApiKeyChange = useCallback((key: string, value: string) => {
    saveApiKeyLocal(key, value);
    setApiKeys(prev => ({ ...prev, [key]: value || undefined }));
    // Debounced cloud save
    if (user) {
      const allKeys = { ...loadLocalApiKeys(), [key]: value || undefined };
      // Remove empty keys
      const cleaned: ApiKeys = {};
      for (const [k, v] of Object.entries(allKeys)) {
        if (v) cleaned[k] = v;
      }
      (supabase as any)
        .from('user_settings')
        .update({ api_keys: cleaned })
        .eq('user_id', user.id)
        .then(() => {});
    }
  }, [user]);


  useEffect(() => {
    if (!user) return;
    const cloudVal = user.user_metadata?.dev_floating_enabled;
    if (cloudVal === true || cloudVal === false) {
      setDevFloatingEnabled(cloudVal);
      localStorage.setItem(DEV_FLOATING_ENABLED_KEY, String(cloudVal));
      window.dispatchEvent(new CustomEvent(DEV_FEATURES_EVENT));
    }
    // Sync omer auto-open from cloud
    const omerAutoOpen = user.user_metadata?.omer_auto_open;
    if (omerAutoOpen === true || omerAutoOpen === false) {
      localStorage.setItem('omer-auto-open', String(omerAutoOpen));
    }
  }, [user]);

  const resetTextSizesToDefault = () => {
    updateSettings({
      pasukSize: 18,
      titleSize: 16,
      questionSize: 16,
      answerSize: 14,
      commentarySize: 18,
      fontScale: 1,
    });
    toast.success("גדלי הטקסט אופסו לברירת המחדל");
  };

  const handleCalendarChange = (checked: boolean) => {
    setIsIsrael(checked);
    setCalendarPreference(checked);
  };

  const handleDevChatToggle = (checked: boolean) => {
    setDevChatEnabled(checked);
    localStorage.setItem(DEV_CHAT_ENABLED_KEY, String(checked));
    window.dispatchEvent(new CustomEvent(DEV_FEATURES_EVENT));
    toast.success(checked ? "צ'אט פיתוח הופעל" : "צ'אט פיתוח כובה");
  };

  const handleDevScreenshotToggle = (checked: boolean) => {
    setDevScreenshotEnabled(checked);
    localStorage.setItem(DEV_SCREENSHOT_ENABLED_KEY, String(checked));
    window.dispatchEvent(new CustomEvent(DEV_FEATURES_EVENT));
    toast.success(checked ? "צילום מסך פיתוח הופעל" : "צילום מסך פיתוח כובה");
  };

  const handleDevFloatingToggle = (checked: boolean) => {
    setDevFloatingEnabled(checked);
    localStorage.setItem(DEV_FLOATING_ENABLED_KEY, String(checked));
    window.dispatchEvent(new CustomEvent(DEV_FEATURES_EVENT));
    toast.success(checked ? "כל כפתורי הפיתוח הופעלו" : "כל כפתורי הפיתוח כובו");
    // Sync to cloud
    if (user) {
      supabase.auth.updateUser({ data: { ...user.user_metadata, dev_floating_enabled: checked } })
        .catch(() => { /* ignore */ });
    }
  };

  const renderApiService = (name: string, description: string, fields: { key: string; label: string; placeholder: string; type: string }[]) => {
    const hasAnyKey = fields.some(f => !!apiKeys[f.key]);
    return (
      <div className="p-4 rounded-lg border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${hasAnyKey ? 'bg-primary' : 'bg-muted-foreground'}`} />
            <span className={`text-xs ${hasAnyKey ? 'text-primary' : 'text-muted-foreground'}`}>
              {hasAnyKey ? 'מחובר ☁️' : 'לא מחובר'}
            </span>
          </div>
          <h4 className="font-semibold">{name}</h4>
        </div>
        <p className="text-sm text-muted-foreground text-right">{description}</p>
        {fields.map(f => (
          <div key={f.key} className="space-y-2">
            <Label className="text-sm">{f.label}</Label>
            <Input
              type={f.type}
              placeholder={f.placeholder}
              dir="ltr"
              className="font-mono text-sm"
              value={apiKeys[f.key] || ''}
              onChange={(e) => handleApiKeyChange(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          data-settings-trigger
          data-layout="floating-settings" data-layout-label="⚙️ הגדרות צפות"
          size="icon"
          className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-40 bg-primary hover:bg-primary/90"
          style={{ bottom: 'max(calc(1rem + var(--safe-area-inset-bottom, var(--sai-bottom, env(safe-area-inset-bottom, 0px)))), 4rem)' }}
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent data-layout="dialog-settings" data-layout-label="📦 דיאלוג: הגדרות" className="w-[95vw] sm:max-w-[650px] max-h-[85vh] overflow-y-auto text-right">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs text-[#C8A44D] font-mono">v{__APP_VERSION__}</span>
            <DialogTitle className="text-right text-xl sm:text-2xl flex items-center justify-end gap-2">
              <span>הגדרות</span>
              <SettingsIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </DialogTitle>
          </div>
        </DialogHeader>

        <Tabs defaultValue="calendar" className="w-full" dir="rtl">
          <TabsList className="flex flex-wrap justify-center h-auto mb-4 sm:mb-6 gap-0.5 sm:gap-1 p-1">
            <TabsTrigger value="calendar" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2 min-w-0">
              <span className="truncate">לוח</span>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2 min-w-0">
              <span className="truncate">תזכורות</span>
              <Bell className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </TabsTrigger>
            <TabsTrigger value="themes" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2 min-w-0">
              <span className="truncate">נושא</span>
              <Palette className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </TabsTrigger>
            <TabsTrigger value="fonts" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2 min-w-0">
              <span className="truncate">גופן</span>
              <Type className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2 min-w-0">
              <span className="truncate">תצוגה</span>
              <Layout className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </TabsTrigger>
            <TabsTrigger value="sefaria" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2 min-w-0">
              <span className="truncate">אחסון</span>
              <HardDrive className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2 min-w-0">
              <span className="truncate">נתונים</span>
              <Database className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2 min-w-0">
              <span className="truncate">API</span>
              <Plug className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </TabsTrigger>
            <TabsTrigger value="dev" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2 min-w-0">
              <span className="truncate">פיתוח</span>
              <Code className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">הגדרות לוח עברי</h3>
                  <p className="text-sm text-muted-foreground">
                    בחר את סוג הלוח לחישוב פרשת השבוע
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex-1 text-right">
                      <Label htmlFor="calendar-toggle" className="text-base font-semibold cursor-pointer">
                        {isIsrael ? 'לוח ישראל' : 'לוח חוץ לארץ'}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isIsrael 
                          ? 'מחשב פרשת שבוע לפי לוח ישראל (חגים בין תפוצות מתקיימים יום אחד)'
                          : 'מחשב פרשת שבוע לפי לוח חוץ לארץ (חגים בין תפוצות מתקיימים שני ימים)'}
                      </p>
                    </div>
                    <Switch
                      id="calendar-toggle"
                      checked={isIsrael}
                      onCheckedChange={handleCalendarChange}
                    />
                  </div>

                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="space-y-1 text-right">
                        <p className="text-sm font-medium">
                          השינוי ישפיע על פרשת השבוע שתיטען בפתיחה הבאה של האפליקציה
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ההבדל בין הלוחות מתבטא בעיקר בתקופות שבהן חגים משפיעים על מחזור הפרשות
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">לוח ספירת העומר</h3>
                  <p className="text-sm text-muted-foreground">
                    הגדרות פתיחה אוטומטית של לוח ספירת העומר
                  </p>
                </div>
                <Separator />
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex-1 text-right">
                    <Label htmlFor="omer-auto-open" className="text-base font-semibold cursor-pointer">
                      פתח לוח עומר בעליית האתר
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      כאשר מופעל, לוח ספירת העומר ייפתח אוטומטית בכל כניסה לאתר (בתקופת הספירה)
                    </p>
                  </div>
                  <Switch
                    id="omer-auto-open"
                    checked={(() => {
                      try { return localStorage.getItem('omer-auto-open') === 'true'; } catch { return false; }
                    })()}
                    onCheckedChange={(checked) => {
                      localStorage.setItem('omer-auto-open', String(checked));
                      toast.success(checked ? "לוח העומר ייפתח אוטומטית" : "פתיחה אוטומטית כובתה");
                      // Sync to cloud
                      if (user) {
                        supabase.auth.updateUser({ data: { ...user.user_metadata, omer_auto_open: checked } })
                          .catch(() => {});
                      }
                    }}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ── NOTIFICATION SETTINGS ─────────────────────────────── */}

          <TabsContent value="notifications" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => addReminder()}>
                    <Plus className="h-4 w-4" />
                    הוסף תזכורת
                  </Button>
                  <div className="text-right">
                    <h3 className="font-semibold text-lg flex items-center gap-2 justify-end">
                      <span>תזכורות לימוד</span>
                      <Bell className="h-5 w-5 text-primary" />
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      הגדר תזכורות מרובות בשעות שונות
                    </p>
                  </div>
                </div>

                <Separator />

                {!notifSupported && (
                  <div className="p-4 bg-destructive/10 rounded-lg text-right text-sm text-destructive">
                    הדפדפן שלך אינו תומך בהתראות. זמין בעת שימוש באפליקציה המותקנת (PWA).
                  </div>
                )}

                {notifSupported && (
                  <div className="space-y-4">
                    {/* Permission */}
                    {permission !== "granted" && (
                      <div className="p-4 bg-accent/20 rounded-lg text-right space-y-2">
                        <p className="text-sm font-medium">יש לאשר גישה להתראות</p>
                        <Button size="sm" onClick={requestPermission}>
                          <Bell className="h-4 w-4 ml-2" />
                          אפשר התראות
                        </Button>
                        {permission === "denied" && (
                          <p className="text-xs text-destructive">הגישה נדחתה בהגדרות הדפדפן</p>
                        )}
                      </div>
                    )}

                    {/* Reminders list */}
                    {notifSettings.reminders.length === 0 && (
                      <div className="p-6 text-center text-muted-foreground text-sm border rounded-lg border-dashed">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>אין תזכורות מוגדרות</p>
                        <p className="text-xs mt-1">לחץ "הוסף תזכורת" כדי להתחיל</p>
                      </div>
                    )}

                    {notifSettings.reminders.map((reminder) => (
                      <div key={reminder.id} className="p-4 rounded-lg border space-y-3 bg-card">
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeReminder(reminder.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={reminder.enabled}
                              disabled={permission !== "granted"}
                              onCheckedChange={(v) => updateReminder(reminder.id, { enabled: v })}
                            />
                            <div className="text-right">
                              <span className="font-semibold text-sm">{reminder.label}</span>
                              <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
                                <span>{String(reminder.hour).padStart(2, "0")}:{String(reminder.minute).padStart(2, "0")}</span>
                                <Clock className="h-3 w-3" />
                              </div>
                            </div>
                            {reminder.enabled ? (
                              <Bell className="h-4 w-4 text-primary" />
                            ) : (
                              <BellOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Label */}
                        <div className="space-y-1 text-right">
                          <Label className="text-xs text-muted-foreground">שם התזכורת</Label>
                          <Input
                            value={reminder.label}
                            onChange={(e) => updateReminder(reminder.id, { label: e.target.value })}
                            className="text-right text-sm h-8"
                            dir="rtl"
                          />
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-2 justify-end">
                          <div className="flex items-center gap-1.5" dir="ltr">
                            <Input
                              type="number"
                              min={0} max={23}
                              value={String(reminder.hour).padStart(2, "0")}
                              onChange={(e) => updateReminder(reminder.id, { hour: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })}
                              className="w-14 text-center text-sm h-8"
                            />
                            <span className="font-mono font-bold text-lg">:</span>
                            <Input
                              type="number"
                              min={0} max={59}
                              value={String(reminder.minute).padStart(2, "0")}
                              onChange={(e) => updateReminder(reminder.id, { minute: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                              className="w-14 text-center text-sm h-8"
                            />
                          </div>
                        </div>

                        {/* Message */}
                        <div className="space-y-1 text-right">
                          <Label className="text-xs text-muted-foreground">הודעה</Label>
                          <Input
                            value={reminder.message}
                            onChange={(e) => updateReminder(reminder.id, { message: e.target.value })}
                            className="text-right text-sm h-8"
                            dir="rtl"
                          />
                        </div>

                        {/* Days picker */}
                        <div className="space-y-1 text-right">
                          <Label className="text-xs text-muted-foreground">ימים (ריק = כל יום)</Label>
                          <div className="flex gap-1 justify-end flex-wrap">
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
                                  className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                                    active
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground hover:bg-accent"
                                  }`}
                                >
                                  {dayLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Popup toggle */}
                        <div className="flex items-center justify-between">
                          <Switch
                            checked={reminder.popup}
                            onCheckedChange={(v) => updateReminder(reminder.id, { popup: v })}
                          />
                          <span className="text-sm text-right">הצג פופ-אפ באפליקציה</span>
                        </div>
                      </div>
                    ))}

                    {/* Test button */}
                    {permission === "granted" && notifSettings.reminders.length > 0 && (
                      <Button variant="outline" size="sm" className="w-full gap-2" onClick={sendTestNotification}>
                        <Bell className="h-4 w-4" />
                        שלח התראה לדוגמא
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="themes" className="space-y-4">
            <RadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
              {themes.map((t) => (
                <Card
                  key={t.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    theme === t.id ? "ring-2 ring-primary shadow-lg" : ""
                  }`}
                  onClick={() => setTheme(t.id)}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={t.id} id={t.id} />
                    <div className="flex-1 text-right">
                      <Label htmlFor={t.id} className="text-base font-semibold cursor-pointer">
                        {t.name}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </RadioGroup>
          </TabsContent>

          <TabsContent value="fonts" className="space-y-6">
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3" dir="rtl">
                <div className="text-right">
                  <p className="font-semibold">איפוס גדלי טקסט</p>
                  <p className="text-sm text-muted-foreground">מחזיר את כל הגדלים והזום לברירת המחדל</p>
                </div>
                <Button variant="outline" onClick={resetTextSizesToDefault}>איפוס</Button>
              </div>
            </Card>

            {/* Pasuk Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">פסוקים</h3>
              <div className="space-y-3 pr-4">
                <div className="space-y-2">
                  <Label>גופן</Label>
                  <Select
                    value={settings.pasukFont}
                    onValueChange={(value) => updateSettings({ pasukFont: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fonts.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-primary">{settings.pasukSize}</span>
                    <Label>גודל</Label>
                  </div>
                  <Slider
                    value={[settings.pasukSize]}
                    onValueChange={([value]) => updateSettings({ pasukSize: value })}
                    min={8}
                    max={32}
                    step={1}
                    className="w-full"
                  />
                </div>

                <ColorPicker
                  label="צבע"
                  value={settings.pasukColor}
                  onChange={(color) => updateSettings({ pasukColor: color })}
                />

                <div className="flex items-center justify-between">
                  <Switch
                    checked={settings.pasukBold}
                    onCheckedChange={(checked) => updateSettings({ pasukBold: checked })}
                  />
                  <Label>מודגש (Bold)</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Title Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">כותרות</h3>
              <div className="space-y-3 pr-4">
                <div className="space-y-2">
                  <Label>גופן</Label>
                  <Select
                    value={settings.titleFont}
                    onValueChange={(value) => updateSettings({ titleFont: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fonts.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-primary">{settings.titleSize}</span>
                    <Label>גודל</Label>
                  </div>
                  <Slider
                    value={[settings.titleSize]}
                    onValueChange={([value]) => updateSettings({ titleSize: value })}
                    min={8}
                    max={28}
                    step={1}
                    className="w-full"
                  />
                </div>

                <ColorPicker
                  label="צבע"
                  value={settings.titleColor}
                  onChange={(color) => updateSettings({ titleColor: color })}
                />

                <div className="flex items-center justify-between">
                  <Switch
                    checked={settings.titleBold}
                    onCheckedChange={(checked) => updateSettings({ titleBold: checked })}
                  />
                  <Label>מודגש (Bold)</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Question Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">שאלות</h3>
              <div className="space-y-3 pr-4">
                <div className="space-y-2">
                  <Label>גופן</Label>
                  <Select
                    value={settings.questionFont}
                    onValueChange={(value) => updateSettings({ questionFont: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fonts.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-primary">{settings.questionSize}</span>
                    <Label>גודל</Label>
                  </div>
                  <Slider
                    value={[settings.questionSize]}
                    onValueChange={([value]) => updateSettings({ questionSize: value })}
                    min={8}
                    max={28}
                    step={1}
                    className="w-full"
                  />
                </div>

                <ColorPicker
                  label="צבע"
                  value={settings.questionColor}
                  onChange={(color) => updateSettings({ questionColor: color })}
                />

                <div className="flex items-center justify-between">
                  <Switch
                    checked={settings.questionBold}
                    onCheckedChange={(checked) => updateSettings({ questionBold: checked })}
                  />
                  <Label>מודגש (Bold)</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Answer Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">תשובות</h3>
              <div className="space-y-3 pr-4">
                <div className="space-y-2">
                  <Label>גופן</Label>
                  <Select
                    value={settings.answerFont}
                    onValueChange={(value) => updateSettings({ answerFont: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fonts.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-primary">{settings.answerSize}</span>
                    <Label>גודל</Label>
                  </div>
                  <Slider
                    value={[settings.answerSize]}
                    onValueChange={([value]) => updateSettings({ answerSize: value })}
                    min={8}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>

                <ColorPicker
                  label="צבע"
                  value={settings.answerColor}
                  onChange={(color) => updateSettings({ answerColor: color })}
                />

                <div className="flex items-center justify-between">
                  <Switch
                    checked={settings.answerBold}
                    onCheckedChange={(checked) => updateSettings({ answerBold: checked })}
                  />
                  <Label>מודגש (Bold)</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Commentary Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">מפרשים</h3>
              <div className="space-y-3 pr-4">
                <div className="space-y-2">
                  <Label>גופן</Label>
                  <Select
                    value={settings.commentaryFont}
                    onValueChange={(value) => updateSettings({ commentaryFont: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fonts.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-primary">{settings.commentarySize}</span>
                    <Label>גודל</Label>
                  </div>
                  <Slider
                    value={[settings.commentarySize]}
                    onValueChange={([value]) => updateSettings({ commentarySize: value })}
                    min={8}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>

                <ColorPicker
                  label="צבע"
                  value={settings.commentaryColor}
                  onChange={(color) => updateSettings({ commentaryColor: color })}
                />

                <div className="flex items-center justify-between">
                  <Switch
                    checked={settings.commentaryBold}
                    onCheckedChange={(checked) => updateSettings({ commentaryBold: checked })}
                  />
                  <Label>מודגש (Bold)</Label>
                </div>
              </div>
            </div>

            {/* Preview */}
            <Separator />
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-sm text-muted-foreground">תצוגה מקדימה</h4>
              <div className="space-y-3">
                <p 
                  style={{ 
                    fontFamily: settings.pasukFont, 
                    fontSize: `${settings.pasukSize}px`,
                    color: settings.pasukColor,
                    fontWeight: settings.pasukBold ? 'bold' : 'normal'
                  }}
                  className="text-right"
                >
                  בְּרֵאשִׁית בָּרָא אֱלֹהִים
                </p>
                <p 
                  style={{ 
                    fontFamily: settings.titleFont, 
                    fontSize: `${settings.titleSize}px`,
                    color: settings.titleColor,
                    fontWeight: settings.titleBold ? 'bold' : 'normal'
                  }}
                  className="text-right"
                >
                  כותרת לדוגמה
                </p>
                <p 
                  style={{ 
                    fontFamily: settings.questionFont, 
                    fontSize: `${settings.questionSize}px`,
                    color: settings.questionColor,
                    fontWeight: settings.questionBold ? 'bold' : 'normal'
                  }}
                  className="text-right"
                >
                  מה הפירוש של המילה "בראשית"?
                </p>
                <p 
                  style={{ 
                    fontFamily: settings.answerFont, 
                    fontSize: `${settings.answerSize}px`,
                    color: settings.answerColor,
                    fontWeight: settings.answerBold ? 'bold' : 'normal'
                  }}
                  className="text-right"
                >
                  רש"י: בתחילת בריאת השמים והארץ
                </p>
                <p 
                  style={{ 
                    fontFamily: settings.commentaryFont, 
                    fontSize: `${settings.commentarySize}px`,
                    color: settings.commentaryColor,
                    fontWeight: settings.commentaryBold ? 'bold' : 'normal'
                  }}
                  className="text-right"
                >
                  רמב"ן: פירוש המילה "בראשית" - בתחילת הכל
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="display" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">יישור טקסט</h3>
              <RadioGroup 
                value={settings.textAlignment} 
                onValueChange={(value) => updateSettings({ textAlignment: value as any })}
                className="flex gap-4 justify-center"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="right" id="align-right" />
                  <Label htmlFor="align-right">ימין</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="center" id="align-center" />
                  <Label htmlFor="align-center">מרכז</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="left" id="align-left" />
                  <Label htmlFor="align-left">שמאל</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="justify" id="align-justify" />
                  <Label htmlFor="align-justify">ישור</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">מרווח תוכן</h3>
              <RadioGroup 
                value={settings.contentSpacing} 
                onValueChange={(value) => updateSettings({ contentSpacing: value as any })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="compact" id="spacing-compact" />
                  <Label htmlFor="spacing-compact" className="flex-1 text-right">
                    <div className="font-semibold">צפוף</div>
                    <div className="text-sm text-muted-foreground">מרווח קטן בין אלמנטים</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normal" id="spacing-normal" />
                  <Label htmlFor="spacing-normal" className="flex-1 text-right">
                    <div className="font-semibold">רגיל</div>
                    <div className="text-sm text-muted-foreground">מרווח סטנדרטי</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="comfortable" id="spacing-comfortable" />
                  <Label htmlFor="spacing-comfortable" className="flex-1 text-right">
                    <div className="font-semibold">נוח</div>
                    <div className="text-sm text-muted-foreground">מרווח בינוני</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spacious" id="spacing-spacious" />
                  <Label htmlFor="spacing-spacious" className="flex-1 text-right">
                    <div className="font-semibold">מרווח</div>
                    <div className="text-sm text-muted-foreground">מרווח גדול</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">גובה שורה</h3>
              <RadioGroup 
                value={settings.lineHeight} 
                onValueChange={(value) => updateSettings({ lineHeight: value as any })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tight" id="line-tight" />
                  <Label htmlFor="line-tight" className="flex-1 text-right">
                    <div className="font-semibold">צמוד</div>
                    <div className="text-sm text-muted-foreground">1.3 - שורות קרובות</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normal" id="line-normal" />
                  <Label htmlFor="line-normal" className="flex-1 text-right">
                    <div className="font-semibold">רגיל</div>
                    <div className="text-sm text-muted-foreground">1.5 - גובה סטנדרטי</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="relaxed" id="line-relaxed" />
                  <Label htmlFor="line-relaxed" className="flex-1 text-right">
                    <div className="font-semibold">רגוע</div>
                    <div className="text-sm text-muted-foreground">1.7 - שורות מרווחות</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="loose" id="line-loose" />
                  <Label htmlFor="line-loose" className="flex-1 text-right">
                    <div className="font-semibold">רפוי</div>
                    <div className="text-sm text-muted-foreground">2.0 - מרווח מקסימלי</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">רוחב תוכן</h3>
              <RadioGroup 
                value={settings.contentWidth} 
                onValueChange={(value) => updateSettings({ contentWidth: value as any })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="narrow" id="width-narrow" />
                  <Label htmlFor="width-narrow" className="flex-1 text-right">
                    <div className="font-semibold">צר</div>
                    <div className="text-sm text-muted-foreground">600px - מתאים לקריאה ממוקדת</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normal" id="width-normal" />
                  <Label htmlFor="width-normal" className="flex-1 text-right">
                    <div className="font-semibold">רגיל</div>
                    <div className="text-sm text-muted-foreground">800px - רוחב סטנדרטי</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="wide" id="width-wide" />
                  <Label htmlFor="width-wide" className="flex-1 text-right">
                    <div className="font-semibold">רחב</div>
                    <div className="text-sm text-muted-foreground">1000px - רוחב גדול</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="width-full" />
                  <Label htmlFor="width-full" className="flex-1 text-right">
                    <div className="font-semibold">מלא</div>
                    <div className="text-sm text-muted-foreground">100% - מילוי המסך</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>

          <TabsContent value="sefaria" className="space-y-4">
            <LocalDBManager />
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <AutoLoginSetting />

            <Card className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">הסימניות שלי</h3>
                <p className="text-sm text-muted-foreground">
                  צפה וערוך את כל הפסוקים שסימנת
                </p>
              </div>
              
              <div className="flex justify-center">
                <BookmarksDialog />
              </div>
            </Card>
            
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">הגדרות שיתוף</h3>
                <p className="text-sm text-muted-foreground">
                  בחר אם ברצונך לראות תכנים משותפים ממשתמשים אחרים
                </p>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <div className="flex-1 text-right">
                  <Label htmlFor="show-shared-toggle" className="text-base font-semibold cursor-pointer">
                    הצג תכנים משותפים
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    כאשר מופעל, תוכל לראות כותרות, שאלות ותשובות שמשתמשים אחרים שיתפו
                  </p>
                </div>
                <Switch
                  id="show-shared-toggle"
                  defaultChecked={true}
                />
              </div>
            </Card>
            
            <div className="text-center py-4">
              <DataManager />
            </div>
            <div className="text-sm text-muted-foreground text-right p-4 bg-muted/30 rounded-lg space-y-2">
              <p className="font-semibold">💾 מה נשמר בייצוא?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>כל ההגדרות (גופנים, צבעים, ערכות נושא)</li>
                <li>הערות שהוספת לפסוקים</li>
                <li>סימניות והדגשות</li>
                <li>תוכן חדש שיצרת (שאלות, תשובות, כותרות)</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 justify-end">
                  <span>שירותי API</span>
                  <Plug className="h-5 w-5 text-primary" />
                </h3>
                <p className="text-sm text-muted-foreground">
                  חבר שירותים חיצוניים לשיפור חוויית הלימוד
                </p>
              </div>

              <Separator />

              {/* OpenAI */}
              {renderApiService('OpenAI', 'חיבור ל-ChatGPT לפירושים, שאלות ותשובות ותרגומים', [
                { key: 'api_openai_key', label: 'API Key', placeholder: 'sk-...', type: 'password' },
              ])}

              {/* Google Cloud */}
              {renderApiService('Google Cloud', 'טקסט לדיבור (TTS), תרגום ושירותי AI נוספים', [
                { key: 'api_google_key', label: 'API Key', placeholder: 'AIza...', type: 'password' },
              ])}

              {/* Sefaria API - always connected */}
              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-xs text-primary">זמין (ציבורי)</span>
                  </div>
                  <h4 className="font-semibold">Sefaria API</h4>
                </div>
                <p className="text-sm text-muted-foreground text-right">
                  גישה לספריית ספרות יהודית — טקסטים, תרגומים ומפרשים
                </p>
                <div className="p-3 bg-primary/5 rounded-lg text-right">
                  <p className="text-sm text-primary">✓ שירות ציבורי — לא דורש מפתח API</p>
                </div>
              </div>

              {/* Supabase - always connected */}
              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-xs text-primary">מחובר</span>
                  </div>
                  <h4 className="font-semibold">בסיס נתונים</h4>
                </div>
                <p className="text-sm text-muted-foreground text-right">
                  בסיס הנתונים, אימות משתמשים וסנכרון
                </p>
                <div className="p-3 bg-primary/5 rounded-lg text-right">
                  <p className="text-sm text-primary">✓ מחובר ופעיל</p>
                </div>
              </div>

              {/* ElevenLabs */}
              {renderApiService('ElevenLabs', 'הקראת טקסט קדוש בקול טבעי ואיכותי', [
                { key: 'api_elevenlabs_key', label: 'API Key', placeholder: 'xi-...', type: 'password' },
              ])}

              {/* Anthropic */}
              {renderApiService('Anthropic (Claude)', 'AI מתקדם לניתוח טקסטים, פירושים וסיכומים', [
                { key: 'api_anthropic_key', label: 'API Key', placeholder: 'sk-ant-...', type: 'password' },
              ])}

              <Separator className="my-2" />
              <h3 className="font-semibold text-base text-right">הודעות ותקשורת</h3>

              {/* Twilio */}
              {renderApiService('Twilio', 'שליחת הודעות WhatsApp ו-SMS — פרשת שבוע, תזכורות ושיתוף תכנים', [
                { key: 'api_twilio_sid', label: 'Account SID', placeholder: 'AC...', type: 'password' },
                { key: 'api_twilio_token', label: 'Auth Token', placeholder: 'token...', type: 'password' },
                { key: 'api_twilio_whatsapp_number', label: 'מספר WhatsApp (לדוג׳ +14155238886)', placeholder: '+1...', type: 'text' },
              ])}

              {/* SendGrid */}
              {renderApiService('SendGrid', 'שליחת מיילים — סיכום שבועי, שיתוף פרשה ועדכונים', [
                { key: 'api_sendgrid_key', label: 'API Key', placeholder: 'SG...', type: 'password' },
                { key: 'api_sendgrid_from', label: 'כתובת שולח (From Email)', placeholder: 'noreply@example.com', type: 'email' },
              ])}

              {/* Mailgun */}
              {renderApiService('Mailgun', 'חלופה לשליחת מיילים — תמיכה ברשימות תפוצה ותבניות', [
                { key: 'api_mailgun_key', label: 'API Key', placeholder: 'key-...', type: 'password' },
                { key: 'api_mailgun_domain', label: 'Domain', placeholder: 'mg.example.com', type: 'text' },
              ])}
            </Card>

            <div className="text-sm text-muted-foreground text-right p-4 bg-muted/30 rounded-lg space-y-2">
              <p className="font-semibold">☁️ סנכרון ענן</p>
              <p>מפתחות ה-API נשמרים בענן ומסונכרנים בין כל המכשירים שלך. {!user && '(יש להתחבר כדי לסנכרן)'}</p>
            </div>
          </TabsContent>

          <TabsContent value="dev" className="space-y-4">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">אייקוני פיתוח</h3>
                <p className="text-sm text-muted-foreground">
                  הפעלה וכיבוי של כפתורי הפיתוח במסך הראשי, עם שמירת המצב האחרון
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <Switch
                  id="dev-floating-toggle"
                  checked={devFloatingEnabled}
                  onCheckedChange={handleDevFloatingToggle}
                />
                <div className="flex-1 text-right mr-3">
                  <Label htmlFor="dev-floating-toggle" className="text-base font-semibold cursor-pointer">
                    כל כפתורי הפיתוח המסומנים
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    כיבוי אחד שסוגר את כל הכפתורים הצפים שסימנת
                  </p>
                </div>
                <div className="ml-2 text-muted-foreground">
                  {devFloatingEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <Switch
                  id="dev-chat-toggle"
                  checked={devChatEnabled}
                  onCheckedChange={handleDevChatToggle}
                  disabled={!devFloatingEnabled}
                />
                <div className="flex-1 text-right mr-3">
                  <Label htmlFor="dev-chat-toggle" className="text-base font-semibold cursor-pointer">
                    אייקון צ'אט פיתוח
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    מציג/מסתיר את כפתור הצ'אט הצף בצד שמאל
                  </p>
                </div>
                <div className="ml-2 text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="ml-2 text-muted-foreground">
                  {devChatEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <Switch
                  id="dev-screenshot-toggle"
                  checked={devScreenshotEnabled}
                  onCheckedChange={handleDevScreenshotToggle}
                  disabled={!devFloatingEnabled}
                />
                <div className="flex-1 text-right mr-3">
                  <Label htmlFor="dev-screenshot-toggle" className="text-base font-semibold cursor-pointer">
                    אייקון צילום פיתוח
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    מציג/מסתיר את כפתור הצילום הצף בצד שמאל
                  </p>
                </div>
                <div className="ml-2 text-primary">
                  <Camera className="h-5 w-5" />
                </div>
                <div className="ml-2 text-muted-foreground">
                  {devScreenshotEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </div>
              </div>
            </Card>

            <MigrationManager />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
