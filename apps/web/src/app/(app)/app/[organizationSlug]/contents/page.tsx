import type { Metadata } from "next";
import Link from "next/link";

import { ContentsLibrary } from "@/components/contents/contents-library";

export const metadata: Metadata = {
  title: "Contenus",
};

type ContentsPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function ContentsPage({ params }: ContentsPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Contenus</p>
        <h1>Bibliothèque de contenus.</h1>
        <p>Historique, brouillons et contenus finalisés de l'organisation.</p>
        <div className="app-title-actions">
          <Link
            className="button"
            href={`/app/${organizationSlug}/contents/generate`}
          >
            Générer un contenu
          </Link>
        </div>
      </section>
      <ContentsLibrary organizationSlug={organizationSlug} />
    </>
  );
}
