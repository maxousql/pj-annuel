import type { Metadata } from "next";

import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";

export const metadata: Metadata = {
  title: "Nouvelle organisation",
};

export default function NewOrganizationPage() {
  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Organisation</p>
        <h1>Nouvelle organisation.</h1>
        <p>Creer un espace de travail isole pour une equipe ou un client.</p>
      </section>
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
