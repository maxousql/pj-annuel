import Link from "next/link";

import { ContentLibraryWorkspace } from "@/components/library/content-library-workspace";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata = {
  title: "Bibliothèque de contenus",
};

type LibraryPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function LibraryPage({ params }: LibraryPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        actions={
          <Link
            className="button"
            href={`/app/${organizationSlug}/contents/generate`}
          >
            Créer un contenu
          </Link>
        }
        description="Classez, filtrez et maintenez les contenus éditoriaux de l'organisation."
        eyebrow="Bibliothèque"
        title="Bibliothèque de contenus"
      />
      <ContentLibraryWorkspace organizationSlug={organizationSlug} />
    </>
  );
}
