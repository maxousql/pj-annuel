import Link from "next/link";

import { ContentLibraryWorkspace } from "@/components/library/content-library-workspace";

export const metadata = {
  title: "Bibliotheque de contenus",
};

type LibraryPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export default async function LibraryPage({ params }: LibraryPageProps) {
  const { organizationSlug } = await params;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">V1</p>
          <h1>Bibliotheque de contenus</h1>
          <p>
            Classez, filtrez et maintenez les contenus editoriaux de
            l'organisation.
          </p>
        </div>
        <div className="app-title-actions">
          <Link
            className="button-secondary"
            href={`/app/${organizationSlug}/contents`}
          >
            Vue MVP
          </Link>
          <Link
            className="button"
            href={`/app/${organizationSlug}/contents/generate`}
          >
            Generer
          </Link>
        </div>
      </section>

      <ContentLibraryWorkspace organizationSlug={organizationSlug} />
    </div>
  );
}
