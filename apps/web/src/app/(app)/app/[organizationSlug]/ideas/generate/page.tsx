import type { Metadata } from "next";

import { IdeasWorkspace } from "@/components/ideas/ideas-workspace";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Générer des idées",
};

type GenerateIdeasPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function GenerateIdeasPage({
  params,
}: GenerateIdeasPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        description="Appuyez-vous sur le contexte éditorial pour produire une liste d'idées structurées."
        eyebrow="Génération d'idées"
        title="Explorer de nouveaux angles."
      />
      <IdeasWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
