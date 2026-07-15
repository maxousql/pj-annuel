import type { Metadata } from "next";

import { EditorialContextForm } from "@/components/editorial-context/editorial-context-form";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Contexte éditorial",
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
      <AppPageHeader
        description="Configurez les informations marketing utilisées par l'IA pour cette organisation."
        eyebrow="Contexte éditorial"
        title="Personnaliser les générations."
      />
      <EditorialContextForm organizationSlug={organizationSlug} />
    </>
  );
}
