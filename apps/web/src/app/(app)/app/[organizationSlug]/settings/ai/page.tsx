import type { Metadata } from "next";

import { AiSettingsForm } from "@/components/ai-settings/ai-settings-form";

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
      <section className="app-title">
        <p className="eyebrow">V2</p>
        <h1>Profil IA et prompts.</h1>
        <p>
          Versionnez les preferences de generation: langue, longueur,
          creativite, exemples et interdits de marque.
        </p>
      </section>
      <AiSettingsForm organizationSlug={organizationSlug} />
    </>
  );
}
