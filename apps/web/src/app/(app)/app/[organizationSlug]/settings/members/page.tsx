import type { Metadata } from "next";

import { MembersList } from "@/components/organizations/members-list";
import { AppPageHeader } from "@/components/shell/app-page-header";

type OrganizationMembersPageProps = {
  params: Promise<{
    organizationSlug: string;
  }>;
};

export const metadata: Metadata = {
  title: "Membres",
};

export default async function OrganizationMembersPage({
  params,
}: OrganizationMembersPageProps) {
  const { organizationSlug } = await params;

  return (
    <>
      <AppPageHeader
        description="Rôles et accès de l'organisation active."
        eyebrow="Membres"
        title={formatOrganizationName(organizationSlug)}
      />
      <section className="settings-panel">
        <header>
          <div>
            <p className="eyebrow">RBAC</p>
            <h2>Accès équipe</h2>
          </div>
        </header>
        <MembersList organizationSlug={organizationSlug} />
      </section>
    </>
  );
}

function formatOrganizationName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
