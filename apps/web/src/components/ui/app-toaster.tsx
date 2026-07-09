"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      closeButton
      expand
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          actionButton:
            "!bg-[color:var(--rubric)] !text-[color:var(--paper-card)]",
          cancelButton: "!bg-[color:var(--paper-2)] !text-[color:var(--ink)]",
          description: "!text-[color:var(--text-muted)]",
          title: "!font-bold",
          toast:
            "!rounded-2xl !border !border-[color:var(--border-strong)] !bg-[color:var(--paper-card)] !text-[color:var(--ink)] !shadow-[0_18px_44px_rgba(23,19,15,0.16)]",
        },
      }}
    />
  );
}
