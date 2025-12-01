import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SearchCheck } from "lucide-react";
import { SearchDialog } from "@/components/SearchDialog";

export function GlobalSearchTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-white hover:text-white hover:bg-white/10 flex-row-reverse"
      >
        <span>חיפוש</span>
        <SearchCheck className="h-4 w-4" />
      </Button>

      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
