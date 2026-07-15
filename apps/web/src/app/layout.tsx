import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppToaster } from "@/components/ui/app-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Projet Annuel",
    template: "%s | Projet Annuel",
  },
  description:
    "L'atelier editorial : idees, redaction IA et calendrier de publication.",
};

type RootLayoutProps = { children: ReactNode };

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr">
      <body>
        <TooltipProvider>
          {children}
          <AppToaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
