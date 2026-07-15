"use client";

import { useState } from "react";
import { Compass, WandSparkles } from "lucide-react";
import dynamic from "next/dynamic";

import { IdeasWorkspace } from "@/components/ideas/ideas-workspace";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  WorkspaceTabsList,
  WorkspaceTabsTrigger,
} from "@/components/ui/workspace-tabs";

type IdeasModuleWorkspaceProps = {
  organizationSlug: string;
};

const IdeaDiscoveryWorkspace = dynamic(
  () =>
    import("@/components/ideas/idea-discovery-workspace").then(
      (module) => module.IdeaDiscoveryWorkspace,
    ),
  {
    loading: () => (
      <div
        aria-live="polite"
        className="grid min-h-[28rem] place-items-center rounded-3xl border border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-8 text-center text-sm font-medium text-[color:var(--text-muted)]"
      >
        Préparation de l’espace de découverte...
      </div>
    ),
    ssr: false,
  },
);

export function IdeasModuleWorkspace({
  organizationSlug,
}: IdeasModuleWorkspaceProps) {
  const [savedIdeasRevision, setSavedIdeasRevision] = useState(0);

  return (
    <Tabs className="gap-5" defaultValue="generate">
      <WorkspaceTabsList>
        <WorkspaceTabsTrigger value="discover">
          <Compass className="size-4 text-[color:var(--klein)]" />
          Découvrir
        </WorkspaceTabsTrigger>
        <WorkspaceTabsTrigger value="generate">
          <WandSparkles className="size-4 text-[color:var(--klein)]" />
          Créer et gérer
        </WorkspaceTabsTrigger>
      </WorkspaceTabsList>

      <TabsContent value="discover">
        <IdeaDiscoveryWorkspace
          organizationSlug={organizationSlug}
          onIdeaSaved={() => setSavedIdeasRevision((current) => current + 1)}
        />
      </TabsContent>
      <TabsContent value="generate">
        <IdeasWorkspace
          key={savedIdeasRevision}
          organizationSlug={organizationSlug}
        />
      </TabsContent>
    </Tabs>
  );
}
