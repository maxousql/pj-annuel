import type { Metadata } from "next";

import { HistoryWorkspace } from "@/components/history/history-workspace";

export const metadata: Metadata = {
  title: "Historique",
};

type HistoryPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Historique</p>
        <h1>Idees et contenus sauvegardes.</h1>
        <p>Recherchez, filtrez et ouvrez les elements editoriaux existants.</p>
      </section>
      <HistoryWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
