import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Clock, Check, Loader2, Globe, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEZONES = [
  { value: "Asia/Jerusalem", label: "ישראל (ירושלים)" },
  { value: "America/New_York", label: "ניו יורק (EST)" },
  { value: "America/Chicago", label: "שיקגו (CST)" },
  { value: "America/Los_Angeles", label: "לוס אנג'לס (PST)" },
  { value: "Europe/London", label: "לונדון (GMT)" },
  { value: "Europe/Paris", label: "פריז (CET)" },
  { value: "Europe/Berlin", label: "ברלין (CET)" },
  { value: "Australia/Sydney", label: "סידני (AEST)" },
];

const TWILIO_SANDBOX_NUMBER = "14155238886";
const TWILIO_JOIN_CODE = "join hope-older";
const WHATSAPP_JOIN_URL = `https://wa.me/${TWILIO_SANDBOX_NUMBER}?text=${encodeURIComponent(TWILIO_JOIN_CODE)}`;

interface OmerWhatsAppReminderFormProps {
  onClose?: () => void;
}

export function OmerWhatsAppReminderForm({ onClose }: OmerWhatsAppReminderFormProps) {
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState("20:00");
  const [timezone, setTimezone] = useState("Asia/Jerusalem");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const validatePhone = (value: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    const cleaned = value.replace(/[\s\-()]/g, "");
    if (!cleaned) {
      setPhoneError("נא להזין מספר טלפון");
      return false;
    }
    if (!phoneRegex.test(cleaned)) {
      setPhoneError("מספר טלפון לא תקין (כלול קידומת מדינה, לדוגמה: +972...)");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleSubmit = async () => {
    const cleaned = phone.replace(/[\s\-()]/g, "");
    if (!validatePhone(cleaned)) return;

    setIsSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from("omer_whatsapp_reminders" as any)
        .select("id")
        .eq("phone_number", cleaned)
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("omer_whatsapp_reminders" as any)
          .update({
            reminder_time: time,
            timezone,
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", (existing as any).id);

        if (error) throw error;
        toast.success("התזכורת עודכנה בהצלחה!");
      } else {
        const { error } = await supabase
          .from("omer_whatsapp_reminders" as any)
          .insert({
            phone_number: cleaned,
            reminder_time: time,
            timezone,
          });

        if (error) throw error;
        toast.success("נרשמת לתזכורת WhatsApp!");
      }

      setIsSuccess(true);
    } catch (err) {
      console.error("Error saving WhatsApp reminder:", err);
      toast.error("שגיאה בשמירת התזכורת. נסה שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center" dir="rtl">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-600" />
        </div>
        <p className="text-sm font-medium text-foreground">נרשמת בהצלחה!</p>
        <p className="text-xs text-muted-foreground">
          תקבל הודעת WhatsApp כל יום בשעה {time}
        </p>

        {/* Join WhatsApp sandbox step */}
        <div className="w-full mt-2 p-3 rounded-xl bg-green-50 border border-green-200 space-y-2">
          <p className="text-xs font-semibold text-green-800">
            📲 שלב אחרון — אישור קבלת הודעות
          </p>
          <p className="text-[11px] text-green-700 leading-relaxed">
            כדי לקבל את התזכורות, יש לשלוח הודעה אחת ב-WhatsApp.
            <br />
            לחץ על הכפתור — הכל מוכן, רק לחץ <strong>שלח</strong> 👇
          </p>
          <a
            href={WHATSAPP_JOIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold shadow-md transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            פתח WhatsApp ואשר
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      <div className="text-center mb-1">
        <h3 className="text-sm font-semibold text-foreground flex items-center justify-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-green-600" />
          תזכורת ספירה ב-WhatsApp
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          קבל תזכורת יומית בוואטסאפ
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="omer-phone" className="text-xs">מספר טלפון (עם קידומת מדינה)</Label>
        <Input
          id="omer-phone"
          type="tel"
          placeholder="+972501234567"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (phoneError) validatePhone(e.target.value.replace(/[\s\-()]/g, ""));
          }}
          className="h-9 text-sm"
          dir="ltr"
        />
        {phoneError && (
          <p className="text-xs text-destructive">{phoneError}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="omer-wa-time" className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            שעת תזכורת
          </Label>
          <Input
            id="omer-wa-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-9 text-sm"
            dir="ltr"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Globe className="w-3 h-3" />
            אזור זמן
          </Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value} className="text-xs">
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !phone}
        className="w-full h-9 text-sm mt-1 bg-green-600 hover:bg-green-700"
        size="sm"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            שומר...
          </>
        ) : (
          <>
            <MessageCircle className="w-4 h-4" />
            הרשם לתזכורת WhatsApp
          </>
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        ניתן לבטל בכל עת. התזכורת נשלחת בתקופת ספירת העומר בלבד.
      </p>
    </div>
  );
}