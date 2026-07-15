import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  CalendarDays,
  Check,
  Gauge,
  Lightbulb,
  Link2,
  PenLine,
  RefreshCw,
  Rss,
  Users,
} from "lucide-react";

import { BrandLockup } from "@/components/brand/logo";

const modules = [
  {
    icon: Lightbulb,
    title: "Banque d'idées",
    description:
      "Capturez chaque intuition, enrichissez son angle et transformez-la en contenu sans perdre le fil.",
  },
  {
    icon: PenLine,
    title: "Rédaction assistée",
    description:
      "Générez articles, publications et emails en respectant votre audience, votre ton et votre positionnement.",
  },
  {
    icon: Rss,
    title: "Veille éditoriale",
    description:
      "Centralisez URLs et flux RSS, résumez les ressources utiles et faites émerger de nouveaux sujets.",
  },
  {
    icon: BookOpen,
    title: "Bibliothèque",
    description:
      "Retrouvez chaque contenu par statut, catégorie ou étiquette, avec son historique et sa source.",
  },
  {
    icon: CalendarDays,
    title: "Calendrier",
    description:
      "Planifiez par canal et par statut, repérez les conflits et partagez une cadence claire avec l'équipe.",
  },
  {
    icon: Link2,
    title: "Synchronisation Notion",
    description:
      "Créez la base adaptée dans Notion, conservez un mapping stable et synchronisez dans les deux sens.",
  },
  {
    icon: BellRing,
    title: "Automatisations",
    description:
      "Recevez les rappels utiles et les recommandations éditoriales au moment où l'équipe en a besoin.",
  },
  {
    icon: Users,
    title: "Équipes et pilotage",
    description:
      "Séparez marques et clients, attribuez les bons rôles et suivez la production depuis le tableau de bord.",
  },
] as const;

const tickerItems = [
  "Idées",
  "Rédaction IA",
  "Veille",
  "Bibliothèque",
  "Calendrier",
  "Notion",
  "Automatisations",
  "Pilotage",
];

const workflowSteps = [
  {
    description:
      "Posez l'audience, les thèmes, le ton et les règles qui guideront chaque génération.",
    title: "Cadrer",
  },
  {
    description:
      "Transformez votre veille, vos notes et vos intuitions en angles éditoriaux exploitables.",
    title: "Inspirer",
  },
  {
    description:
      "Passez de l'idée au brouillon avec une IA qui travaille dans le contexte de votre marque.",
    title: "Produire",
  },
  {
    description:
      "Validez, planifiez et synchronisez les contenus avec les outils et les personnes concernés.",
    title: "Orchestrer",
  },
] as const;

const faqs = [
  {
    answer:
      "Content AI s'adresse aux équipes marketing, agences et indépendants qui veulent réunir stratégie, production et planning.",
    question: "À qui s'adresse Content AI ?",
  },
  {
    answer:
      "Non. L'intégration Notion est optionnelle. Tout le cycle éditorial peut être géré directement dans Content AI.",
    question: "Faut-il utiliser Notion ?",
  },
  {
    answer:
      "Chaque organisation configure son contexte éditorial et sa voix de marque, utilisés ensuite pour les générations.",
    question: "Comment l'IA respecte-t-elle notre ton ?",
  },
  {
    answer:
      "Oui. Les espaces sont séparés par organisation, avec des droits administrateur, éditeur et lecteur.",
    question: "Peut-on gérer plusieurs marques ou clients ?",
  },
] as const;

export default function HomePage() {
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
              <span>N° 01 - Le studio éditorial</span>
              <span>Édition {year}</span>
            </div>
            <h1>
              Des idées bien <em>rangées</em>, des contenus bien{" "}
              <em>publiés</em>.
            </h1>
            <p className="hero-lede">
              Content AI est le studio où votre équipe imagine, rédige, organise
              et planifie tout son content marketing. L&apos;IA garde votre ton,
              la bibliothèque conserve la mémoire et le calendrier tient la
              cadence.
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
                <span className="kicker">{modules.length} modules</span>
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
              Tout le cycle éditorial, chapitre par chapitre.
            </h2>
            <p>
              De l&apos;idée brute à la publication planifiée, chaque étape a sa
              place dans Content AI et nourrit la suivante.
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

          <div className="press-stats editorial-pillars view-reveal">
            <div>
              <strong>
                Votre <em>contexte</em>
              </strong>
              <span>Audience, ton, thèmes et positionnement</span>
            </div>
            <div>
              <strong>
                Votre <em>mémoire</em>
              </strong>
              <span>Idées, contenus, sources et historique</span>
            </div>
            <div>
              <strong>
                Votre <em>équipe</em>
              </strong>
              <span>Rôles, validations et planning partagé</span>
            </div>
          </div>
        </section>

        <section
          className="landing-section workflow-editorial"
          aria-labelledby="workflow-title"
        >
          <div className="section-heading view-reveal">
            <p className="kicker">Le fil de production</p>
            <h2 id="workflow-title">
              Une méthode simple, du cap à la cadence.
            </h2>
            <p>
              Content AI garde les décisions importantes à portée de main pour
              que chaque contenu avance sans rupture de contexte.
            </p>
          </div>
          <ol className="workflow-chapters">
            {workflowSteps.map((step, index) => (
              <li className="view-reveal" key={step.title}>
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="notion-highlight view-reveal"
          aria-labelledby="notion-title"
        >
          <div className="notion-highlight-copy">
            <p className="kicker">Connexion Notion</p>
            <h2 id="notion-title">Vos contenus circulent, le mapping reste.</h2>
            <p>
              Autorisez l&apos;accès à votre espace, puis laissez Content AI
              créer la base et les propriétés adaptées. La synchronisation
              bidirectionnelle prend ensuite le relais.
            </p>
            <ul>
              <li>
                <Check size={16} aria-hidden="true" />
                Base prête sans configuration manuelle
              </li>
              <li>
                <Check size={16} aria-hidden="true" />
                Propriétés identifiées de façon stable
              </li>
              <li>
                <Check size={16} aria-hidden="true" />
                Détection et réparation des mappings
              </li>
            </ul>
          </div>
          <div
            className="notion-sync-sheet"
            aria-label="Synchronisation Notion"
          >
            <div>
              <BookOpen size={25} aria-hidden="true" />
              <strong>Content AI</strong>
              <span>Idées, contenus et statuts</span>
            </div>
            <RefreshCw size={24} aria-hidden="true" />
            <div>
              <Link2 size={25} aria-hidden="true" />
              <strong>Notion</strong>
              <span>Base structurée et partagée</span>
            </div>
          </div>
        </section>

        <section
          className="landing-section landing-faq"
          aria-labelledby="faq-title"
        >
          <div className="section-heading view-reveal">
            <p className="kicker">Questions courantes</p>
            <h2 id="faq-title">L'essentiel avant d'ouvrir l'atelier.</h2>
          </div>
          <div className="faq-editorial-list view-reveal">
            {faqs.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="cta-panel view-reveal">
          <p className="kicker">Votre studio est prêt</p>
          <h2>
            Votre prochaine campagne commence par un <em>brouillon</em>.
          </h2>
          <p>
            Créez votre organisation, posez votre ligne éditoriale et laissez
            Content AI produire des contenus cohérents avec votre marque.
          </p>
          <Link className="button" href="/register">
            Créer un compte
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>

        <footer className="site-footer">
          <span>Content AI - studio éditorial, {year}</span>
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
          DE L&apos;IDÉE À LA PUBLICATION ✳ CONTENT AI ✳
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
