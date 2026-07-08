import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import "./globals.css";
import { AppToaster } from "@/components/ui/app-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Projet Annuel",
    template: "%s | Projet Annuel",
  },
  description:
    "L'atelier editorial : idees, redaction IA et calendrier de publication.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="fr"
      className={cn(
        "font-sans",
        publicSans.variable,
        fraunces.variable,
        plexMono.variable,
      )}
    >
      <body>
        <TooltipProvider>
          {children}
          <AppToaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
