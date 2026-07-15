import type { Metadata } from "next";

import { OrganizationSettingsPanel } from "@/components/organizations/organization-settings-panel";
import { AppPageHeader } from "@/components/shell/app-page-header";

type OrganizationSettingsPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export const metadata: Metadata = {
  title: "Paramètres organisation",
};

export default async function OrganizationSettingsPage({
  params,
}: OrganizationSettingsPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        description="Configuration et accès de l'espace actif."
        eyebrow="Paramètres"
        title="Organisation."
      />
      <OrganizationSettingsPanel organizationSlug={organizationSlug} />
    </>
  );
}
