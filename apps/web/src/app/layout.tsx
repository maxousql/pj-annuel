import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppToaster } from "@/components/ui/app-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Content AI",
  title: {
    default: "Content AI - Studio éditorial assisté par IA",
    template: "%s | Content AI",
  },
  description:
    "Centralisez vos idées, votre rédaction assistée, votre veille et votre calendrier éditorial avec Content AI.",
  keywords: [
    "content marketing",
    "rédaction IA",
    "calendrier éditorial",
    "gestion de contenu",
    "Notion",
  ],
  openGraph: {
    description:
      "Un espace partagé pour produire, organiser et planifier des contenus cohérents avec votre marque.",
    locale: "fr_FR",
    siteName: "Content AI",
    title: "Content AI - Studio éditorial assisté par IA",
    type: "website",
  },
  robots: {
    follow: true,
    index: true,
  },
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
