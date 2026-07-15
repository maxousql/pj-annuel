import type { Metadata } from "next";

import { ContentGenerator } from "@/components/contents/content-generator";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Créer un contenu",
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
      <AppPageHeader
        description="Sélectionnez un format, ajoutez un brief ou partez d'une idée sauvegardée."
        eyebrow="Création de contenu"
        title="Créer un brouillon exploitable."
      />
      <ContentGenerator
        initialIdeaId={ideaId}
        organizationSlug={organizationSlug}
      />
    </>
  );
}
