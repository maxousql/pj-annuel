import type { Metadata } from "next";

import { EmptyState } from "@/components/shell/empty-state";

export const metadata: Metadata = {
  title: "Curation",
};

export default function CurationPage() {
  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Curation</p>
        <h1>Veille et ressources.</h1>
        <p>Ce module V2 servira a collecter et resumer les sources externes.</p>
      </section>
      <EmptyState
        title="Module bientot disponible"
        description="La curation sera implementee avec les flux RSS, URLs et resumes IA."
      />
    </>
  );
}
