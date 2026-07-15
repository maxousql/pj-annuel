import type { Metadata } from "next";

import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import { AppPageHeader } from "@/components/shell/app-page-header";

export const metadata: Metadata = {
  title: "Nouvelle organisation",
};

export default function NewOrganizationPage() {
  return (
    <>
      <AppPageHeader
        description="Créer un espace de travail isolé pour une équipe ou un client."
        eyebrow="Organisation"
        title="Nouvelle organisation."
      />
      <section className="settings-panel">
        <header>
          <div>
            <p className="eyebrow">Creation</p>
            <h2>Identite de l'organisation</h2>
          </div>
        </header>
        <CreateOrganizationForm />
      </section>
    </>
  );
}
