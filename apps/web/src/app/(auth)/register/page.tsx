import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { BrandLockup } from "@/components/brand/logo";
import { getInvitationTokenFromUrl } from "@/lib/auth/client";

export const metadata: Metadata = {
  title: "Inscription",
};

export default function RegisterPage() {
  const invitationToken = getInvitationTokenFromUrl();

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
        <AuthForm mode="register" invitationToken={invitationToken} />
      </div>
    </main>
  );
}
