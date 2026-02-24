import { toast } from "sonner";
import { toHebrewNumber } from "@/utils/hebrewNumbers";

const SEFER_NAMES = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];

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
 * Format commentary text for WhatsApp/social sharing with bold markers and proper line breaks.
 */
export function formatShareText({ mefaresh, text, seferId, perek, pasuk }: ShareCommentaryOptions): string {
  const seferName = SEFER_NAMES[seferId - 1] || "";
  const location = `${seferName} פרק ${toHebrewNumber(perek)} פסוק ${toHebrewNumber(pasuk)}`;
  
  // WhatsApp uses *bold* formatting
  return `*${mefaresh}*\n📖 ${location}\n\n${text}\n\n---\nמתוך אפליקציית חמישה חומשי תורה`;
}

/**
 * Format full pasuk with all commentaries for sharing.
 */
export function formatPasukShareText({ seferId, perek, pasukNum, pasukText, content }: SharePasukOptions): string {
  const seferName = SEFER_NAMES[seferId - 1] || "";
  const location = `${seferName} פרק ${toHebrewNumber(perek)} פסוק ${toHebrewNumber(pasukNum)}`;
  
  let text = `📖 *${location}*\n\n`;
  text += `${pasukText}\n`;

  for (const item of content) {
    if (item.title) {
      text += `\n*${item.title}*\n`;
    }
    for (const q of item.questions) {
      text += `\n❓ ${q.text}\n`;
      for (const p of q.perushim) {
        text += `\n💬 *${p.mefaresh}:* ${p.text}\n`;
      }
    }
  }

  text += `\n---\nמתוך אפליקציית חמישה חומשי תורה`;
  return text;
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
 * Copy commentary text to clipboard.
 */
export function copyCommentary(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("הפירוש הועתק ללוח");
}

/**
 * Share commentary using native share API or fallback to clipboard.
 */
export async function shareCommentary(options: ShareCommentaryOptions) {
  const shareText = formatShareText(options);
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: `${options.mefaresh} - פירוש`,
        text: shareText,
      });
    } catch {
      // User cancelled sharing - that's fine
    }
  } else {
    navigator.clipboard.writeText(shareText);
    toast.success("הפירוש הועתק לשיתוף");
  }
}
