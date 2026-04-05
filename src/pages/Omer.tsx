import { Sparkles } from "lucide-react";
import { OmerBoardDialog } from "@/components/OmerBoardDialog";

export default function OmerPage() {
  return (
    <div
      className="min-h-[100dvh] bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-950/20 dark:to-background flex flex-col items-center"
      dir="rtl"
    >
      <header className="w-full flex items-center justify-center gap-2 py-4 text-amber-700 dark:text-amber-300">
        <Sparkles className="h-5 w-5" />
        <h1 className="text-xl font-bold">ספירת העומר</h1>
      </header>
      <div className="flex-1 flex items-start justify-center w-full">
        <OmerBoardDialog defaultOpen />
      </div>
    </div>
  );
}
