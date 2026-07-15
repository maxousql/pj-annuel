import type { Metadata } from "next";

import { AiSettingsForm } from "@/components/ai-settings/ai-settings-form";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Profil IA",
};

type AiSettingsPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function AiSettingsPage({ params }: AiSettingsPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        description="Personnalisez les générations : langue, longueur, créativité, exemples et termes interdits."
        eyebrow="Intelligence artificielle"
        title="Profil IA et consignes."
      />
      <AiSettingsForm organizationSlug={organizationSlug} />
    </>
  );
}
