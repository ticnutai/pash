import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, subject, body, html } = await req.json();
    if (!to || !subject || (!body && !html)) {
      return new Response(JSON.stringify({ error: "Missing 'to', 'subject', or 'body/html'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's email API keys from user_settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select("api_keys")
      .eq("user_id", user.id)
      .maybeSingle();

    const apiKeys = (settings?.api_keys as Record<string, string>) ?? {};

    // Try SendGrid first, then Mailgun
    const sendgridKey = apiKeys.api_sendgrid_key;
    const sendgridFrom = apiKeys.api_sendgrid_from;
    const mailgunKey = apiKeys.api_mailgun_key;
    const mailgunDomain = apiKeys.api_mailgun_domain;

    if (sendgridKey && sendgridFrom) {
      // Send via SendGrid
      const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: sendgridFrom },
          subject,
          content: [
            html
              ? { type: "text/html", value: html }
              : { type: "text/plain", value: body },
          ],
        }),
      });

      if (!sgResponse.ok) {
        const errText = await sgResponse.text();
        console.error("SendGrid error:", errText);
        return new Response(JSON.stringify({ error: `SendGrid error (${sgResponse.status}): ${errText}` }), {
          status: sgResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, provider: "sendgrid" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mailgunKey && mailgunDomain) {
      // Send via Mailgun
      const formData = new URLSearchParams();
      formData.append("from", `Torah App <noreply@${mailgunDomain}>`);
      formData.append("to", to);
      formData.append("subject", subject);
      if (html) {
        formData.append("html", html);
      } else {
        formData.append("text", body);
      }

      const mgResponse = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${mailgunKey}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const mgData = await mgResponse.json();
      if (!mgResponse.ok) {
        console.error("Mailgun error:", mgData);
        return new Response(JSON.stringify({ error: `Mailgun error: ${mgData.message ?? "Unknown"}` }), {
          status: mgResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, provider: "mailgun" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "No email provider configured. Go to Settings → API to add SendGrid or Mailgun keys." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
