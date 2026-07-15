import type { Metadata } from "next";

import { HistoryDetail } from "@/components/history/history-detail";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Detail historique",
};

type HistoryDetailPageProps = {
  params: Promise<{
    itemId: string;
    itemType: string;
    organizationSlug: string;
  }>;
};

export default async function HistoryDetailPage({
  params,
}: HistoryDetailPageProps) {
  const { itemId, itemType, organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        description="Consultez le contexte sauvegardé et poursuivez le travail."
        eyebrow="Historique"
        title="Détail de l'élément."
      />
      <HistoryDetail
        itemId={itemId}
        itemType={itemType}
        organizationSlug={organizationSlug}
      />
    </>
  );
}
