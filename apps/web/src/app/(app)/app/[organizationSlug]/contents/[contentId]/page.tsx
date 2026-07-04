import type { Metadata } from "next";

import { ContentDetail } from "@/components/contents/content-detail";

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
      <section className="app-title">
        <p className="eyebrow">Contenu</p>
        <h1>Edition du contenu.</h1>
        <p>Consultez, ajustez et mettez a jour un contenu sauvegarde.</p>
      </section>
      <ContentDetail
        contentId={contentId}
        organizationSlug={organizationSlug}
      />
    </>
  );
}
