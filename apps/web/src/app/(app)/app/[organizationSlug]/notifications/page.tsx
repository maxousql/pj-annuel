import type { Metadata } from "next";

import { NotificationsWorkspace } from "@/components/notifications/notifications-workspace";

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
      <section className="app-title">
        <p className="eyebrow">Notifications</p>
        <h1>Rappels et prochaines actions.</h1>
        <p>
          Consultez les notifications générées par les automatisations de
          l'organisation.
        </p>
      </section>
      <NotificationsWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
