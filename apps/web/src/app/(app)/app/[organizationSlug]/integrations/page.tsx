import type { Metadata } from "next";

import { EmptyState } from "@/components/shell/empty-state";

export const metadata: Metadata = {
  title: "Integrations",
};

export default function IntegrationsPage() {
  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Integrations</p>
        <h1>Connexions externes.</h1>
        <p>
          Les integrations seront branchees par provider, en commencant par
          Notion.
        </p>
      </section>
      <EmptyState
        title="Aucune integration active"
        description="Les connexions Notion et providers externes seront configurees dans les specs dediees."
      />
    </>
  );
}
