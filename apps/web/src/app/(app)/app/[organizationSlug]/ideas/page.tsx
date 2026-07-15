import type { Metadata } from "next";

import { IdeasWorkspace } from "@/components/ideas/ideas-workspace";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Idées",
};

type IdeasPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function IdeasPage({ params }: IdeasPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        description="Sujets, angles et formats recommandés pour l'organisation active."
        eyebrow="Idées"
        title="Idées de contenu."
      />
      <IdeasWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
