import type { Metadata } from "next";

import { ContentGenerator } from "@/components/contents/content-generator";

export const metadata: Metadata = {
  title: "Generer un contenu",
};

type GenerateContentPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
  searchParams: Promise<{
    ideaId?: string;
  }>;
};

export default async function GenerateContentPage({
  params,
  searchParams,
}: GenerateContentPageProps) {
  const { organizationSlug } = await params;
  const { ideaId } = await searchParams;

  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Generation de contenus</p>
        <h1>Creer un brouillon exploitable.</h1>
        <p>
          Selectionnez un format, ajoutez un brief ou partez d'une idee
          sauvegardee.
        </p>
      </section>
      <ContentGenerator
        initialIdeaId={ideaId}
        organizationSlug={organizationSlug}
      />
    </>
  );
}
