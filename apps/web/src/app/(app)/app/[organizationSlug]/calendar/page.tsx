import type { Metadata } from "next";

import { EditorialCalendarWorkspace } from "@/components/calendar/editorial-calendar-workspace";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Calendrier",
};

type CalendarPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function CalendarPage({ params }: CalendarPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        description="Associez les contenus à une date, un canal et un statut pour organiser les publications à venir."
        eyebrow="Calendrier éditorial"
        title="Planification éditoriale"
      />
      <EditorialCalendarWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
