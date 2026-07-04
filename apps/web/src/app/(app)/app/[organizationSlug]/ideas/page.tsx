import type { Metadata } from "next";

import { IdeasWorkspace } from "@/components/ideas/ideas-workspace";

export const metadata: Metadata = {
  title: "Idees",
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
      <section className="app-title">
        <p className="eyebrow">Idees</p>
        <h1>Idees de contenu.</h1>
        <p>Sujets, angles et formats recommandes pour l'organisation active.</p>
      </section>
      <IdeasWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
