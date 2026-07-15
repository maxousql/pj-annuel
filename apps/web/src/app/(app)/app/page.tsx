import Link from "next/link";
import { OrganizationsOverview } from "@/components/organizations/organizations-overview";

export default function AppHomePage() {
  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Espace protégé</p>
        <h1>Choisir une organisation active.</h1>
        <p>
          Accédez aux espaces de travail rattachés à votre compte et suivez les
          priorités de chaque équipe.
        </p>
      </section>
      <div className="form-footer">
        <Link className="button" href="/app/organizations/new">
          Nouvelle organisation
        </Link>
      </div>
      <OrganizationsOverview />
    </>
  );
}
