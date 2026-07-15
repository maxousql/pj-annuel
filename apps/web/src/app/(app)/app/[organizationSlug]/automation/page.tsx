import type { Metadata } from "next";

import { AutomationsWorkspace } from "@/components/automations/automations-workspace";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Automatisation",
};

type AutomationPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function AutomationPage({ params }: AutomationPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        description="Activez les rappels, générez des recommandations et suivez les notifications internes."
        eyebrow="Automatisations"
        title="Automatisation marketing."
      />
      <AutomationsWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
