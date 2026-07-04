import { ContentLibraryDetail } from "@/components/library/content-library-detail";

export const metadata = {
  title: "Fiche contenu",
};

type LibraryDetailPageProps = {
  params: Promise<{
    contentId: string;
    organizationSlug: string;
  }>;
};

export default async function LibraryDetailPage({
  params,
}: LibraryDetailPageProps) {
  const { contentId, organizationSlug } = await params;

  return (
    <div className="page-stack">
      <ContentLibraryDetail
        contentId={contentId}
        organizationSlug={organizationSlug}
      />
    </div>
  );
}
