import type { Metadata } from "next";

import { CurationWorkspace } from "@/components/curation/curation-workspace";

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
      <section className="app-title">
        <p className="eyebrow">V2</p>
        <h1>Veille et curation.</h1>
        <p>
          Collectez des URLs, importez des flux RSS, resumez les sources et
          transformez-les en brouillons.
        </p>
      </section>
      <CurationWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
