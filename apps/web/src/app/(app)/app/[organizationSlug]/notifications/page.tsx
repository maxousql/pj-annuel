import type { Metadata } from "next";

import { NotificationsWorkspace } from "@/components/notifications/notifications-workspace";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Notifications",
};

type NotificationsPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function NotificationsPage({
  params,
}: NotificationsPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        description="Consultez les notifications générées par les automatisations de l'organisation."
        eyebrow="Notifications"
        title="Rappels et prochaines actions."
      />
      <NotificationsWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
