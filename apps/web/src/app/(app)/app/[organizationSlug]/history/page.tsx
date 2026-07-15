import type { Metadata } from "next";

import { HistoryWorkspace } from "@/components/history/history-workspace";
import { AppPageHeader } from "@/components/shell/app-page-header";

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
      <AppPageHeader
        description="Recherchez, filtrez et ouvrez les éléments éditoriaux existants."
        eyebrow="Historique"
        title="Idées et contenus sauvegardés."
      />
      <HistoryWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
