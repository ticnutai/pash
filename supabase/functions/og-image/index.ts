import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Generates a simple OG image as SVG (rendered as PNG-like by social platforms).
 * Most platforms accept SVG for OG images, but we wrap it properly.
 */
serve(async (req) => {
  const url = new URL(req.url);
  const title = url.searchParams.get("title") || "חמישה חומשי תורה";
  const desc = url.searchParams.get("desc") || "";

  // Generate SVG-based OG card
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a5f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2d5a87;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" rx="0" />
  
  <!-- Decorative border -->
  <rect x="30" y="30" width="1140" height="570" fill="none" stroke="#c8a96e" stroke-width="2" rx="16" opacity="0.6" />
  <rect x="40" y="40" width="1120" height="550" fill="none" stroke="#c8a96e" stroke-width="1" rx="12" opacity="0.3" />
  
  <!-- App name -->
  <text x="600" y="120" text-anchor="middle" fill="#c8a96e" font-family="serif" font-size="28" opacity="0.8" direction="rtl">חמישה חומשי תורה</text>
  
  <!-- Decorative line -->
  <line x1="350" y1="150" x2="850" y2="150" stroke="#c8a96e" stroke-width="1" opacity="0.4" />
  
  <!-- Title -->
  <text x="600" y="280" text-anchor="middle" fill="#f0e6d2" font-family="serif" font-size="52" font-weight="bold" direction="rtl">
    ${escapeSvg(title.slice(0, 50))}
  </text>

  <!-- Description / quote -->
  ${desc ? `<text x="600" y="380" text-anchor="middle" fill="#d4c5a9" font-family="serif" font-size="30" direction="rtl" opacity="0.9">
    ${escapeSvg(desc.slice(0, 80))}${desc.length > 80 ? "..." : ""}
  </text>` : ""}
  
  <!-- Bottom decorative line -->
  <line x1="350" y1="500" x2="850" y2="500" stroke="#c8a96e" stroke-width="1" opacity="0.4" />
  
  <!-- Footer -->
  <text x="600" y="550" text-anchor="middle" fill="#c8a96e" font-family="serif" font-size="22" opacity="0.6">pash.lovable.app</text>
  
  <!-- Book icon decorative -->
  <text x="600" y="450" text-anchor="middle" fill="#c8a96e" font-size="40" opacity="0.3">📖</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400",
    },
  });
});

function escapeSvg(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
