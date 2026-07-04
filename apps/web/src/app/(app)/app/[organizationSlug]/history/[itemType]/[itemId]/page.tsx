import type { Metadata } from "next";

import { HistoryDetail } from "@/components/history/history-detail";

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
      <section className="app-title">
        <p className="eyebrow">Historique</p>
        <h1>Detail de l'element.</h1>
        <p>Consultez le contexte sauvegarde et poursuivez le travail.</p>
      </section>
      <HistoryDetail
        itemId={itemId}
        itemType={itemType}
        organizationSlug={organizationSlug}
      />
    </>
  );
}
