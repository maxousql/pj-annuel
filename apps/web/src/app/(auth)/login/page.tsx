import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function LoginPage() {
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
          <h1>Connexion a votre espace de travail.</h1>
          <p>
            Retrouvez vos contenus, vos idees et votre planning editorial dans
            un espace organise par equipe.
          </p>
        </section>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
