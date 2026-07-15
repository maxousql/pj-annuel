import type { Metadata } from "next";

import { NotionIntegrationPanel } from "@/components/integrations/notion-integration-panel";
import { AppPageHeader } from "@/components/shell/app-page-header";

type IntegrationsPageProps = {
  params: Promise<{ organizationSlug: string }>;
};

export const metadata: Metadata = {
  title: "Intégrations",
};

export default async function IntegrationsPage({
  params,
}: IntegrationsPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        description="Connectez les outils utilisés par votre équipe et gardez vos contenus alignés."
        eyebrow="Intégrations"
        title="Connexions externes."
      />
      <NotionIntegrationPanel organizationSlug={organizationSlug} />
    </>
  );
}
