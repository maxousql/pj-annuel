import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Gauge,
  Lightbulb,
  PenLine,
  Users,
} from "lucide-react";
import { ApiHealthCard } from "@/components/api-health-card";
import { BrandLockup } from "@/components/brand/logo";
import { getBackendHealth } from "@/lib/api/health";

const modules = [
  {
    icon: Lightbulb,
    title: "Banque d'idées",
    description:
      "Capturez chaque intuition, priorisez-la, puis transformez-la en contenu prêt à publier. Rien ne se perd.",
  },
  {
    icon: PenLine,
    title: "Rédaction assistée",
    description:
      "Des articles, posts et newsletters rédigés par l'IA dans le respect strict de votre contexte éditorial.",
  },
  {
    icon: BookOpen,
    title: "Bibliothèque",
    description:
      "Un fonds éditorial commun : chaque contenu tagué, filtrable et retrouvable par toute l'équipe.",
  },
  {
    icon: CalendarDays,
    title: "Calendrier",
    description:
      "La vue mensuelle du planning de publication, par canal et par statut, partagée avec la rédaction.",
  },
  {
    icon: Users,
    title: "Organisations",
    description:
      "Espaces distincts par marque ou par client : rôles, membres et lignes éditoriales indépendants.",
  },
  {
    icon: Gauge,
    title: "Pilotage",
    description:
      "Production, sujets porteurs, activité de l'équipe : le tableau de bord de votre rédaction.",
  },
] as const;

const tickerItems = [
  "Idées",
  "Rédaction IA",
  "Bibliothèque",
  "Calendrier",
  "Organisations",
  "Pilotage",
];

export default async function HomePage() {
  const health = await getBackendHealth();
  const year = new Date().getFullYear();

  return (
    <div className="landing">
      <main className="page-shell">
        <header className="site-header">
          <Link className="brand" href="/">
            <BrandLockup />
          </Link>
          <nav className="nav-links" aria-label="Navigation publique">
            <Link className="button-ghost" href="/login">
              Connexion
            </Link>
            <Link className="button" href="/register">
              Créer un compte
            </Link>
          </nav>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <div className="hero-rule">
              <span>N° 01 - L'atelier editorial</span>
              <span>Edition {year}</span>
            </div>
            <h1>
              Des idees bien <em>rangees</em>, des contenus bien{" "}
              <em>publies</em>.
            </h1>
            <p className="hero-lede">
              Projet Annuel est l&apos;atelier où votre équipe rédige, organise
              et planifie tout son content marketing. L&apos;IA écrit dans votre
              ton, le calendrier tient la cadence, la bibliothèque garde la
              mémoire.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/register">
                Ouvrir l&apos;atelier
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="button-ghost" href="/login">
                J&apos;ai déjà un compte
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <aside className="hero-aside" aria-label="Sommaire">
            <div className="toc-card">
              <header>
                <h2>Sommaire</h2>
                <span className="kicker">6 modules</span>
              </header>
              <div className="toc-rows">
                {modules.map((module, index) => (
                  <div className="toc-row" key={module.title}>
                    <span className="toc-title">{module.title}</span>
                    <span className="toc-leader" aria-hidden="true" />
                    <span className="toc-num">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="stamp" aria-hidden="true">
              <RotatingStamp />
            </div>
          </aside>
        </section>
      </main>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <span key={`${item}-${index}`}>
              {item}
              <span className="tick-star">✳</span>
            </span>
          ))}
        </div>
      </div>

      <main className="page-shell" style={{ minHeight: "auto" }}>
        <section className="landing-section" aria-labelledby="modules-title">
          <div className="section-heading view-reveal">
            <p className="kicker">Au sommaire</p>
            <h2 id="modules-title">
              Tout le cycle editorial, chapitre par chapitre.
            </h2>
            <p>
              De l&apos;idée brute à la publication planifiée, chaque étape a sa
              place dans l&apos;atelier, et elles travaillent ensemble.
            </p>
          </div>
          <div className="index-rows">
            {modules.map((module, index) => (
              <article className="index-row view-reveal" key={module.title}>
                <span className="index-num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="index-title">
                  <module.icon size={20} aria-hidden="true" />
                  {module.title}
                </h3>
                <p className="index-desc">{module.description}</p>
                <span className="index-mark" aria-hidden="true">
                  ✳
                </span>
              </article>
            ))}
          </div>

          <div className="press-stats view-reveal">
            <div>
              <strong>
                <em>6</em> modules
              </strong>
              <span>Un seul atelier</span>
            </div>
            <div>
              <strong>
                &lt; 30 <em>sec.</em>
              </strong>
              <span>De l&apos;idee au brouillon</span>
            </div>
            <div>
              <strong>
                100 <em>%</em>
              </strong>
              <span>Votre ton, votre contexte</span>
            </div>
          </div>
        </section>

        <section className="cta-panel view-reveal">
          <p className="kicker">Prêt en deux minutes</p>
          <h2>
            Votre prochaine campagne commence par un <em>brouillon</em>.
          </h2>
          <p>
            Créez votre organisation, posez votre ligne éditoriale, et laissez
            l&apos;atelier produire des contenus à votre image.
          </p>
          <Link className="button" href="/register">
            Démarrer gratuitement
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>

        <aside className="colophon-note">
          <div>
            <p className="kicker">Colophon</p>
            <h2>Sous le capot</h2>
            <p className="muted">
              L&apos;atelier repose sur une API dédiée. État du service en temps
              réel, imprimé ci-contre.
            </p>
          </div>
          <ApiHealthCard health={health} />
        </aside>

        <footer className="site-footer">
          <span>Projet Annuel - atelier editorial, {year}</span>
          <nav className="nav-links" aria-label="Navigation pied de page">
            <Link className="button-ghost" href="/login">
              Connexion
            </Link>
            <Link className="button-ghost" href="/register">
              Inscription
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}

function RotatingStamp() {
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" fill="none">
      <defs>
        <path
          id="stamp-circle"
          d="M 75,75 m -56,0 a 56,56 0 1,1 112,0 a 56,56 0 1,1 -112,0"
        />
      </defs>
      <circle cx="75" cy="75" r="72" stroke="var(--ink)" strokeWidth="1.5" />
      <circle cx="75" cy="75" r="40" stroke="var(--ink)" strokeWidth="1.5" />
      <text
        fill="var(--ink)"
        fontFamily="var(--font-mono), monospace"
        fontSize="11.5"
        fontWeight="600"
        letterSpacing="2.6"
      >
        <textPath href="#stamp-circle">
          DE L&apos;IDEE A LA PUBLICATION ✳ PROPULSE PAR L&apos;IA ✳
        </textPath>
      </text>
      <g stroke="var(--rubric)" strokeWidth="5.5" strokeLinecap="round">
        <line x1="75" y1="58" x2="75" y2="92" />
        <line x1="60.3" y1="66.5" x2="89.7" y2="83.5" />
        <line x1="60.3" y1="83.5" x2="89.7" y2="66.5" />
      </g>
    </svg>
  );
}
