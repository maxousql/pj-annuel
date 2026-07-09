"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application route failed", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <main className="page-shell grid min-h-screen place-items-center">
      <Card className="max-w-xl">
        <CardHeader>
          <AlertTriangle className="size-8 text-[color:var(--rubric)]" />
          <CardTitle>Cette page n'a pas pu etre affichee.</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-[color:var(--text-muted)]">
            L'incident a ete isole. Vous pouvez relancer la page sans perdre le
            reste de votre espace.
          </p>
          <Button type="button" onClick={reset}>
            <RefreshCw className="size-4" /> Reessayer
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
