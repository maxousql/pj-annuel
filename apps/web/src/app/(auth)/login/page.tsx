import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { BrandLockup } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function LoginPage() {
  return (
    <main className="page-shell">
      <div className="auth-layout">
        <section className="auth-copy">
          <Link className="brand" href="/">
            <BrandLockup />
          </Link>
          <h1>
            Reprenez votre <em>plume</em>.
          </h1>
          <p>
            Retrouvez vos contenus, vos idées et votre planning éditorial dans
            un espace organisé par équipe.
          </p>
        </section>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
