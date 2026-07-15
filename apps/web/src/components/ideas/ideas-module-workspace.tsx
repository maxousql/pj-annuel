"use client";

import { useState } from "react";
import { Compass, WandSparkles } from "lucide-react";

import { IdeaDiscoveryWorkspace } from "@/components/ideas/idea-discovery-workspace";
import { IdeasWorkspace } from "@/components/ideas/ideas-workspace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type IdeasModuleWorkspaceProps = {
  organizationSlug: string;
};

export function IdeasModuleWorkspace({
  organizationSlug,
}: IdeasModuleWorkspaceProps) {
  const [savedIdeasRevision, setSavedIdeasRevision] = useState(0);

  return (
    <Tabs className="gap-5" defaultValue="generate">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-1.5 shadow-[0_2px_10px_rgba(23,19,15,0.04)]">
        <TabsTrigger
          className="h-11 flex-none rounded-xl px-4 text-[color:var(--text-muted)] data-active:bg-[color:var(--klein)] data-active:text-white data-active:shadow-none"
          value="discover"
        >
          <Compass className="size-4" />
          Découvrir
        </TabsTrigger>
        <TabsTrigger
          className="h-11 flex-none rounded-xl px-4 text-[color:var(--text-muted)] data-active:bg-[color:var(--klein)] data-active:text-white data-active:shadow-none"
          value="generate"
        >
          <WandSparkles className="size-4" />
          Créer et gérer
        </TabsTrigger>
      </TabsList>

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
