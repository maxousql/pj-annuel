import type { Metadata } from "next";

import { CurationResourceDetail } from "@/components/curation/curation-resource-detail";
import { AppPageHeader } from "@/components/shell/app-page-header";

type Props = {
  params: Promise<{ organizationSlug: string; resourceId: string }>;
};

export const metadata: Metadata = { title: "Ressource de veille" };

export default async function CurationResourcePage({ params }: Props) {
  const { organizationSlug, resourceId } = await params;

  return (
    <>
      <AppPageHeader
        description="Source, résumé, points clés et synchronisation externe."
        eyebrow="Veille"
        title="Détail de la ressource."
      />
      <CurationResourceDetail
        organizationSlug={organizationSlug}
        resourceId={resourceId}
      />
    </>
  );
}
