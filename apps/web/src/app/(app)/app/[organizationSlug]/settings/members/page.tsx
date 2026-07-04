import type { Metadata } from "next";

import { MembersList } from "@/components/organizations/members-list";

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
      <section className="app-title">
        <p className="eyebrow">Membres</p>
        <h1>{formatOrganizationName(organizationSlug)}</h1>
        <p>Roles et acces de l'organisation active.</p>
      </section>
      <section className="settings-panel">
        <header>
          <div>
            <p className="eyebrow">RBAC</p>
            <h2>Acces equipe</h2>
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
