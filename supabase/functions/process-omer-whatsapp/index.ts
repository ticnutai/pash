import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getOmerDay(): number | null {
  const now = new Date();
  const year = now.getFullYear();
  const omerStart = new Date(year, 3, 3); // April 3 as day 1 (Pesach 2026)
  const diff = Math.floor((now.getTime() - omerStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (diff >= 1 && diff <= 49) return diff;
  return null;
}

function getOmerCountText(day: number): string {
  const weeks = Math.floor(day / 7);
  const days = day % 7;
  const hebrewNums = [
    "", "אחד", "שניים", "שלושה", "ארבעה", "חמישה", "שישה", "שבעה",
    "שמונה", "תשעה", "עשרה", "אחד עשר", "שנים עשר", "שלושה עשר",
    "ארבעה עשר", "חמישה עשר", "שישה עשר", "שבעה עשר", "שמונה עשר",
    "תשעה עשר", "עשרים", "עשרים ואחד", "עשרים ושניים", "עשרים ושלושה",
    "עשרים וארבעה", "עשרים וחמישה", "עשרים ושישה", "עשרים ושבעה",
    "עשרים ושמונה", "עשרים ותשעה", "שלושים", "שלושים ואחד", "שלושים ושניים",
    "שלושים ושלושה", "שלושים וארבעה", "שלושים וחמישה", "שלושים ושישה",
    "שלושים ושבעה", "שלושים ושמונה", "שלושים ותשעה", "ארבעים",
    "ארבעים ואחד", "ארבעים ושניים", "ארבעים ושלושה", "ארבעים וארבעה",
    "ארבעים וחמישה", "ארבעים ושישה", "ארבעים ושבעה", "ארבעים ושמונה",
    "ארבעים ותשעה"
  ];

  let text = `היום ${hebrewNums[day]} יום`;
  if (weeks > 0 && days > 0) {
    text += `, שהם ${weeks === 1 ? "שבוע אחד" : `${hebrewNums[weeks]} שבועות`} ו${hebrewNums[days]} ימים`;
  } else if (weeks > 0) {
    text += `, שהם ${weeks === 1 ? "שבוע אחד" : `${hebrewNums[weeks]} שבועות`}`;
  }
  text += " לעומר";
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioWhatsapp = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

    if (!twilioSid || !twilioToken || !twilioWhatsapp) {
      return new Response(JSON.stringify({ error: "Twilio credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const omerDay = getOmerDay();
    if (!omerDay) {
      return new Response(JSON.stringify({ message: "Not in Omer season", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const countText = getOmerCountText(omerDay);

    const { data: reminders, error: fetchError } = await supabase
      .from("omer_whatsapp_reminders")
      .select("*")
      .eq("is_active", true)
      .or(`last_sent_date.is.null,last_sent_date.neq.${todayStr}`);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to process", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const reminder of reminders) {
      try {
        const now = new Date();
        const userTime = new Date(now.toLocaleString("en-US", { timeZone: reminder.timezone }));
        const currentHour = userTime.getHours();
        const currentMinute = userTime.getMinutes();
        const [reminderHour, reminderMinute] = reminder.reminder_time.split(":").map(Number);

        if (currentHour !== reminderHour || Math.abs(currentMinute - reminderMinute) > 2) {
          continue;
        }

        const message = `🕯️ *תזכורת ספירת העומר*\n\nהיום יום *${omerDay}* לעומר\n\n${countText}\n\n📱 torhap.lovable.app`;

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const credentials = btoa(`${twilioSid}:${twilioToken}`);

        const formData = new URLSearchParams();
        formData.append("From", `whatsapp:${twilioWhatsapp}`);
        formData.append("To", `whatsapp:${reminder.phone_number}`);
        formData.append("Body", message);

        const response = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        if (response.ok) {
          await supabase
            .from("omer_whatsapp_reminders")
            .update({ status: "sent", last_sent_date: todayStr })
            .eq("id", reminder.id);
          sent++;
          console.log(`✅ WhatsApp sent to ${reminder.phone_number} for day ${omerDay}`);
        } else {
          const errData = await response.json();
          console.error(`Twilio error for ${reminder.phone_number}:`, errData);
          await supabase
            .from("omer_whatsapp_reminders")
            .update({ status: "failed" })
            .eq("id", reminder.id);
          failed++;
        }
      } catch (innerErr) {
        console.error(`Error processing reminder ${reminder.id}:`, innerErr);
        await supabase
          .from("omer_whatsapp_reminders")
          .update({ status: "failed" })
          .eq("id", reminder.id);
        failed++;
      }
    }

    // Reset sent reminders to pending for next day
    await supabase
      .from("omer_whatsapp_reminders")
      .update({ status: "pending" })
      .eq("status", "sent")
      .eq("last_sent_date", todayStr);

    return new Response(JSON.stringify({ 
      message: "Processing complete", 
      omerDay, sent, failed, total: reminders.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-omer-whatsapp error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
