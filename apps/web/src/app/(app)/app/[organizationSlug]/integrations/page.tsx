import type { Metadata } from "next";

import { NotionIntegrationPanel } from "@/components/integrations/notion-integration-panel";

type IntegrationsPageProps = {
  params: Promise<{ organizationSlug: string }>;
};

export const metadata: Metadata = {
  title: "Integrations",
};

export default async function IntegrationsPage({
  params,
}: IntegrationsPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Integrations</p>
        <h1>Connexions externes.</h1>
        <p>
          Connectez les outils utilisés par votre équipe et gardez vos contenus
          alignes.
        </p>
      </section>
      <NotionIntegrationPanel organizationSlug={organizationSlug} />
    </>
  );
}
