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
      <section className="auth-panel mx-auto mt-12 max-w-2xl">
        <Users
          className="size-8 text-[color:var(--rubric)]"
          aria-hidden="true"
        />
        {!preview && !error ? (
          <div className="flex items-center gap-2">
            <Loader2 className="size-5 animate-spin" /> Verification de
            l'invitation...
          </div>
        ) : null}
        {preview ? (
          <>
            <div>
              <p className="eyebrow">Invitation d'équipe</p>
              <h1>Rejoindre {preview.organizationName}</h1>
              <p>
                Invitation pour {preview.email}, avec le role{" "}
                {preview.role.toLowerCase()}.
              </p>
            </div>
            {preview.status === "PENDING" ? (
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={handleAccept} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Accepter l'invitation
                </Button>
                <Link
                  className="button-secondary"
                  href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                >
                  Se connecter avec le bon compte
                </Link>
                <Link
                  className="button-secondary"
                  href={`/register?next=${encodeURIComponent(`/invite/${token}`)}`}
                >
                  Créer le compte invité
                </Link>
              </div>
            ) : (
              <p className="form-error">
                Cette invitation est {preview.status.toLowerCase()}.
              </p>
            )}
          </>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </main>
  );
}
