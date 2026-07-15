import type { Metadata } from "next";

import { CurationWorkspace } from "@/components/curation/curation-workspace";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Curation",
};

type CurationPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function CurationPage({ params }: CurationPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        description="Collectez des URLs, importez des flux RSS, résumez les sources et transformez-les en brouillons."
        eyebrow="Veille éditoriale"
        title="Veille et curation."
      />
      <CurationWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
