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

  return <DashboardOverview organizationSlug={organizationSlug} />;
}
