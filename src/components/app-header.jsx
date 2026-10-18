import { Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HelpDialog } from "./help-dialog";
export function AppHeader({ dataMode }) {
  return (
    <header className="flex h-[76px] shrink-0 items-center justify-between gap-3 border-b bg-card px-5 lg:px-8">
      <a
        href="#"
        className="flex items-center gap-2.5 text-primary"
        aria-label="Atlas, início"
      >
        <Layers3 className="size-8 -rotate-12" />
        <span className="font-display text-3xl font-extrabold tracking-[-.08em]">
          atlas
        </span>
        <span className="ml-3 hidden border-l pl-5 text-[9px] font-semibold tracking-[.18em] text-muted-foreground sm:block">
          COMPANY INTELLIGENCE
        </span>
      </a>
      <div className="flex items-center gap-3 sm:gap-6">
        <Badge variant="secondary" className="gap-2 text-[10px] font-normal">
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-600" />
          {dataMode}
        </Badge>
        <HelpDialog />
      </div>
    </header>
  );
}
