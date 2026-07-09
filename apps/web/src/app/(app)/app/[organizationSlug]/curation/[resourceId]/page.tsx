import type { Metadata } from "next";

import { CurationResourceDetail } from "@/components/curation/curation-resource-detail";

type Props = {
  params: Promise<{ organizationSlug: string; resourceId: string }>;
};

export const metadata: Metadata = { title: "Ressource de veille" };

export default async function CurationResourcePage({ params }: Props) {
  const { organizationSlug, resourceId } = await params;

  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Veille</p>
        <h1>Detail de la ressource.</h1>
        <p>Source, resume, points cles et synchronisation externe.</p>
      </section>
      <CurationResourceDetail
        organizationSlug={organizationSlug}
        resourceId={resourceId}
      />
    </>
  );
}
