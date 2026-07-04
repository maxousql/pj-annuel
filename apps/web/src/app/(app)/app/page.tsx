import Link from "next/link";
import { OrganizationsOverview } from "@/components/organizations/organizations-overview";

export default function AppHomePage() {
  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Espace protege</p>
        <h1>Choisir une organisation active.</h1>
        <p>
          Accedez aux espaces de travail rattaches a votre compte et suivez les
          priorites de chaque equipe.
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
