import type { Metadata } from "next";

import { OrganizationSettingsPanel } from "@/components/organizations/organization-settings-panel";

type OrganizationSettingsPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export const metadata: Metadata = {
  title: "Parametres organisation",
};

export default async function OrganizationSettingsPage({
  params,
}: OrganizationSettingsPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Parametres</p>
        <h1>Organisation.</h1>
        <p>Configuration et acces de l'espace actif.</p>
      </section>
      <OrganizationSettingsPanel organizationSlug={organizationSlug} />
    </>
  );
}
