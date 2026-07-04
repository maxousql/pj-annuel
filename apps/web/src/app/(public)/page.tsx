import Link from "next/link";
import { ApiHealthCard } from "@/components/api-health-card";
import { getBackendHealth } from "@/lib/api/health";

export default async function HomePage() {
  const health = await getBackendHealth();

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            PA
          </span>
          <span>Projet Annuel</span>
        </Link>
        <nav className="nav-links" aria-label="Navigation publique">
          <Link className="button-ghost" href="/login">
            Connexion
          </Link>
          <Link className="button" href="/register">
            Creer un compte
          </Link>
        </nav>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Production editoriale</p>
          <h1>Pilotez vos contenus depuis un espace unique.</h1>
          <p>
            Organisez les idees, les contenus et les calendriers par
            organisation avec une interface claire et responsive.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/register">
              Creer un espace
            </Link>
            <Link className="button-secondary" href="/login">
              Se connecter
            </Link>
          </div>
        </div>
        <ApiHealthCard health={health} />
      </section>
    </main>
  );
}
