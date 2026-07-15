import type { Metadata } from "next";
import Link from "next/link";

import { ContentsLibrary } from "@/components/contents/contents-library";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Contenus",
};

type ContentsPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function ContentsPage({ params }: ContentsPageProps) {
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
        description="Historique, brouillons et contenus finalisés de l'organisation."
        eyebrow="Contenus"
        title="Bibliothèque de contenus."
      />
      <ContentsLibrary organizationSlug={organizationSlug} />
    </>
  );
}
