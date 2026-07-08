import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { BrandLockup } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Inscription",
};

export default function RegisterPage() {
  return (
    <main className="page-shell">
      <div className="auth-layout">
        <section className="auth-copy">
          <Link className="brand" href="/">
            <BrandLockup />
          </Link>
          <h1>
            Votre equipe entre a <em>l&apos;atelier</em>.
          </h1>
          <p>
            Lancez un espace partage pour centraliser la strategie editoriale et
            preparer les prochains contenus.
          </p>
        </section>
        <AuthForm mode="register" />
      </div>
    </main>
  );
}
