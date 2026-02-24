import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Generates a simple OG image as SVG (rendered as PNG-like by social platforms).
 * Most platforms accept SVG for OG images, but we wrap it properly.
 */
serve(async (req) => {
  const url = new URL(req.url);
  const title = url.searchParams.get("title") || "חמישה חומשי תורה";
  const desc = url.searchParams.get("desc") || "";

  // Generate SVG-based OG card with rich design
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f1f33;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#1a3350;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d2844;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#b8922d" />
      <stop offset="50%" style="stop-color:#e8d48b" />
      <stop offset="100%" style="stop-color:#b8922d" />
    </linearGradient>
    <linearGradient id="textGold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f5e6b8" />
      <stop offset="100%" style="stop-color:#c8a96e" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" style="stop-color:#2a4a6e;stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:#0f1f33;stop-opacity:0" />
    </radialGradient>
    <pattern id="stars" width="80" height="80" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="15" r="0.8" fill="#c8a96e" opacity="0.15"/>
      <circle cx="50" cy="5" r="0.5" fill="#c8a96e" opacity="0.1"/>
      <circle cx="70" cy="45" r="0.6" fill="#c8a96e" opacity="0.12"/>
      <circle cx="30" cy="65" r="0.7" fill="#c8a96e" opacity="0.08"/>
      <circle cx="60" cy="75" r="0.4" fill="#c8a96e" opacity="0.1"/>
    </pattern>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#stars)" />
  <rect width="1200" height="630" fill="url(#glow)" />
  
  <!-- Outer ornamental border -->
  <rect x="20" y="20" width="1160" height="590" fill="none" stroke="url(#gold)" stroke-width="2" rx="18" opacity="0.7" />
  <rect x="32" y="32" width="1136" height="566" fill="none" stroke="#c8a96e" stroke-width="0.5" rx="14" opacity="0.3" />
  
  <!-- Corner ornaments -->
  <g opacity="0.5" fill="#c8a96e">
    <path d="M50,50 Q50,80 80,80" stroke="#c8a96e" stroke-width="1.5" fill="none"/>
    <path d="M50,50 Q80,50 80,80" stroke="#c8a96e" stroke-width="1.5" fill="none"/>
    <circle cx="50" cy="50" r="3"/>
    
    <path d="M1150,50 Q1150,80 1120,80" stroke="#c8a96e" stroke-width="1.5" fill="none"/>
    <path d="M1150,50 Q1120,50 1120,80" stroke="#c8a96e" stroke-width="1.5" fill="none"/>
    <circle cx="1150" cy="50" r="3"/>
    
    <path d="M50,580 Q50,550 80,550" stroke="#c8a96e" stroke-width="1.5" fill="none"/>
    <path d="M50,580 Q80,580 80,550" stroke="#c8a96e" stroke-width="1.5" fill="none"/>
    <circle cx="50" cy="580" r="3"/>
    
    <path d="M1150,580 Q1150,550 1120,550" stroke="#c8a96e" stroke-width="1.5" fill="none"/>
    <path d="M1150,580 Q1120,580 1120,550" stroke="#c8a96e" stroke-width="1.5" fill="none"/>
    <circle cx="1150" cy="580" r="3"/>
  </g>

  <!-- Logo area: stylized Torah scroll icon -->
  <g transform="translate(600, 90)" opacity="0.9">
    <rect x="-18" y="-28" width="6" height="56" rx="3" fill="url(#textGold)" opacity="0.8"/>
    <rect x="12" y="-28" width="6" height="56" rx="3" fill="url(#textGold)" opacity="0.8"/>
    <rect x="-14" y="-18" width="28" height="36" rx="2" fill="none" stroke="#c8a96e" stroke-width="1" opacity="0.6"/>
    <line x1="-8" y1="-8" x2="8" y2="-8" stroke="#c8a96e" stroke-width="0.8" opacity="0.5"/>
    <line x1="-8" y1="-1" x2="8" y2="-1" stroke="#c8a96e" stroke-width="0.8" opacity="0.5"/>
    <line x1="-8" y1="6" x2="8" y2="6" stroke="#c8a96e" stroke-width="0.8" opacity="0.5"/>
    <line x1="-8" y1="13" x2="8" y2="13" stroke="#c8a96e" stroke-width="0.8" opacity="0.5"/>
  </g>
  
  <!-- App name -->
  <text x="600" y="155" text-anchor="middle" fill="url(#textGold)" font-family="serif" font-size="26" letter-spacing="2" direction="rtl">חמישה חומשי תורה</text>
  
  <!-- Decorative divider -->
  <g opacity="0.5">
    <line x1="300" y1="178" x2="560" y2="178" stroke="url(#gold)" stroke-width="0.8"/>
    <circle cx="600" cy="178" r="3" fill="#c8a96e"/>
    <line x1="640" y1="178" x2="900" y2="178" stroke="url(#gold)" stroke-width="0.8"/>
  </g>
  
  <!-- Title -->
  <text x="600" y="280" text-anchor="middle" fill="#f0e6d2" font-family="serif" font-size="52" font-weight="bold" direction="rtl" letter-spacing="1">
    ${escapeSvg(title.slice(0, 50))}
  </text>

  <!-- Description / quote -->
  ${desc ? `
  <rect x="200" y="320" width="800" height="70" rx="8" fill="#c8a96e" opacity="0.06"/>
  <text x="600" y="365" text-anchor="middle" fill="#d4c5a9" font-family="serif" font-size="28" direction="rtl" opacity="0.9" font-style="italic">
    ״${escapeSvg(desc.slice(0, 80))}${desc.length > 80 ? "..." : ""}״
  </text>` : ""}
  
  <!-- Bottom decorative divider -->
  <g opacity="0.4">
    <line x1="300" y1="490" x2="560" y2="490" stroke="url(#gold)" stroke-width="0.8"/>
    <circle cx="600" cy="490" r="3" fill="#c8a96e"/>
    <line x1="640" y1="490" x2="900" y2="490" stroke="url(#gold)" stroke-width="0.8"/>
  </g>
  
  <!-- Footer with subtle background -->
  <rect x="440" y="520" width="320" height="36" rx="18" fill="#c8a96e" opacity="0.08"/>
  <text x="600" y="544" text-anchor="middle" fill="#c8a96e" font-family="serif" font-size="20" opacity="0.7" letter-spacing="1">pash.lovable.app</text>
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
