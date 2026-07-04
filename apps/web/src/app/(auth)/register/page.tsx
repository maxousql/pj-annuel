import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Inscription",
};

export default function RegisterPage() {
  return (
    <main className="page-shell">
      <div className="auth-layout">
        <section className="auth-copy">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              PA
            </span>
            <span>Projet Annuel</span>
          </Link>
          <h1>Creation de votre compte equipe.</h1>
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
