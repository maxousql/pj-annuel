import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

type ProtectedAppLayoutProps = {
  children: ReactNode;
};

export default function ProtectedAppLayout({
  children,
}: ProtectedAppLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
