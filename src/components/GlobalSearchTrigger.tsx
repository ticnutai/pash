import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SearchCheck } from "lucide-react";
import { SearchDialog } from "@/components/SearchDialog";

export function GlobalSearchTrigger() {
  const [open, setOpen] = useState(false);

  // Listen for Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-white hover:text-white hover:bg-white/10 flex-row-reverse"
        aria-label="חיפוש בתורה (Ctrl+K)"
        title="חיפוש (Ctrl+K)"
      >
        <span>חיפוש</span>
        <SearchCheck className="h-4 w-4" />
      </Button>

      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
