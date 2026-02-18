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
