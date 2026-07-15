import Link from "next/link";
import { OrganizationsOverview } from "@/components/organizations/organizations-overview";
import { AppPageHeader } from "@/components/shell/app-page-header";

export default function AppHomePage() {
  return (
    <>
      <AppPageHeader
        actions={
          <Link className="button" href="/app/organizations/new">
            Nouvelle organisation
          </Link>
        }
        description="Accédez aux espaces de travail rattachés à votre compte et suivez les priorités de chaque équipe."
        eyebrow="Espace protégé"
        title="Choisir une organisation active."
      />
      <OrganizationsOverview />
    </>
  );
}
