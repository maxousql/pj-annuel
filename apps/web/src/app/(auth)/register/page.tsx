import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { BrandLockup } from "@/components/brand/logo";
import { getInvitationTokenFromUrl } from "@/lib/auth/client";

export const metadata: Metadata = {
  title: "Inscription",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function RegisterPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const nextPath = typeof searchParams.next === "string" ? searchParams.next : null;
  const invitationEmail = typeof searchParams.email === "string" ? searchParams.email : null;

  // Extract token from next path like "/invite/[token]"
  const invitationToken = nextPath?.match(/^\/invite\/(.+)$/)?.[1] ?? null;

  return (
    <main className="page-shell">
      <div className="auth-layout">
        <section className="auth-copy">
          <Link className="brand" href="/">
            <BrandLockup />
          </Link>
          <h1>
            Votre équipe entre à <em>l&apos;atelier</em>.
          </h1>
          <p>
            Lancez un espace partagé pour centraliser la stratégie éditoriale et
            préparer les prochains contenus.
          </p>
        </section>
        <AuthForm
          mode="register"
          invitationToken={invitationToken}
          invitationEmail={invitationEmail}
        />
      </div>
    </main>
  );
}
