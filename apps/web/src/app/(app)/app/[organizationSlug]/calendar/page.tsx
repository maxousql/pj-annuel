import type { Metadata } from "next";

import { EditorialCalendarWorkspace } from "@/components/calendar/editorial-calendar-workspace";

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
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">V1</p>
          <h1>Planification éditoriale</h1>
          <p>
            Associez les contenus à une date, un canal et un statut pour
            organiser les publications à venir.
          </p>
        </div>
      </section>

      <EditorialCalendarWorkspace organizationSlug={organizationSlug} />
    </div>
  );
}
