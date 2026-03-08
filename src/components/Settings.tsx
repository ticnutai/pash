import { Settings as SettingsIcon, Palette, Type, Layout, Database, Calendar, BookmarkCheck, HardDrive, Bell, BellOff } from "lucide-react";
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
import { LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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
  const { settings: notifSettings, updateSettings: updateNotif, permission, requestPermission, sendTestNotification, supported: notifSupported } = useNotifications();

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
          <DialogTitle className="text-right text-xl sm:text-2xl flex items-center justify-end gap-2">
            <span>הגדרות</span>
            <SettingsIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="calendar" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 mb-4 sm:mb-6 gap-0.5 sm:gap-1">
            <TabsTrigger value="calendar" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 sm:px-3 py-1.5 sm:py-2">
              <span className="hidden sm:inline">לוח</span>
              <span className="sm:hidden">לוח</span>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 sm:px-3 py-1.5 sm:py-2">
              <span className="hidden sm:inline">תזכורות</span>
              <span className="sm:hidden">שעון</span>
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            </TabsTrigger>
            <TabsTrigger value="themes" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 sm:px-3 py-1.5 sm:py-2">
              <span className="hidden sm:inline">ערכות נושא</span>
              <span className="sm:hidden">נושא</span>
              <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
            </TabsTrigger>
            <TabsTrigger value="fonts" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 sm:px-3 py-1.5 sm:py-2">
              <span className="hidden sm:inline">גופנים וצבעים</span>
              <span className="sm:hidden">גופן</span>
              <Type className="h-3 w-3 sm:h-4 sm:w-4" />
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 sm:px-3 py-1.5 sm:py-2">
              <span className="hidden sm:inline">תצוגת טקסט</span>
              <span className="sm:hidden">תצוגה</span>
              <Layout className="h-3 w-3 sm:h-4 sm:w-4" />
            </TabsTrigger>
            <TabsTrigger value="sefaria" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 sm:px-3 py-1.5 sm:py-2">
              <span className="hidden sm:inline">אחסון והורדות</span>
              <span className="sm:hidden">אחסון</span>
              <HardDrive className="h-3 w-3 sm:h-4 sm:w-4" />
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 sm:px-3 py-1.5 sm:py-2">
              <span className="hidden sm:inline">ניהול נתונים</span>
              <span className="sm:hidden">נתונים</span>
              <Database className="h-3 w-3 sm:h-4 sm:w-4" />
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
          </TabsContent>

          {/* ── NOTIFICATION SETTINGS ─────────────────────────────── */}

          <TabsContent value="notifications" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-1 flex items-center gap-2 justify-end">
                    <span>תזכורת לימוד יומית</span>
                    <Bell className="h-5 w-5 text-primary" />
                  </h3>
                  <p className="text-sm text-muted-foreground text-right">
                    קבל תראות בדפדפן כדי להזכיר לעצמך ללמוד תורה מדי יום
                  </p>
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

                    {/* Enable toggle */}
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                      <Switch
                        id="notif-toggle"
                        checked={notifSettings.enabled}
                        disabled={permission !== "granted"}
                        onCheckedChange={(v) => updateNotif({ enabled: v })}
                      />
                      <div className="flex-1 text-right mr-3">
                        <Label htmlFor="notif-toggle" className="text-base font-semibold cursor-pointer">
                          התראות יומית
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notifSettings.enabled ? "פעיל" : "כבוי"}
                        </p>
                      </div>
                      {notifSettings.enabled ? (
                        <Bell className="h-5 w-5 text-primary ml-2" />
                      ) : (
                        <BellOff className="h-5 w-5 text-muted-foreground ml-2" />
                      )}
                    </div>

                    {/* Time picker */}
                    <div className="p-4 rounded-lg border space-y-3 text-right">
                      <Label className="font-semibold">שעת התזכורת</Label>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm text-muted-foreground">:דקות</span>
                        <Input
                          type="number"
                          min={0} max={59}
                          value={notifSettings.minute}
                          onChange={(e) => updateNotif({ minute: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                          className="w-16 text-center"
                        />
                        <span className="text-sm text-muted-foreground">:שעה</span>
                        <Input
                          type="number"
                          min={0} max={23}
                          value={notifSettings.hour}
                          onChange={(e) => updateNotif({ hour: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })}
                          className="w-16 text-center"
                        />
                      </div>
                    </div>

                    {/* Custom message */}
                    <div className="p-4 rounded-lg border space-y-2 text-right">
                      <Label className="font-semibold">הודעת התזכורת</Label>
                      <Input
                        value={notifSettings.message}
                        onChange={(e) => updateNotif({ message: e.target.value })}
                        className="text-right"
                        dir="rtl"
                        placeholder="זמן ללמוד תורה!"
                      />
                    </div>

                    {/* Test button */}
                    {permission === "granted" && (
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
