import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SEFER_NAMES = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];
const SEFER_ENGLISH = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"];

function toHebrewNumber(n: number): string {
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  if (n <= 0) return String(n);
  if (n < 10) return ones[n];
  if (n === 15) return "ט״ו";
  if (n === 16) return "ט״ז";
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (o === 0) return tens[t];
  return tens[t] + "״" + ones[o];
}

serve(async (req) => {
  const url = new URL(req.url);
  const sefer = parseInt(url.searchParams.get("sefer") || "0", 10);
  const perek = parseInt(url.searchParams.get("perek") || "0", 10);
  const pasuk = parseInt(url.searchParams.get("pasuk") || "0", 10);
  const highlight = url.searchParams.get("highlight") || "";
  const mefaresh = url.searchParams.get("mefaresh") || "";

  // Build the app URL to redirect to
  const appOrigin = Deno.env.get("APP_ORIGIN") || "https://pash.lovable.app";
  const appParams = new URLSearchParams();
  if (sefer) appParams.set("sefer", String(sefer));
  if (perek) appParams.set("perek", String(perek));
  if (pasuk) appParams.set("pasuk", String(pasuk));
  if (highlight) appParams.set("highlight", highlight);
  if (mefaresh) appParams.set("mefaresh", mefaresh);
  const appUrl = `${appOrigin}/?${appParams.toString()}`;

  const seferName = SEFER_NAMES[sefer - 1] || "תורה";
  const seferEn = SEFER_ENGLISH[sefer - 1] || "Torah";
  
  // Build OG content
  let ogTitle = "חמישה חומשי תורה";
  let ogDescription = "ספריית חמישה חומשי תורה עם שאלות ופירושים";

  if (sefer && perek && pasuk) {
    const location = `${seferName} פרק ${toHebrewNumber(perek)} פסוק ${toHebrewNumber(pasuk)}`;
    
    if (mefaresh && highlight) {
      ogTitle = `${mefaresh} — ${location}`;
      ogDescription = `"${highlight.slice(0, 200)}${highlight.length > 200 ? "..." : ""}"`;
    } else if (highlight) {
      ogTitle = location;
      ogDescription = `"${highlight.slice(0, 200)}${highlight.length > 200 ? "..." : ""}"`;
    } else if (mefaresh) {
      ogTitle = `${mefaresh} — ${location}`;
      ogDescription = `פירוש ${mefaresh} על ${location}`;
    } else {
      ogTitle = location;
      ogDescription = `${seferName} פרק ${toHebrewNumber(perek)} פסוק ${toHebrewNumber(pasuk)} — חמישה חומשי תורה`;
    }
  }

  // Generate a simple OG image via text overlay (using a solid color card)
  const ogImageUrl = `${url.origin}/functions/v1/og-image?title=${encodeURIComponent(ogTitle)}&desc=${encodeURIComponent(ogDescription.slice(0, 100))}`;

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${escapeHtml(appUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="he_IL" />
  <meta property="og:site_name" content="חמישה חומשי תורה" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
  <title>${escapeHtml(ogTitle)}</title>
  <meta http-equiv="refresh" content="0;url=${escapeHtml(appUrl)}" />
</head>
<body>
  <p>מעביר אותך...</p>
  <script>window.location.replace(${JSON.stringify(appUrl)});</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
