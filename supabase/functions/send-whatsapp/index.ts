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

    const { to, message } = await req.json();
    if (!to || !message) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'message'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's Twilio API keys from user_settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select("api_keys")
      .eq("user_id", user.id)
      .maybeSingle();

    const apiKeys = (settings?.api_keys as Record<string, string>) ?? {};
    const twilioSid = apiKeys.api_twilio_sid;
    const twilioToken = apiKeys.api_twilio_token;
    const twilioWhatsapp = apiKeys.api_twilio_whatsapp_number;

    if (!twilioSid || !twilioToken || !twilioWhatsapp) {
      return new Response(JSON.stringify({ error: "Twilio API keys not configured. Go to Settings → API to add them." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Twilio WhatsApp API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const credentials = btoa(`${twilioSid}:${twilioToken}`);

    const formData = new URLSearchParams();
    formData.append("From", `whatsapp:${twilioWhatsapp}`);
    formData.append("To", `whatsapp:${to}`);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio API error:", twilioData);
      return new Response(JSON.stringify({ error: `Twilio error: ${twilioData.message ?? "Unknown"}` }), {
        status: twilioResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, sid: twilioData.sid }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-whatsapp error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
