"use client";

import type { InvitationPreviewPayload } from "@content-ai/shared";
import { Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandLockup } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  acceptInvitation,
  fetchInvitationPreview,
} from "@/lib/invitations/client";

type Props = { token: string };

export function InvitationAcceptance({ token }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<InvitationPreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchInvitationPreview(token).then((result) => {
      if (!active) return;
      if (result.error) setError(result.error.message);
      else setPreview(result.data);
    });

    return () => {
      active = false;
    };
  }, [token]);

  async function handleAccept() {
    setBusy(true);
    const result = await acceptInvitation(token);
    setBusy(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    router.push(`/app/${result.data.organizationSlug}/dashboard`);
    router.refresh();
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="brand" href="/">
          <BrandLockup />
        </Link>
      </header>
      <section className="mx-auto mt-16 max-w-md">
        {!preview && !error ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-[color:var(--border-strong)] bg-[color:var(--paper-card)] px-8 py-12 text-center">
            <Loader2 className="size-6 animate-spin text-[color:var(--rubric)]" />
            <p className="text-[15px] font-medium">Vérification de l'invitation...</p>
          </div>
        ) : null}
        {preview ? (
          <div className="rounded-2xl border-2 border-[color:var(--border-strong)] bg-[color:var(--paper-card)] px-8 py-12">
            <div className="mb-8 text-center">
              <Users
                className="mx-auto mb-4 size-10 text-[color:var(--rubric)]"
                aria-hidden="true"
              />
              <p className="eyebrow mb-2">Invitation d'équipe</p>
              <h1 className="mb-3 text-2xl font-bold">
                Rejoindre {preview.organizationName}
              </h1>
              <div className="space-y-1">
                <p className="text-[13px] font-medium text-[color:var(--text-muted)]">
                  {preview.email}
                </p>
                <p className="inline-block rounded-lg bg-[color:var(--rubric-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--rubric)]">
                  {preview.role === "ADMIN"
                    ? "Administrateur"
                    : preview.role === "EDITOR"
                      ? "Éditeur"
                      : "Lecteur"}
                </p>
              </div>
            </div>
            {preview.status === "PENDING" ? (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  type="button"
                  onClick={handleAccept}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Accepter l'invitation
                </Button>
                <Link
                  className="block rounded-lg border-2 border-[color:var(--border-strong)] bg-transparent py-2.5 text-center text-sm font-semibold text-[color:var(--ink)] transition-colors hover:bg-[color:var(--surface-muted)]"
                  href={`/register?next=${encodeURIComponent(`/invite/${token}`)}`}
                >
                  Créer un compte
                </Link>
                <Link
                  className="block rounded-lg border border-[color:var(--border)] bg-transparent py-2.5 text-center text-sm font-medium text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-muted)]"
                  href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                >
                  Se connecter avec un autre compte
                </Link>
              </div>
            ) : (
              <div className="rounded-lg bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-800">
                  Cette invitation est {preview.status.toLowerCase()}.
                </p>
              </div>
            )}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg bg-red-50 px-6 py-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
