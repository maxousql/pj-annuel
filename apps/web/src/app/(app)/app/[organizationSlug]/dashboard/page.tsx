import type { Metadata } from "next";

import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

type DashboardPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function OrganizationDashboardPage({
  params,
}: DashboardPageProps) {
  const { organizationSlug } = await params;
  const organizationName = formatOrganizationName(organizationSlug);

  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Organisation</p>
        <h1>{organizationName}</h1>
        <p>Suivez la production editoriale et les priorites de l'equipe.</p>
      </section>
      <DashboardOverview organizationSlug={organizationSlug} />
    </>
  );
}

function formatOrganizationName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
