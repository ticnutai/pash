// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Clock, Check, Loader2, Globe } from "lucide-react";
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

interface OmerEmailReminderFormProps {
  onClose?: () => void;
}

export function OmerEmailReminderForm({ onClose }: OmerEmailReminderFormProps) {
  const [email, setEmail] = useState("");
  const [time, setTime] = useState("20:00");
  const [timezone, setTimezone] = useState("Asia/Jerusalem");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError("נא להזין כתובת מייל");
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError("כתובת מייל לא תקינה");
      return false;
    }
    if (value.length > 255) {
      setEmailError("כתובת מייל ארוכה מדי");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = async () => {
    if (!validateEmail(email)) return;

    setIsSubmitting(true);
    try {
      // Check if this email already has an active reminder
      const { data: existing } = await supabase
        .from("omer_email_reminders")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        // Update existing reminder
        const { error } = await supabase
          .from("omer_email_reminders")
          .update({
            reminder_time: time,
            timezone,
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
        toast.success("התזכורת עודכנה בהצלחה!");
      } else {
        // Create new reminder
        const { error } = await supabase
          .from("omer_email_reminders")
          .insert({
            email: email.trim().toLowerCase(),
            reminder_time: time,
            timezone,
          });

        if (error) throw error;
        toast.success("נרשמת לתזכורת ספירת העומר!");
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose?.();
      }, 2000);
    } catch (err) {
      console.error("Error saving reminder:", err);
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
          תקבל מייל תזכורת כל יום בשעה {time}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      <div className="text-center mb-1">
        <h3 className="text-sm font-semibold text-foreground flex items-center justify-center gap-1.5">
          <Mail className="w-4 h-4" />
          תזכורת ספירה במייל
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          קבל תזכורת יומית לספירת העומר
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="omer-email" className="text-xs">כתובת מייל</Label>
        <Input
          id="omer-email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) validateEmail(e.target.value);
          }}
          className="h-9 text-sm"
          dir="ltr"
        />
        {emailError && (
          <p className="text-xs text-destructive">{emailError}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="omer-time" className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            שעת תזכורת
          </Label>
          <Input
            id="omer-time"
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
        disabled={isSubmitting || !email}
        className="w-full h-9 text-sm mt-1"
        size="sm"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            שומר...
          </>
        ) : (
          <>
            <Mail className="w-4 h-4" />
            הרשם לתזכורת
          </>
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center">
        ניתן לבטל בכל עת. התזכורת נשלחת בתקופת ספירת העומר בלבד.
      </p>
    </div>
  );
}
