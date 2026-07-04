import type { Metadata } from "next";

import { EditorialContextForm } from "@/components/editorial-context/editorial-context-form";

export const metadata: Metadata = {
  title: "Contexte editorial",
};

type EditorialContextPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function EditorialContextPage({
  params,
}: EditorialContextPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Contexte editorial</p>
        <h1>Personnaliser les generations.</h1>
        <p>
          Configurez les informations marketing utilisees par l'IA pour cette
          organisation.
        </p>
      </section>
      <EditorialContextForm organizationSlug={organizationSlug} />
    </>
  );
}
