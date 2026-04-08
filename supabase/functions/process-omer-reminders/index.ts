import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hebrew Omer counting text generator
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

function getOmerDay(): number | null {
  // Simple calculation: Pesach 2026 starts evening of April 1
  // Omer counting starts from 2nd night of Pesach (April 2 evening)
  // Day 1 = April 3 (after sunset April 2)
  const now = new Date();
  const year = now.getFullYear();
  
  // Approximate: use a fixed reference for current year
  // Pesach 2026: April 1-8, Omer starts April 2 evening
  // For production, integrate with hebcal
  const omerStart = new Date(year, 3, 3); // April 3 as day 1
  const diff = Math.floor((now.getTime() - omerStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  if (diff >= 1 && diff <= 49) return diff;
  return null;
}

function generateEmailHtml(omerDay: number): string {
  const countText = getOmerCountText(omerDay);
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family: 'David Libre', 'Noto Serif Hebrew', serif; background: #ffffff; padding: 20px; direction: rtl;">
  <div style="max-width: 500px; margin: 0 auto; background: #f8f6f0; border-radius: 12px; padding: 30px; border: 2px solid #d4a853;">
    <h1 style="text-align: center; color: #1a365d; font-size: 24px; margin-bottom: 10px;">🕯️ תזכורת ספירת העומר</h1>
    <div style="text-align: center; background: #1a365d; color: #d4a853; padding: 20px; border-radius: 8px; margin: 15px 0;">
      <div style="font-size: 48px; font-weight: bold;">${omerDay}</div>
      <div style="font-size: 14px; margin-top: 5px;">יום לעומר</div>
    </div>
    <p style="text-align: center; font-size: 18px; color: #2d3748; line-height: 1.8;">${countText}</p>
    <hr style="border: none; border-top: 1px solid #d4a853; margin: 20px 0;">
    <p style="text-align: center; color: #718096; font-size: 12px;">
      תזכורת אוטומטית מאפליקציית תורה
      <br>
      <a href="https://torhap.lovable.app" style="color: #d4a853;">torhap.lovable.app</a>
    </p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const omerDay = getOmerDay();
    if (!omerDay) {
      return new Response(JSON.stringify({ message: "Not in Omer season", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Get all active reminders that haven't been sent today
    const { data: reminders, error: fetchError } = await supabase
      .from("omer_email_reminders")
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
        // Check if current time matches reminder time in the user's timezone
        const now = new Date();
        const userTime = new Date(now.toLocaleString("en-US", { timeZone: reminder.timezone }));
        const currentHour = userTime.getHours();
        const currentMinute = userTime.getMinutes();

        const [reminderHour, reminderMinute] = reminder.reminder_time.split(":").map(Number);

        // Allow 2-minute window for cron timing
        if (currentHour !== reminderHour || Math.abs(currentMinute - reminderMinute) > 2) {
          continue;
        }

        // Send email using Resend via Lovable gateway (if available) or fallback
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        const resendApiKey = Deno.env.get("RESEND_API_KEY");

        const emailHtml = generateEmailHtml(omerDay);
        const subject = `🕯️ ספירת העומר - יום ${omerDay}`;

        let emailSent = false;

        if (lovableApiKey && resendApiKey) {
          // Use Resend via Lovable gateway
          const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${lovableApiKey}`,
              "X-Connection-Api-Key": resendApiKey,
            },
            body: JSON.stringify({
              from: "ספירת העומר <onboarding@resend.dev>",
              to: [reminder.email],
              subject,
              html: emailHtml,
            }),
          });

          if (response.ok) {
            emailSent = true;
          } else {
            const errText = await response.text();
            console.error(`Resend error for ${reminder.email}:`, errText);
          }
        }

        // Fallback: try SendGrid/Mailgun from user settings (if user is authenticated)
        if (!emailSent) {
          // Try direct Resend if API key exists
          const directResendKey = Deno.env.get("RESEND_API_KEY");
          if (directResendKey) {
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${directResendKey}`,
              },
              body: JSON.stringify({
                from: "ספירת העומר <onboarding@resend.dev>",
                to: [reminder.email],
                subject,
                html: emailHtml,
              }),
            });

            if (response.ok) {
              emailSent = true;
            } else {
              const errText = await response.text();
              console.error(`Direct Resend error for ${reminder.email}:`, errText);
            }
          }
        }

        if (emailSent) {
          // Update status and last_sent_date
          await supabase
            .from("omer_email_reminders")
            .update({ status: "sent", last_sent_date: todayStr })
            .eq("id", reminder.id);
          sent++;
          console.log(`✅ Sent reminder to ${reminder.email} for day ${omerDay}`);
        } else {
          await supabase
            .from("omer_email_reminders")
            .update({ status: "failed" })
            .eq("id", reminder.id);
          failed++;
          console.error(`❌ Failed to send to ${reminder.email}`);
        }
      } catch (innerErr) {
        console.error(`Error processing reminder ${reminder.id}:`, innerErr);
        await supabase
          .from("omer_email_reminders")
          .update({ status: "failed" })
          .eq("id", reminder.id);
        failed++;
      }
    }

    // Reset status back to pending for next day
    await supabase
      .from("omer_email_reminders")
      .update({ status: "pending" })
      .eq("status", "sent")
      .eq("last_sent_date", todayStr);

    return new Response(JSON.stringify({ 
      message: "Processing complete", 
      omerDay,
      sent, 
      failed,
      total: reminders.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-omer-reminders error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
