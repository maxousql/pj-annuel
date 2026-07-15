import type { Metadata } from "next";

import { ContentDetail } from "@/components/contents/content-detail";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Contenu",
};

type ContentPageProps = {
  params: Promise<{
    contentId: string;
    organizationSlug: string;
  }>;
};

export default async function ContentPage({ params }: ContentPageProps) {
  const { contentId, organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        description="Consultez, ajustez et mettez à jour un contenu sauvegardé."
        eyebrow="Contenu"
        title="Édition du contenu."
      />
      <ContentDetail
        contentId={contentId}
        organizationSlug={organizationSlug}
      />
    </>
  );
}
