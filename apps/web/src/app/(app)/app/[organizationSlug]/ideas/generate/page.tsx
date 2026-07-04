import type { Metadata } from "next";

import { IdeasWorkspace } from "@/components/ideas/ideas-workspace";

export const metadata: Metadata = {
  title: "Generer des idees",
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
      <section className="app-title">
        <p className="eyebrow">Generation d'idees</p>
        <h1>Explorer de nouveaux angles.</h1>
        <p>
          Appuyez-vous sur le contexte editorial pour produire une liste d'idees
          structurees.
        </p>
      </section>
      <IdeasWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
