import type { Metadata } from "next";

import { AutomationsWorkspace } from "@/components/automations/automations-workspace";

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
      <section className="app-title">
        <p className="eyebrow">V2</p>
        <h1>Automatisation marketing.</h1>
        <p>
          Activez les rappels, generez des recommandations et suivez les
          notifications internes.
        </p>
      </section>
      <AutomationsWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
