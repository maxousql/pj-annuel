import type { ComponentProps } from "react";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function WorkspaceTabsList({
  className,
  ...props
}: ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn(
        "h-auto min-h-13 w-full flex-wrap justify-start gap-1.5 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-1.5 shadow-[0_2px_10px_rgba(23,19,15,0.04)]",
        className,
      )}
      {...props}
    />
  );
}

function WorkspaceTabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      className={cn(
        "h-auto min-h-10 flex-[1_1_auto] rounded-xl px-3.5 py-2 text-[color:var(--text-muted)] transition-[color,background-color,box-shadow,transform] duration-200 hover:bg-[color:var(--paper-card)]/65 hover:text-[color:var(--ink)] active:scale-[0.98] data-active:bg-[color:var(--paper-card)] data-active:text-[color:var(--ink)] data-active:shadow-[0_2px_8px_rgba(23,19,15,0.08)] sm:flex-none",
        className,
      )}
      {...props}
    />
  );
}

export { WorkspaceTabsList, WorkspaceTabsTrigger };
