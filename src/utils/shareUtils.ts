import { toast } from "sonner";
import { toHebrewNumber } from "@/utils/hebrewNumbers";

const SEFER_NAMES = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];

/** Short app link for sharing */
function buildAppUrl(params: { seferId: number; perek: number; pasuk: number; highlight?: string; mefaresh?: string }): string {
  const origin = window.location.origin;
  const qs = new URLSearchParams({
    sefer: String(params.seferId),
    perek: String(params.perek),
    pasuk: String(params.pasuk),
  });
  if (params.highlight) qs.set("highlight", params.highlight);
  if (params.mefaresh) qs.set("mefaresh", params.mefaresh);
  return `${origin}/?${qs.toString()}`;
}

/**
 * Build OG share URL (for social media previews only).
 */
export function buildOgShareUrl(params: {
  seferId: number;
  perek: number;
  pasuk: number;
  highlight?: string;
  mefaresh?: string;
}): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return buildAppUrl(params);
  const qs = new URLSearchParams({
    sefer: String(params.seferId),
    perek: String(params.perek),
    pasuk: String(params.pasuk),
  });
  if (params.highlight) qs.set("highlight", params.highlight);
  if (params.mefaresh) qs.set("mefaresh", params.mefaresh);
  return `${supabaseUrl}/functions/v1/og-share?${qs.toString()}`;
}

interface ShareCommentaryOptions {
  mefaresh: string;
  text: string;
  seferId: number;
  perek: number;
  pasuk: number;
}

interface SharePasukOptions {
  seferId: number;
  perek: number;
  pasukNum: number;
  pasukText: string;
  content: Array<{
    title: string;
    questions: Array<{
      text: string;
      perushim: Array<{ mefaresh: string; text: string }>;
    }>;
  }>;
}

/**
 * Format commentary text for sharing - concise version with short link.
 */
export function formatShareText({ mefaresh, text, seferId, perek, pasuk }: ShareCommentaryOptions): string {
  const seferName = SEFER_NAMES[seferId - 1] || "";
  const location = `${seferName} פרק ${toHebrewNumber(perek)} פסוק ${toHebrewNumber(pasuk)}`;
  const link = buildAppUrl({ seferId, perek, pasuk });
  return `*${mefaresh}*\n📖 ${location}\n\n${text}\n\n🔗 ${link}`;
}

/**
 * Format pasuk for sharing - SHORT version: just pasuk text + link, no commentaries.
 */
export function formatPasukShareText({ seferId, perek, pasukNum, pasukText }: SharePasukOptions): string {
  const seferName = SEFER_NAMES[seferId - 1] || "";
  const location = `${seferName} פרק ${toHebrewNumber(perek)} פסוק ${toHebrewNumber(pasukNum)}`;
  const link = buildAppUrl({ seferId, perek, pasuk: pasukNum });
  return `📖 *${location}*\n\n${pasukText}\n\n🔗 ${link}`;
}

/**
 * Share pasuk via WhatsApp
 */
export function sharePasukWhatsApp(options: SharePasukOptions) {
  const text = formatPasukShareText(options);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

/**
 * Share pasuk via email
 */
export function sharePasukEmail(options: SharePasukOptions) {
  const seferName = SEFER_NAMES[options.seferId - 1] || "";
  const subject = `${seferName} פרק ${toHebrewNumber(options.perek)} פסוק ${toHebrewNumber(options.pasukNum)}`;
  const body = formatPasukShareText(options);
  const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url);
}

/**
 * Generate a direct link to a specific pasuk and share it.
 * Uses native share (WhatsApp, email, etc.) on mobile, clipboard on desktop.
 */
export function sharePasukLink(seferId: number, perek: number, pasukNum: number, pasukText?: string) {
  const seferName = SEFER_NAMES[seferId - 1] || "";
  const location = `${seferName} פרק ${toHebrewNumber(perek)} פסוק ${toHebrewNumber(pasukNum)}`;
  const url = buildAppUrl({ seferId, perek, pasuk: pasukNum });
  const shareBody = pasukText
    ? `📖 *${location}*\n\n${pasukText}\n\n🔗 ${url}`
    : `📖 *${location}*\n\n🔗 ${url}`;
  
  if (navigator.share) {
    navigator.share({ title: location, text: shareBody, url }).catch(() => {});
  } else {
    // Desktop fallback – open WhatsApp with the text
    window.open(`https://wa.me/?text=${encodeURIComponent(shareBody)}`, '_blank');
  }
}

/**
 * Copy commentary text to clipboard.
 */
export function copyCommentary(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("הפירוש הועתק ללוח");
}

export async function shareCommentary(options: ShareCommentaryOptions) {
  const shareText = formatShareText(options);
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: `${options.mefaresh} - פירוש`,
        text: shareText,
      });
    } catch {
      // User cancelled
    }
  } else {
    navigator.clipboard.writeText(shareText);
    toast.success("הפירוש הועתק לשיתוף");
  }
}
