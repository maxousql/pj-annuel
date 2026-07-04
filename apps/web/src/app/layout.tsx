import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "Projet Annuel",
    template: "%s | Projet Annuel",
  },
  description: "Socle frontend Next.js pour l'application SaaS.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr" className={cn("dark font-sans")}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
